// =============================================================================
// Horquva Continuity Platform — Departure Lifecycle Integration (HND-01..05)
// =============================================================================
// One departure driven end to end through the real HTTP API, real RBAC and
// real sessions, with assertions against the hand-checkable fixture:
//
//   Omar (person:omar@acme.com) leaves. He owns automation 101 (critical,
//   documented) and 102 (critical, NOT documented); neither has a backup.
//   Admin (Alex) runs the departure; Chen (reviewer) and Maya (viewer) are
//   successors. Maya declines, Chen takes both, account disabled, verified.
//
// Steps run in order and share state; each `it` is one phase of the story.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { DataService } from '../../src/services/dataService.js';
import { SimulationEngine } from '../../src/domain/simulation/index.js';
import { authedFetch } from '../helpers/session.js';

const ADMIN = 'user:admin';
const CHEN = 'user:chen'; // ↔ person:chen@acme.com
const MAYA = 'user:maya'; // ↔ person:maya@acme.com (viewer role)
const OMAR = 'person:omar@acme.com';
const A101 = 'automation:n8n:101';
const A102 = 'automation:n8n:102';

let server: http.Server;
let baseUrl: string;
let depId: string;
const handoverId: Record<string, string> = {};

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

async function call(as: string, method: string, path: string, body?: unknown) {
  const res = await authedFetch(
    `${baseUrl}${path}`,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    as
  );
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const detail = async () => (await call(ADMIN, 'GET', `/api/departures/${depId}`)).body;

describe('Departure lifecycle, end to end (HND-01..05)', () => {
  it('1. HR/admin initiates the departure and the handover pack is compiled from S1', async () => {
    const res = await call(ADMIN, 'POST', '/api/departures', { personId: OMAR, leaveDate: '2026-12-31', note: 'Leaving for a startup' });
    expect(res.status).toBe(201);
    depId = res.body.id;
    expect(res.body.handoverPack).toMatchObject({ assetsTotal: 2, orphanedOnDeparture: 2, personalCredentialAutomations: 0 });

    const pack = (await call(ADMIN, 'GET', `/api/departures/${depId}/handover-pack`)).body;
    const byId = Object.fromEntries(pack.assets.map((a: any) => [a.asset.id, a]));
    expect(byId[A101]).toMatchObject({ documented: 'yes', orphanedOnDeparture: true, criticality: 'critical' });
    expect(byId[A102]).toMatchObject({ documented: 'no', orphanedOnDeparture: true });
  });

  it('2. the detail view tells the truth: no fabricated suggestions, team or undocumented items', async () => {
    const d = await detail();
    expect(d.stage).toBe('initiated');
    expect(d.team).toBe('Platform Engineering'); // from the directory's member_of edge, not a hard-coded value
    expect(d.handover).toHaveLength(2);
    for (const h of d.handover) {
      expect(h.successor).toBeNull();
      expect(h.suggestion).toBeNull(); // no backup on record → nobody to suggest
      expect(h.currentBackup.state).toBe('none');
      handoverId[h.asset.id] = h.id;
    }
    expect(d.undocumented.map((u: any) => u.id)).toEqual([A102]); // 101 is documented
  });

  it('3. a viewer cannot run the departure; admin names successors', async () => {
    const assignments = [
      { assetId: A101, successorId: 'person:chen@acme.com' },
      { assetId: A102, successorId: 'person:maya@acme.com' },
    ];
    expect((await call(MAYA, 'PUT', `/api/departures/${depId}/successors`, { assignments })).status).toBe(403);

    const named = await call(ADMIN, 'PUT', `/api/departures/${depId}/successors`, { assignments });
    expect(named).toMatchObject({ status: 200, body: { stage: 'successor_named' } });
  });

  it('4. acceptance is requested; only each named successor can answer', async () => {
    expect((await call(ADMIN, 'POST', `/api/departures/${depId}/acceptance-requests`)).body).toMatchObject({ requested: 2 });

    // Maya is not Chen's successor-of-record for 101; the admin cannot accept for Chen either.
    expect((await call(MAYA, 'POST', `/api/handovers/${handoverId[A101]}/accept`)).status).toBe(403);
    expect((await call(ADMIN, 'POST', `/api/handovers/${handoverId[A101]}/accept`)).status).toBe(403);

    const accepted = await call(CHEN, 'POST', `/api/handovers/${handoverId[A101]}/accept`);
    expect(accepted).toMatchObject({ status: 200, body: { stage: 'successor_named' } }); // 1 of 2
  });

  it('5. Maya (viewer role) declines her handover, which re-opens naming', async () => {
    const declined = await call(MAYA, 'POST', `/api/handovers/${handoverId[A102]}/decline`, { reason: 'Over capacity this quarter' });
    expect(declined).toMatchObject({ status: 200, body: { stage: 'initiated' } });
    const d = await detail();
    expect(d.handover.find((h: any) => h.asset.id === A102).acceptance).toBe('declined');
    expect(d.stageTimestamps.successor_named).toBeUndefined();
  });

  it('6. admin re-names Chen for 102; Chen accepts; every asset is handed over', async () => {
    const renamed = await call(ADMIN, 'PUT', `/api/departures/${depId}/successors`, {
      assignments: [{ assetId: A102, successorId: 'person:chen@acme.com' }],
    });
    expect(renamed.body.stage).toBe('successor_named');
    expect((await call(ADMIN, 'POST', `/api/departures/${depId}/acceptance-requests`)).body).toMatchObject({ requested: 1 });

    const accepted = await call(CHEN, 'POST', `/api/handovers/${handoverId[A102]}/accept`);
    expect(accepted.body.stage).toBe('accepted');

    const d = await detail();
    expect(d.assetsHandedOver).toBe(2);
    expect(d.hasAlert).toBe(false);
  });

  it('7. ownership really moved: S1 for Omar now orphans nothing', () => {
    const graph = DataService.getInstance().getGraph();
    for (const asset of [A101, A102]) {
      const chenEdge = graph.getAllEdges().find((e) => e.fromId === 'person:chen@acme.com' && e.toId === asset && e.type === 'owns');
      expect(chenEdge?.grade).toBe('confirmed');
    }
    const s1 = new SimulationEngine(graph).simulateDeparture([OMAR]);
    expect(s1.orphanedCriticalAssets).toEqual([]);
  });

  it('8. verify is refused until the account is disabled, then the departure closes', async () => {
    expect((await call(ADMIN, 'POST', `/api/departures/${depId}/verify`)).status).toBe(409);
    expect((await call(ADMIN, 'POST', `/api/departures/${depId}/account-disabled`)).body.stage).toBe('account_disabled');
    expect((await call(ADMIN, 'POST', `/api/departures/${depId}/verify`)).body.stage).toBe('verified');

    const d = await detail();
    expect(d.stage).toBe('verified');
    expect(Object.keys(d.stageTimestamps).sort()).toEqual(['accepted', 'account_disabled', 'initiated', 'successor_named', 'verified']);

    // Closed: nothing more can change.
    expect((await call(ADMIN, 'PUT', `/api/departures/${depId}/successors`, {
      assignments: [{ assetId: A101, successorId: 'person:maya@acme.com' }],
    })).status).toBe(409);
  });

  it('9. an asset with a recorded backup shows that backup’s real evidence and suggests them', async () => {
    // Maya owns 103; fixture: Chen backs it up (confirmed, via attestation, since 2025-01-01).
    const created = await call(ADMIN, 'POST', '/api/departures', { personId: 'person:maya@acme.com', leaveDate: '2027-01-15', note: null });
    expect(created.status).toBe(201);
    const d = (await call(ADMIN, 'GET', `/api/departures/${created.body.id}`)).body;
    const h103 = d.handover.find((h: any) => h.asset.id === 'automation:n8n:103');
    expect(h103.currentBackup).toMatchObject({
      state: 'value',
      display: 'Chen Wei',
      grade: 'confirmed',
      source: 'attestation',
      observedAt: '2025-01-01T00:00:00.000Z',
    });
    expect(h103.suggestion).toEqual({
      person: { id: 'person:chen@acme.com', kind: 'person', name: 'Chen Wei' },
      reason: 'Existing designated backup',
    });
    expect(d.undocumented).toEqual([]); // 103 is documented
  });

  it('10. the audit trail tells the same story with the real actors (SEC-06)', () => {
    const ours = new Set([`departure:${depId}`, `handover:${handoverId[A101]}`, `handover:${handoverId[A102]}`]);
    const entries = DataService.getInstance()
      .getAuditLog()
      .filter((e) => ours.has(e.resource) || e.resource.includes(depId) || Object.values(handoverId).some((h) => e.resource.includes(h)))
      .reverse(); // oldest first

    // Reads are audited too: the admin's detail and pack views are on record.
    const reads = entries.filter((e) => e.action === 'API_GET');
    expect(reads.length).toBeGreaterThanOrEqual(5);
    expect(reads.every((e) => e.actor === 'user:admin')).toBe(true);
    expect(reads.map((e) => e.resource)).toContain(`/api/departures/${depId}/handover-pack`);

    const trail = entries.filter((e) => e.action !== 'API_GET').map((e) => `${e.actor} ${e.action}`);

    expect(trail).toEqual([
      'user:admin INITIATE_DEPARTURE',
      'user:maya ACCESS_DENIED', // step 3: viewer tried to name successors
      'user:admin ASSIGN_SUCCESSORS',
      'user:admin SEND_ACCEPTANCE_REQUESTS',
      'user:maya ACCESS_DENIED', // step 4: Maya tried Chen's handover
      'user:admin ACCESS_DENIED', // step 4: admin tried to accept for Chen
      'user:chen ACCEPT_HANDOVER',
      'user:maya DECLINE_HANDOVER',
      'user:admin ASSIGN_SUCCESSORS',
      'user:admin SEND_ACCEPTANCE_REQUESTS',
      'user:chen ACCEPT_HANDOVER',
      'user:admin API_POST', // step 8: refused verify (409) — still a recorded write attempt
      'user:admin ACCOUNT_DISABLED',
      'user:admin VERIFY_DEPARTURE',
      'user:admin API_PUT', // step 8: refused change after close
    ]);
  });
});
