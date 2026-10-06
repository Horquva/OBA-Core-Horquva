// =============================================================================
// Horquva Continuity Platform — Change Feed REST API Vitest Suite
// =============================================================================
// Tests SRS CHG-01 & CHG-02:
// - GET /api/changes?acknowledged=false
// - POST /api/changes/:id/ack (Single acknowledgement)
// - POST /api/changes/ack-all (Bulk acknowledgement)
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { authedFetch } from '../helpers/session.js';

describe('Change Feed REST API (SRS CHG-01, CHG-02)', () => {
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

  it('GET /api/changes returns unacknowledged change events', async () => {
    const res = await authedFetch(`${baseUrl}/api/changes?acknowledged=false`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events.length).toBeGreaterThan(0);

    const first = body.events[0];
    expect(first.id).toBeDefined();
    expect(first.kind).toBeDefined();
    expect(first.title).toBeDefined();
    expect(first.impact).toBeDefined();
    expect(first.detectedAt).toBeDefined();
  });

  it('POST /api/changes/:id/ack acknowledges a specific event', async () => {
    const initRes = await authedFetch(`${baseUrl}/api/changes?acknowledged=false`);
    const { events } = (await initRes.json()) as any;
    const target = events[0];
    expect(target).toBeDefined();

    const ackRes = await authedFetch(`${baseUrl}/api/changes/${encodeURIComponent(target.id)}/ack`, {
      method: 'POST',
    });
    expect(ackRes.status).toBe(200);

    // Verify it is removed from unacknowledged list
    const afterRes = await authedFetch(`${baseUrl}/api/changes?acknowledged=false`);
    const afterEvents = (await afterRes.json()) as any;
    const found = afterEvents.events.find((e: any) => e.id === target.id);
    expect(found).toBeUndefined();
  });

  it('POST /api/changes/ack-all acknowledges all pending events', async () => {
    const ackAllRes = await authedFetch(`${baseUrl}/api/changes/ack-all`, {
      method: 'POST',
    });
    expect(ackAllRes.status).toBe(200);

    const checkRes = await authedFetch(`${baseUrl}/api/changes?acknowledged=false`);
    const checkBody = (await checkRes.json()) as any;
    expect(checkBody.events.length).toBe(0);
  });

  it('acknowledging an unknown change is a 404, not a silent success', async () => {
    const res = await authedFetch(`${baseUrl}/api/changes/chg_nope/ack`, { method: 'POST' });
    expect(res.status).toBe(404);
  });

  it('acknowledgements are credited to the signed-in user', async () => {
    const { DataService } = await import('../../src/services/dataService.js');
    const all = DataService.getInstance().getChangeEvents();
    expect(all.every((c) => !c.acknowledged || c.acknowledgedBy === 'Alex Rivera')).toBe(true);
    // Seeded events carry their fixture dates, not "server start minus a day".
    expect(all.map((c) => c.detectedAt)).toEqual(expect.arrayContaining(['2025-01-15T00:00:00.000Z']));
  });

  it('GET /api/freshness reports the newest data per source and never claims a sync count', async () => {
    const body = (await (await authedFetch(`${baseUrl}/api/freshness`)).json()) as any;
    expect(body.syncStatus).toBe('not_tracked');
    expect(body.sources.map((s: any) => s.source)).toEqual(expect.arrayContaining(['entra', 'n8n']));
    expect(body.latestDataAt).toBe(body.sources.map((s: any) => s.latestAt).filter(Boolean).sort().at(-1));
  });
});
