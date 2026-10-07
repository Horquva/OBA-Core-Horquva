// =============================================================================
// Horquva Continuity Platform — Departures & Handovers API Vitest Suite
// =============================================================================
// Tests SRS HND-01 through HND-05:
// - Departure initiation and automated handover compilation
// - Succession planning and overload testing
// - Handover acceptance with immediate FactStore confirmed upgrade (HND-04)
// - Handover decline with reason tracking
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { authedFetch } from '../helpers/session.js';
import { DataService } from '../../src/services/dataService.js';

describe('Departures & Handovers REST API (SRS HND-01..05)', () => {
  let server: http.Server;
  let baseUrl: string;
  let omarDepartureId: string;
  let davidDepartureId: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET /api/departures returns array of departure summaries', async () => {
    const res = await authedFetch(`${baseUrl}/api/departures`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Array.isArray(body.departures)).toBe(true);
    expect(body.departures.length).toBeGreaterThan(0);

    const first = body.departures[0];
    expect(first.id).toBeDefined();
    expect(first.person.id).toBeDefined();
    expect(first.person.name).toBeDefined();
    expect(first.stage).toBeDefined();
    expect(typeof first.assetsTotal).toBe('number');
  });

  it('POST /api/departures initiates departure and compiles handover pack', async () => {
    const res = await authedFetch(`${baseUrl}/api/departures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personId: 'person:omar@acme.com',
        leaveDate: '2026-11-01T00:00:00Z',
        note: 'Planned transition to new company.',
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.id).toBeDefined();
    expect(body.handoverPack).toMatchObject({ assetsTotal: 2, orphanedOnDeparture: 2 });
    omarDepartureId = body.id;

    // Verify detail
    const detailRes = await authedFetch(`${baseUrl}/api/departures/${body.id}`);
    expect(detailRes.status).toBe(200);
    const detail = (await detailRes.json()) as any;
    expect(detail.id).toBe(body.id);
    expect(detail.person.id).toBe('person:omar@acme.com');
    // Omar owns 101 and 102
    expect(detail.handover.length).toBe(2);
    expect(detail.stage).toBe('initiated');
    expect(detail.stageTimestamps.initiated).toBeDefined();
  });

  it('POST /api/departures/:id/succession-test calculates succession feasibility and concentration', async () => {
    // Reuse Omar's departure: a person can only have one open departure.
    const depId = omarDepartureId;

    const testRes = await authedFetch(`${baseUrl}/api/departures/${depId}/succession-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignments: [
          { assetId: 'automation:n8n:101', successorId: 'person:chen@acme.com' },
          { assetId: 'automation:n8n:102', successorId: 'person:chen@acme.com' },
        ],
      }),
    });

    expect(testRes.status).toBe(200);
    const planResult = (await testRes.json()) as any;
    expect(planResult.loads).toBeDefined();
    expect(Array.isArray(planResult.loads)).toBe(true);
    expect(planResult.loads.length).toBeGreaterThan(0);
    const chenLoad = planResult.loads.find((l: any) => l.successor.id === 'person:chen@acme.com');
    expect(chenLoad).toBeDefined();
    expect(chenLoad.totalCriticalAssetsOwned).toBeGreaterThanOrEqual(2);
  });

  it('PUT /api/departures/:id/successors updates successor assignments and stage', async () => {
    const initRes = await authedFetch(`${baseUrl}/api/departures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personId: 'person:david@acme.com',
        leaveDate: '2026-12-15T00:00:00Z',
        note: 'Updating successors.',
      }),
    });
    expect(initRes.status).toBe(201);
    const { id: depId } = (await initRes.json()) as any;

    const putRes = await authedFetch(`${baseUrl}/api/departures/${depId}/successors`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignments: [
          { assetId: 'automation:n8n:105', successorId: 'person:priya@acme.com' },
        ],
      }),
    });

    expect(putRes.status).toBe(200);

    const getRes = await authedFetch(`${baseUrl}/api/departures/${depId}`);
    const detail = (await getRes.json()) as any;
    expect(detail.stage).toBe('successor_named');
    expect(detail.handover[0].successor.id).toBe('person:priya@acme.com');
    davidDepartureId = depId;
  });

  it('POST /api/handovers/:id/accept immediately updates edge and creates confirmed fact (HND-04)', async () => {
    const initRes = await authedFetch(`${baseUrl}/api/departures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personId: 'person:maya@acme.com',
        leaveDate: '2026-12-31T00:00:00Z',
        note: 'Handover accept test.',
      }),
    });
    expect(initRes.status).toBe(201);
    const { id: depId } = (await initRes.json()) as any;

    // Assign Chen as successor for Maya's asset (103)
    await authedFetch(`${baseUrl}/api/departures/${depId}/successors`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignments: [{ assetId: 'automation:n8n:103', successorId: 'person:chen@acme.com' }],
      }),
    });

    const getRes = await authedFetch(`${baseUrl}/api/departures/${depId}`);
    const detail = (await getRes.json()) as any;
    const handoverId = detail.handover[0].id;

    // Not requested yet → 409; admin is not the successor → 403 once requested.
    const accept = (as: string) =>
      authedFetch(`${baseUrl}/api/handovers/${handoverId}/accept`, { method: 'POST' }, as);
    expect((await accept('user:chen')).status).toBe(409);
    await authedFetch(`${baseUrl}/api/departures/${depId}/acceptance-requests`, { method: 'POST' });
    expect((await accept('user:admin')).status).toBe(403);

    // Chen (user:chen ↔ person:chen@acme.com) accepts his own handover.
    const acceptRes = await accept('user:chen');
    expect(acceptRes.status).toBe(200);

    // Verify graph has confirmed owns edge for Chen -> 103
    const graph = DataService.getInstance().getGraph();
    const owners103 = graph.getOwners('automation:n8n:103');
    const ownerIds = owners103.map((o) => o.id);
    expect(ownerIds).toContain('person:chen@acme.com');

    // Verify departure stage advanced to accepted
    const afterRes = await authedFetch(`${baseUrl}/api/departures/${depId}`);
    const afterDetail = (await afterRes.json()) as any;
    expect(afterDetail.stage).toBe('accepted');
    expect(afterDetail.handover[0].acceptance).toBe('accepted');
  });

  it('POST /api/departures maps validation failures to 404 / 400 / 409', async () => {
    const post = (body: unknown) =>
      authedFetch(`${baseUrl}/api/departures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    expect((await post({ personId: 'person:nobody@acme.com', leaveDate: '2026-12-31' })).status).toBe(404);
    expect((await post({ personId: 'person:elena@acme.com', leaveDate: 'not-a-date' })).status).toBe(400);
    expect((await post({ personId: 'person:sarah@acme.com', leaveDate: '2026-12-31' })).status).toBe(409); // seeded open departure
  });

  it('GET /api/departures/:id/handover-pack returns the compiled HND-02 manifest', async () => {
    // Omar's departure from the first test: owns 101 + 102, neither backed up.
    const packRes = await authedFetch(`${baseUrl}/api/departures/${omarDepartureId}/handover-pack`);
    expect(packRes.status).toBe(200);
    const pack = (await packRes.json()) as any;
    expect(pack.departureId).toBe(omarDepartureId);
    expect(pack.summary).toMatchObject({ assetsTotal: 2, orphanedOnDeparture: 2 });
    expect(pack.assets.map((a: any) => a.asset.id).sort()).toEqual(['automation:n8n:101', 'automation:n8n:102']);

    // Seeded departures predate packs.
    expect((await authedFetch(`${baseUrl}/api/departures/dep_sarah_001/handover-pack`)).status).toBe(404);
  });

  it('POST /api/handovers/:id/decline records decline reason and updates status', async () => {
    // David's departure (105 → Priya). Priya has no OBA account, so re-name Chen, who does.
    const depId = davidDepartureId;
    const json = { 'Content-Type': 'application/json' };
    await authedFetch(`${baseUrl}/api/departures/${depId}/successors`, {
      method: 'PUT',
      headers: json,
      body: JSON.stringify({ assignments: [{ assetId: 'automation:n8n:105', successorId: 'person:chen@acme.com' }] }),
    });
    await authedFetch(`${baseUrl}/api/departures/${depId}/acceptance-requests`, { method: 'POST' });
    const detail = (await (await authedFetch(`${baseUrl}/api/departures/${depId}`)).json()) as any;
    const handoverId = detail.handover[0].id;

    const declineRes = await authedFetch(
      `${baseUrl}/api/handovers/${handoverId}/decline`,
      { method: 'POST', headers: json, body: JSON.stringify({ reason: 'Insufficient capacity in Q4.' }) },
      'user:chen'
    );
    expect(declineRes.status).toBe(200);

    const checkRes = await authedFetch(`${baseUrl}/api/departures/${depId}`);
    const checkDetail = (await checkRes.json()) as any;
    expect(checkDetail.handover[0].acceptance).toBe('declined');
    // A decline re-opens naming: the departure drops back to 'initiated'.
    expect(checkDetail.stage).toBe('initiated');
  });

  it('POST /api/handovers/:id/reassign is HR/admin only, needs a reason, and audits the signed-in user', async () => {
    const json = { 'Content-Type': 'application/json' };
    const detail = (await (await authedFetch(`${baseUrl}/api/departures/${davidDepartureId}`)).json()) as any;
    const handoverId = detail.handover[0].id; // declined by Chen in the previous test
    const url = `${baseUrl}/api/handovers/${handoverId}/reassign`;
    const body = JSON.stringify({ successorId: 'person:elena@acme.com', reason: 'Chen has no capacity' });

    expect((await authedFetch(url, { method: 'POST', headers: json, body }, 'user:chen')).status).toBe(403); // reviewer
    expect((await authedFetch(url, { method: 'POST', headers: json, body: JSON.stringify({ successorId: 'person:elena@acme.com' }) })).status).toBe(400);

    const res = await authedFetch(url, { method: 'POST', headers: json, body });
    expect(res.status).toBe(200);
    const after = (await (await authedFetch(`${baseUrl}/api/departures/${davidDepartureId}`)).json()) as any;
    expect(after.handover[0]).toMatchObject({ successor: { id: 'person:elena@acme.com' }, acceptance: 'requested' });
    expect(DataService.getInstance().getAuditLog().find((e) => e.action === 'REASSIGN_SUCCESSOR')).toMatchObject({ actor: 'user:admin' });
  });

  it('POST /api/departures/:id/verify-executions runs post-departure verification daemon (HND-06)', async () => {
    const res = await authedFetch(`${baseUrl}/api/departures/${davidDepartureId}/verify-executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ windowHours: 72 }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    expect(data.departureId).toBe(davidDepartureId);
    expect(Array.isArray(data.monitoredAutomations)).toBe(true);
  });

  it('POST /api/departures/:id/verify-executions ignores caller-supplied window/clock and 404s unknown ids', async () => {
    const post = (id: string, body: object) =>
      authedFetch(`${baseUrl}/api/departures/${id}/verify-executions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    const res = await post(davidDepartureId, { windowHours: 0, now: '2099-01-01T00:00:00.000Z' });
    const data = (await res.json()) as any;
    expect(data.windowCompleted).toBe(false);
    expect(data.autoVerified).toBe(false);
    expect((await post('dep_does_not_exist', {})).status).toBe(404);
  });
});
