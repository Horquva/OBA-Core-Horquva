// =============================================================================
// Connector ingestion end-to-end against Postgres: encrypted configs, 202 sync,
// sync_run bookkeeping, CSV import, vanished-row closing, grade protection.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { DataService } from '../../src/services/dataService.js';
import { ConnectorRunner, CSV_CONNECTION_ID } from '../../src/connectors/sdk/runner.js';
import { query } from '../../src/db/client.js';
import { authedFetch } from '../helpers/session.js';
import { resetDatabase, startServer, json } from './db.js';

let server: http.Server;
let baseUrl: string;
let fakeN8n: http.Server;
let n8nUrl: string;
let n8nDelayMs = 0;
let n8nFail = false;
let workflows: Array<{ id: string; name: string; active: boolean; ownerEmail: string }> = [];

const API_KEY = 'n8n_api_key_DO_NOT_LEAK_7f3a';

function startFakeN8n(): Promise<void> {
  fakeN8n = http.createServer(async (req, res) => {
    await new Promise((r) => setTimeout(r, n8nDelayMs));
    if (req.headers['x-n8n-api-key'] !== API_KEY) {
      res.writeHead(401).end();
      return;
    }
    if (n8nFail) {
      res.writeHead(500, { 'content-type': 'application/json' }).end('{"message":"boom"}');
      return;
    }
    const url = new URL(req.url!, 'http://x');
    const send = (body: unknown) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    if (url.pathname === '/api/v1/users') return send({ data: [{ id: 'u1', email: 'omar@acme.com', firstName: 'Omar' }, { id: 'u2', email: 'nadia@uni.edu', firstName: 'Nadia' }] });
    if (url.pathname === '/api/v1/credentials') return send({ data: [] });
    if (url.pathname === '/api/v1/workflows') return send({ data: workflows.map((w) => ({ id: w.id, name: w.name, active: w.active })) });
    const m = url.pathname.match(/^\/api\/v1\/workflows\/(.+)$/);
    if (m) {
      const w = workflows.find((x) => x.id === m[1])!;
      return send({ id: w.id, name: w.name, active: w.active, ownedBy: { email: w.ownerEmail }, nodes: [] });
    }
    res.writeHead(404).end();
  });
  return new Promise((r) => fakeN8n.listen(0, () => {
    n8nUrl = `http://localhost:${(fakeN8n.address() as any).port}`;
    r();
  }));
}

