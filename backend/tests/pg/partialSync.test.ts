// =============================================================================
// Partial-failure safety (B1): a core module that fails mid-sync makes the run
// partial, so nothing the connection asserted earlier is closed; an optional
// enrichment that fails is only a warning.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { query } from '../../src/db/client.js';
import { EntraConnector } from '../../src/connectors/entra/index.js';
import { ReadOnlyHttpGuard, GuardRequestOptions } from '../../src/connectors/sdk/guard.js';
import { resetDatabase } from './db.js';

const CONNECTION_ID = 'conn_entra_partial';

let fakeGraph: http.Server;
let graphUrl: string;
/** 'listed' = one app owned by Omar, 'none' = an empty list, a number = that HTTP error. */
let applications: 'listed' | 'none' | number = 'listed';

/** The guard's 5xx backoff would make a 500 take ~11 s; one attempt is enough here. */
class SingleAttemptGuard extends ReadOnlyHttpGuard {
  public override get<T = any>(url: string, options: GuardRequestOptions = {}) {
    return super.get<T>(url, { ...options, maxRetries: 0 });
  }
}

function startFakeGraph(): Promise<void> {
  fakeGraph = http.createServer((req, res) => {
    const url = new URL(req.url!, 'http://x');
    const send = (status: number, body: unknown) => res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    if (url.pathname === '/users') {
      return send(200, { value: [{ id: 'u-omar', displayName: 'Omar Farooq', mail: 'omar@acme.com', accountEnabled: true }] });
    }
    if (url.pathname === '/applications') {
      if (typeof applications === 'number') return send(applications, { error: { code: 'InternalServerError', message: 'boom' } });
      return send(200, { value: applications === 'listed' ? [{ id: 'obj-1', appId: 'app-1', displayName: 'Payroll Sync' }] : [] });
    }
    if (url.pathname === '/applications/obj-1/owners') {
      return send(200, { value: [{ id: 'u-omar', mail: 'omar@acme.com' }] });
    }
    res.writeHead(404).end();
  });
  return new Promise((r) => fakeGraph.listen(0, () => {
    graphUrl = `http://localhost:${(fakeGraph.address() as any).port}`;
    r();
  }));
}

function connector(): EntraConnector {
  const c = new EntraConnector(CONNECTION_ID, 'Entra', { tenantId: 't', clientId: 'c', clientSecret: 's', graphBaseUrl: graphUrl });
  // No real token endpoint in tests: pre-seed the cached token, and let the guard reach the fake.
  Object.assign(c as any, { cachedAccessToken: 'test-token', tokenExpiresAt: Date.now() + 3_600_000, guard: new SingleAttemptGuard(['localhost']) });
  return c;
}

async function syncOnce(): Promise<any> {
  const run = await query(`INSERT INTO sync_run (connection_id, status) VALUES ($1, 'running') RETURNING id`, [CONNECTION_ID]);
  const c = connector();
  return c.persistSync(await c.sync(), run.rows[0].id);
}

const activeOwnerEdges = async () =>
  (await query(`SELECT 1 FROM edge WHERE from_id = 'person:omar@acme.com' AND to_id = 'app:entra:app-1' AND type = 'owns' AND valid_to IS NULL`)).rowCount;

beforeAll(async () => {
  await resetDatabase();
  await query(`INSERT INTO connection (id, type, name) VALUES ($1, 'entra', 'Entra')`, [CONNECTION_ID]);
  await startFakeGraph();
});

afterAll(() => new Promise<void>((r) => fakeGraph.close(() => r())));

describe('partial-failure safety (Postgres)', () => {
  it('keeps existing Entra owner edges active when /applications fails', async () => {
    applications = 'listed';
    const first = await syncOnce();
    expect(first.errors).toBe(0);
    expect(first.errorReasons).toEqual([]);
    expect(await activeOwnerEdges()).toBe(1);

    applications = 500;
    const second = await syncOnce();
    expect(second.errors).toBe(1);
    expect(second.errorReasons[0]).toMatch(/^applications: HTTP Error 500/);
    expect(second.vanishedCheckSkipped).toBe(true);
    expect(second.edgesClosed).toBe(0);
    expect(await activeOwnerEdges()).toBe(1);
  });

  it('still closes an owner edge once a complete sync no longer reports it', async () => {
    applications = 'listed';
    await syncOnce();
    expect(await activeOwnerEdges()).toBe(1);

    applications = 'none';
    const res = await syncOnce();
    expect(res.errors).toBe(0);
    expect(res.vanishedCheckSkipped).toBe(false);
    expect(await activeOwnerEdges()).toBe(0);
  });
});
