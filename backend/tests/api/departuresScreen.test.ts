// =============================================================================
// Horquva Continuity Platform — Departures screen wiring (Sprint 2 D8, UI-02)
// =============================================================================
// What the Departures UI needs from the API: a people list for its pickers,
// list grouping that follows the lifecycle, and no fabricated watch log.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
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

async function call(method: string, path: string, body?: unknown, as = 'user:admin') {
  const res = await authedFetch(
    `${baseUrl}${path}`,
    { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) },
    as
  );
  return { status: res.status, body: (await res.json()) as any };
}

const groupOf = async (id: string) =>
  (await call('GET', '/api/departures')).body.departures.find((d: any) => d.id === id)?.group;

describe('Departures screen API (UI-02)', () => {
  it('lists people for the pickers without Postgres, sorted, with emails', async () => {
    const { status, body } = await call('GET', '/api/continuity/inventory?kind=person');
    expect(status).toBe(200);
    expect(body.entities).toHaveLength(10);
    expect(body.entities.every((e: any) => e.kind === 'person')).toBe(true);
    expect(body.entities[0].name).toBe('Aisha Diallo');
    expect(body.entities.find((e: any) => e.id === 'person:chen@acme.com').external_refs.email).toBe('chen@acme.com');
  });

  it('groups by lifecycle: upcoming → in_handover (successor named) → departed (account disabled)', async () => {
    const created = await call('POST', '/api/departures', { personId: 'person:omar@acme.com', leaveDate: '2027-03-01', note: null });
    const id = created.body.id;
    expect(await groupOf(id)).toBe('upcoming');

    await call('PUT', `/api/departures/${id}/successors`, {
      assignments: [{ assetId: 'automation:n8n:101', successorId: 'person:chen@acme.com' }],
    });
    expect(await groupOf(id)).toBe('in_handover'); // even though not every asset has a successor yet

    await call('POST', `/api/departures/${id}/account-disabled`);
    expect(await groupOf(id)).toBe('departed'); // leave date is still in the future
  });

  it('a departure with a past leave date is departed', async () => {
    expect(await groupOf('dep_sarah_001')).toBe('departed');
  });

  it('does not invent post-departure watch events (HND-06 verifier not built yet)', async () => {
    expect((await call('GET', '/api/departures/dep_sarah_001')).body.watchLog).toEqual([]);
  });
});
