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
    const res = await fetch(`${baseUrl}/api/changes?acknowledged=false`);
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
    const initRes = await fetch(`${baseUrl}/api/changes?acknowledged=false`);
    const { events } = (await initRes.json()) as any;
    const target = events[0];
    expect(target).toBeDefined();

    const ackRes = await fetch(`${baseUrl}/api/changes/${encodeURIComponent(target.id)}/ack`, {
      method: 'POST',
    });
    expect(ackRes.status).toBe(200);

    // Verify it is removed from unacknowledged list
    const afterRes = await fetch(`${baseUrl}/api/changes?acknowledged=false`);
    const afterEvents = (await afterRes.json()) as any;
    const found = afterEvents.events.find((e: any) => e.id === target.id);
    expect(found).toBeUndefined();
  });

  it('POST /api/changes/ack-all acknowledges all pending events', async () => {
    const ackAllRes = await fetch(`${baseUrl}/api/changes/ack-all`, {
      method: 'POST',
    });
    expect(ackAllRes.status).toBe(200);

    const checkRes = await fetch(`${baseUrl}/api/changes?acknowledged=false`);
    const checkBody = (await checkRes.json()) as any;
    expect(checkBody.events.length).toBe(0);
  });
});