async function waitForSync(connectionId: string): Promise<any> {
  for (let i = 0; i < 400; i++) { // up to 20 s: the HTTP guard retries 5xx with backoff
    const { connections } = (await (await authedFetch(`${baseUrl}/api/connections`)).json()) as any;
    const c = connections.find((x: any) => x.id === connectionId);
    if (c.status !== 'syncing') return c;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('sync did not finish');
}

beforeAll(async () => {
  await resetDatabase();
  await DataService.initialize({ ...process.env, DEMO_MODE: 'true' });
  ({ server, baseUrl } = await startServer());
  await startFakeN8n();
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await new Promise<void>((r) => fakeN8n.close(() => r()));
});

describe('connections API + ConnectorRunner (Postgres)', () => {
  let n8nId: string;

  it('validates configs and stores secrets only as AES-GCM ciphertext', async () => {
    expect((await authedFetch(`${baseUrl}/api/connections`, json('POST', { type: 'n8n', name: 'n8n', config: { baseUrl: 'not a url' } }))).status).toBe(400);

    const res = await authedFetch(`${baseUrl}/api/connections`, json('POST', { type: 'n8n', name: 'Production n8n', config: { baseUrl: n8nUrl, apiKey: API_KEY } }));
    expect(res.status).toBe(201);
    n8nId = ((await res.json()) as any).id;

    const row = (await query(`SELECT config_encrypted::text AS c FROM connection WHERE id = $1`, [n8nId])).rows[0];
    expect(row.c).not.toContain(API_KEY);
    expect(row.c).not.toContain(n8nUrl);
    expect(JSON.parse(row.c)).toMatchObject({ v: 1 });

    const list = await (await authedFetch(`${baseUrl}/api/connections`)).text();
    expect(list).not.toContain(API_KEY);
  });

  it('tests saved and unsaved credentials', async () => {
    expect(await (await authedFetch(`${baseUrl}/api/connections/${n8nId}/test`, json('POST'))).json()).toEqual({ ok: true, error: null });
    const bad = (await (await authedFetch(`${baseUrl}/api/connections/test`, json('POST', { type: 'n8n', config: { baseUrl: n8nUrl, apiKey: 'wrong' } }))).json()) as any;
    expect(bad.ok).toBe(false);
  });

  it('POST /:id/sync returns 202, refuses a second concurrent sync, then completes and refreshes the graph', async () => {
    workflows = [
      { id: 'w1', name: 'Grant intake', active: true, ownerEmail: 'nadia@uni.edu' },
      { id: 'w2', name: 'Payroll export', active: true, ownerEmail: 'omar@acme.com' },
    ];
    n8nDelayMs = 150;
    const res = await authedFetch(`${baseUrl}/api/connections/${n8nId}/sync`, json('POST'));
    expect(res.status).toBe(202);
    const { syncRunId } = (await res.json()) as any;
    expect((await authedFetch(`${baseUrl}/api/connections/${n8nId}/sync`, json('POST'))).status).toBe(409);

    const done = await waitForSync(n8nId);
    n8nDelayMs = 0;
    expect(done.status).toBe('connected');
    expect(done.lastRun.status).toBe('completed');
    const run = (await query(`SELECT status, stats FROM sync_run WHERE id = $1`, [syncRunId])).rows[0];
    expect(run.status).toBe('completed');
    expect(run.stats.edgesCreated).toBe(2);

    const graph = DataService.getInstance().getGraph();
    expect(graph.getNode('automation:n8n:w1')?.entity.name).toBe('Grant intake');
    expect(graph.getOwners('automation:n8n:w1').map((p) => p.id)).toEqual(['person:nadia@uni.edu']);
  });

  it('closes an owner the source no longer reports, but never an attested edge', async () => {
    // Someone confirms through attestation that Omar owns w1 too (not from this connection).
    DataService.getInstance().getGraph().addEdge({ fromId: 'person:omar@acme.com', toId: 'automation:n8n:w1', type: 'owns', grade: 'confirmed', source: 'attestation', validFrom: new Date(), validTo: null });
    await DataService.getInstance().flushWrites();

    workflows = [
      { id: 'w1', name: 'Grant intake', active: true, ownerEmail: 'omar@acme.com' }, // Nadia removed as owner in n8n
      { id: 'w2', name: 'Payroll export', active: true, ownerEmail: 'omar@acme.com' },
    ];
    await authedFetch(`${baseUrl}/api/connections/${n8nId}/sync`, json('POST'));
    await waitForSync(n8nId);

    const owners = DataService.getInstance().getGraph().getOwners('automation:n8n:w1').map((p) => p.id);
    expect(owners).toEqual(['person:omar@acme.com']);
    const omar = (await query(`SELECT grade, source FROM edge WHERE from_id = 'person:omar@acme.com' AND to_id = 'automation:n8n:w1' AND valid_to IS NULL`)).rows;
    expect(omar).toEqual([{ grade: 'confirmed', source: 'attestation' }]); // the sync's weaker 'stated' didn't replace it
    const nadia = (await query(`SELECT valid_to FROM edge WHERE from_id = 'person:nadia@uni.edu' AND to_id = 'automation:n8n:w1'`)).rows;
    expect(nadia[0].valid_to).not.toBeNull();
  });

  it('a failed sync is recorded as failed without leaking secrets, and closes nothing', async () => {
    n8nFail = true;
    const { syncRunId } = (await (await authedFetch(`${baseUrl}/api/connections/${n8nId}/sync`, json('POST'))).json()) as any;
    const after = await waitForSync(n8nId);
    n8nFail = false;
    expect(after.status).toBe('error');
    expect(after.lastError).toBeTruthy();
    expect(after.lastError).not.toContain(API_KEY);
    const run = (await query(`SELECT status, error_message FROM sync_run WHERE id = $1`, [syncRunId])).rows[0];
    expect(run.status).toBe('failed');
    expect(DataService.getInstance().getGraph().getOwners('automation:n8n:w2').map((p) => p.id)).toEqual(['person:omar@acme.com']);
  });

  it('keeps a confirmed criticality when a sync only knows "unknown"', async () => {
    await DataService.getInstance().getFactStore().insertFact({ entityId: 'automation:n8n:w2', attribute: 'criticality', value: 'critical', grade: 'confirmed', source: 'attestation' });
    await authedFetch(`${baseUrl}/api/connections/${n8nId}/sync`, json('POST'));
    await waitForSync(n8nId);
    const crit = (await query(`SELECT value, grade FROM fact WHERE entity_id = 'automation:n8n:w2' AND attribute = 'criticality' AND valid_to IS NULL`)).rows;
    expect(crit).toEqual([{ value: 'critical', grade: 'confirmed' }]);
  });

  it('imports CSV as a one-off sync without storing the file in the connection', async () => {
    const peopleCsv = 'email,name,department\nlina@uni.edu,Lina Haddad,Research\nomar@acme.com,Omar Farooq,Platform\n';
    const automationsCsv = 'id,name,owner_email,backup_owner_email,criticality\nr1,Ethics board sync,lina@uni.edu,omar@acme.com,high\n';
    const res = await authedFetch(`${baseUrl}/api/connections/csv`, json('POST', { peopleCsv, automationsCsv }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.ok).toBe(true);

    const graph = DataService.getInstance().getGraph();
    expect(graph.getOwners('automation:csv:r1').map((p) => p.id)).toEqual(['person:lina@uni.edu']);
    const backup = (await query(`SELECT grade FROM edge WHERE type = 'backs_up' AND to_id = 'automation:csv:r1' AND valid_to IS NULL`)).rows;
    expect(backup).toEqual([{ grade: 'stated' }]); // a spreadsheet can't confirm on the backup's behalf

    const stored = (await query(`SELECT config_encrypted::text AS c FROM connection WHERE id = $1`, [CSV_CONNECTION_ID])).rows[0].c;
    expect(stored).not.toContain('lina@uni.edu');
    const raw = (await query(`SELECT COUNT(*)::int n FROM raw_payload WHERE connection_id = $1`, [CSV_CONNECTION_ID])).rows[0].n;
    expect(raw).toBe(3);
  });

  it('the setup guide sees the synced automation source and CSV import', async () => {
    const status = (await (await authedFetch(`${baseUrl}/api/onboarding/status`)).json()) as any;
    expect(status.store).toBe('database');
    expect(status.steps).toMatchObject({ automations: true, baseline: true, directory: false });
  });

  it('marks syncs interrupted by a restart as failed', async () => {
    await query(`UPDATE connection SET status = 'syncing' WHERE id = $1`, [n8nId]);
    await query(`INSERT INTO sync_run (connection_id, status) VALUES ($1, 'running')`, [n8nId]);
    expect(await ConnectorRunner.recoverInterruptedSyncs()).toBe(1);
    const c = (await query(`SELECT status, last_error FROM connection WHERE id = $1`, [n8nId])).rows[0];
    expect(c.status).toBe('error');
    expect((await query(`SELECT COUNT(*)::int n FROM sync_run WHERE status IN ('queued','running')`)).rows[0].n).toBe(0);
  });
});
