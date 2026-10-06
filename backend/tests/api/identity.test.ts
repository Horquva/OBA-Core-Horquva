// =============================================================================
// Horquva Continuity Platform — Identity Queue REST API Vitest Suite
// =============================================================================
// Tests SRS ID-02 & ID-03:
// - GET /api/identity-queue (List pending accounts with match suggestion)
// - POST /api/identity-queue/:id/resolve (Resolve with link/service_account/departed/ignore)
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { authedFetch } from '../helpers/session.js';

describe('Identity Queue REST API (SRS ID-02, ID-03)', () => {
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

  it('GET /api/identity-queue returns pending items with suggestions', async () => {
    const res = await authedFetch(`${baseUrl}/api/identity-queue`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);

    const first = body.items[0];
    expect(first.id).toBeDefined();
    expect(first.source).toBeDefined();
    expect(first.emailCandidate).toBeDefined();
  });

  it('POST /api/identity-queue/:id/resolve marks item resolved', async () => {
    const listRes = await authedFetch(`${baseUrl}/api/identity-queue`);
    const { items } = (await listRes.json()) as any;
    const target = items[0];
    expect(target).toBeDefined();

    const resolveRes = await authedFetch(`${baseUrl}/api/identity-queue/${encodeURIComponent(target.id)}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'link',
        personId: 'person:david@acme.com',
      }),
    });

    expect(resolveRes.status).toBe(200);

    // Verify removed from pending
    const afterRes = await authedFetch(`${baseUrl}/api/identity-queue`);
    const afterBody = (await afterRes.json()) as any;
    const found = afterBody.items.find((i: any) => i.id === target.id);
    expect(found).toBeUndefined();
  });
});
