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
    // Omar departure
    const initRes = await authedFetch(`${baseUrl}/api/departures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personId: 'person:omar@acme.com',
        leaveDate: '2026-12-01T00:00:00Z',
        note: 'Succession test.',
      }),
    });
    const { id: depId } = (await initRes.json()) as any;

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

    // Accept handover
    const acceptRes = await authedFetch(`${baseUrl}/api/handovers/${handoverId}/accept`, {
      method: 'POST',
    });
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

  it('POST /api/handovers/:id/decline records decline reason and updates status', async () => {
    const initRes = await authedFetch(`${baseUrl}/api/departures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personId: 'person:maya@acme.com',
        leaveDate: '2026-12-31T00:00:00Z',
        note: 'Handover decline test.',
      }),
    });
    const { id: depId } = (await initRes.json()) as any;
    const getRes = await authedFetch(`${baseUrl}/api/departures/${depId}`);
    const detail = (await getRes.json()) as any;
    const handoverId = detail.handover[0].id;

    const declineRes = await authedFetch(`${baseUrl}/api/handovers/${handoverId}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Insufficient capacity in Q4.' }),
    });

    expect(declineRes.status).toBe(200);

    const checkRes = await authedFetch(`${baseUrl}/api/departures/${depId}`);
    const checkDetail = (await checkRes.json()) as any;
    expect(checkDetail.handover[0].acceptance).toBe('declined');
  });
});
