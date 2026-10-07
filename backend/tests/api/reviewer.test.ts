// =============================================================================
// Reviewer queue — GET /api/me/tasks (B-16, HND-04), Sprint 3 D14
// =============================================================================
// Hand-checked against tests/fixtures/handCheckableTruth.json:
//   105 AI Ticket Routing is owned by David and runs on David's personal credentials.
//   101 Billing Sync / 102 Payroll are owned by Omar (user:reviewer).
// The queue is per person: only your own links and the handovers you were asked to accept.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { DataService } from '../../src/services/dataService.js';
import { nameSuccessors, requestAcceptance } from '../../src/handover/successionService.js';
import { authedFetch } from '../helpers/session.js';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${(server.address() as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const tasksAs = async (user: string) => {
  const res = await authedFetch(`${baseUrl}/api/me/tasks`, undefined, user);
  return { status: res.status, body: (await res.json()) as any };
};
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

describe('Reviewer queue (GET /api/me/tasks)', () => {
  let davidDepartureId: string;

  it('requires a session', async () => {
    expect((await fetch(`${baseUrl}/api/me/tasks`)).status).toBe(401);
  });

  it('starts empty: no invented campaigns, no handovers nobody was asked to accept', async () => {
    for (const user of ['user:admin', 'user:chen', 'user:reviewer']) {
      expect((await tasksAs(user)).body).toEqual({ confirmations: [], handovers: [] });
    }
  });

  it("shows a requested handover only to the named successor, with the asset's real facts", async () => {
    const ds = DataService.getInstance();
    const dep = ds.createDeparture({ personId: 'person:david@acme.com', leaveDate: inDays(10), note: 'D14 test' });
    davidDepartureId = dep.id;
    nameSuccessors(ds, dep.id, dep.handovers.map((h) => ({ assetId: h.assetId, successorId: 'person:chen@acme.com' })));

    // Named but not yet asked: nothing to answer.
    expect((await tasksAs('user:chen')).body.handovers).toEqual([]);

    requestAcceptance(ds, dep.id);
    const chen = (await tasksAs('user:chen')).body;
    expect(chen.handovers).toHaveLength(1);
    const card = chen.handovers[0];
    expect(card).toMatchObject({ departureId: dep.id, from: { id: 'person:david@acme.com', name: 'David Miller' } });

    const row = card.assets.find((a: any) => a.asset.id === 'automation:n8n:105');
    const fact = ds.getGraph().getNode('automation:n8n:105')!.facts.get('criticality');
    expect(row.handoverId).toBe(dep.handovers.find((h) => h.assetId === 'automation:n8n:105')!.id);
    expect(row.criticality).toBe(fact ? fact.value : 'unknown');
    expect(row.runbookUrl).toBeNull(); // no runbook link recorded in the fixture
    expect(row.credentialNote).toMatch(/David Miller's personal credentials/);

    // Nobody else sees Chen's request.
    expect((await tasksAs('user:admin')).body.handovers).toEqual([]);
    expect((await tasksAs('user:maya')).body.handovers).toEqual([]);
  });

  it('accepting one asset removes only that row; declining removes the other', async () => {
    const ds = DataService.getInstance();
    const dep = ds.getDeparture(davidDepartureId)!;
    const [first] = dep.handovers;

    expect((await authedFetch(`${baseUrl}/api/handovers/${first.id}/accept`, json('POST'), 'user:chen')).status).toBe(200);
    const after = (await tasksAs('user:chen')).body.handovers.flatMap((c: any) => c.assets.map((a: any) => a.handoverId));
    expect(after).not.toContain(first.id);
    expect(after).toHaveLength(dep.handovers.length - 1);

    // Someone else can't answer Chen's request.
    for (const rest of dep.handovers.slice(1)) {
      expect((await authedFetch(`${baseUrl}/api/handovers/${rest.id}/accept`, json('POST'), 'user:reviewer')).status).toBe(403);
      expect(
        (await authedFetch(`${baseUrl}/api/handovers/${rest.id}/decline`, json('POST', { reason: 'No AWS access' }), 'user:chen')).status
      ).toBe(200);
    }
    expect((await tasksAs('user:chen')).body.handovers).toEqual([]);

    // HR sees why it was declined (HND-05).
    const detail = (await (await authedFetch(`${baseUrl}/api/departures/${dep.id}`)).json()) as any;
    for (const row of detail.handover.filter((r: any) => r.id !== first.id)) {
      expect(row).toMatchObject({ acceptance: 'declined', declineReason: 'No AWS access' });
    }

    // The accepted asset now shows the successor as owner, confirmed — not the leaver's older stated edge.
    const assets = (await (await authedFetch(`${baseUrl}/api/assets`)).json()) as any;
    const accepted = assets.assets.find((a: any) => a.id === first.assetId);
    expect(accepted.owner).toMatchObject({ grade: 'confirmed', ref: { id: 'person:chen@acme.com' } });
  });

  it("lists the person's own open confirmation link from a real campaign, until it is answered", async () => {
    const admin = (path: string, init: RequestInit) => authedFetch(`${baseUrl}${path}`, init, 'user:admin');
    const preview = await (
      await admin('/api/attestation/campaigns/preview', json('POST', { scope: { kind: 'selected', assetIds: ['automation:n8n:101', 'automation:n8n:102'] } }))
    ).json() as any;
    const created = await admin(
      '/api/attestation/campaigns',
      json('POST', { name: 'Q4 check', dueDate: inDays(14), introLine: null, sendAt: null, tasks: preview.tasks })
    );
    expect(created.status).toBe(201);

    const omar = (await tasksAs('user:reviewer')).body;
    expect(omar.confirmations).toHaveLength(1);
    expect(omar.confirmations[0]).toMatchObject({ campaignName: 'Q4 check', assetCount: 2 });
    expect(omar.confirmations[0].token).toMatch(/^[0-9a-f]{64}$/);

    // Only Omar owns these, so only Omar gets the link.
    expect((await tasksAs('user:chen')).body.confirmations).toEqual([]);

    // Answer one asset through the link: the count drops to what's left.
    const session = (await (await fetch(`${baseUrl}/api/attest/${omar.confirmations[0].token}`)).json()) as any;
    const task = session.assets[0];
    const answered = await fetch(
      `${baseUrl}/api/attest/${omar.confirmations[0].token}/tasks/${task.taskId}`,
      json('PUT', { isOwner: false, ownerPersonId: null })
    );
    expect(answered.status).toBe(200);
    expect((await tasksAs('user:reviewer')).body.confirmations[0].assetCount).toBe(1);
  });
});
