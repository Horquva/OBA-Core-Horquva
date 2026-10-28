// =============================================================================
// Leaver / mover detection (B5) through the real ConnectorRunner.executeSync:
// an Entra connector pointed at a fake Graph, Postgres underneath.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'node:http';
import { DataService } from '../../src/services/dataService.js';
import { ConnectorRunner } from '../../src/connectors/sdk/runner.js';
import { EntraConnector } from '../../src/connectors/entra/index.js';
import { ReadOnlyHttpGuard } from '../../src/connectors/sdk/guard.js';
import { query } from '../../src/db/client.js';
import { authedFetch } from '../helpers/session.js';
import { resetDatabase, startServer, json } from './db.js';

const CONNECTION_ID = 'conn_entra_leavers';

type GraphUser = { id: string; displayName: string; mail: string; accountEnabled: boolean; department: string; employeeLeaveDateTime: string | null };
let users: GraphUser[] = [];
let fakeGraph: http.Server;
let graphUrl: string;
let server: http.Server;
let baseUrl: string;

const user = (id: string, displayName: string, department = 'Platform'): GraphUser => ({
  id, displayName, mail: `${id}@globex.com`, accountEnabled: true, department, employeeLeaveDateTime: null,
});
const set = (id: string, patch: Partial<GraphUser>) => {
  users = users.map((u) => (u.id === id ? { ...u, ...patch } : u));
};

async function sync(): Promise<void> {
  const run = await query(`INSERT INTO sync_run (connection_id, status) VALUES ($1, 'queued') RETURNING id`, [CONNECTION_ID]);
  const result = await ConnectorRunner.executeSync(CONNECTION_ID, run.rows[0].id);
  expect(result.ok, result.error).toBe(true);
}

// Only events from these syncs (the demo seed has a person_left of its own), oldest first.
const lifecycleEvents = () => DataService.getInstance().getChangeEvents().filter((e) => e.kind.startsWith('person_') && e.title.endsWith('(Entra)')).reverse();

beforeAll(async () => {
  fakeGraph = http.createServer((req, res) => {
    const url = new URL(req.url!, 'http://x');
    const send = (body: unknown) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    if (url.pathname === '/users') return send({ value: users });
    if (url.pathname === '/applications') return send({ value: [] });
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => fakeGraph.listen(0, () => r()));
  graphUrl = `http://localhost:${(fakeGraph.address() as any).port}`;

  await resetDatabase();
  // The demo seed provides the admin the requests sign in as; the fake directory uses its own domain.
  await DataService.initialize({ ...process.env, DEMO_MODE: 'true' });
  ({ server, baseUrl } = await startServer());
  await query(`INSERT INTO connection (id, type, name) VALUES ($1, 'entra', 'Entra')`, [CONNECTION_ID]);

  // The runner loads connectors from encrypted configs; here it gets an Entra connector aimed at the fake.
  vi.spyOn(ConnectorRunner, 'load').mockImplementation(async () => {
    const c = new EntraConnector(CONNECTION_ID, 'Entra', { tenantId: 't', clientId: 'c', clientSecret: 's', graphBaseUrl: graphUrl });
    return Object.assign(c, { cachedAccessToken: 'test-token', tokenExpiresAt: Date.now() + 3_600_000, guard: new ReadOnlyHttpGuard(['localhost']) });
  });
});

afterAll(async () => {
  vi.restoreAllMocks();
  await new Promise<void>((r) => server.close(() => r()));
  await new Promise<void>((r) => fakeGraph.close(() => r()));
});

describe('leaver and mover suggestions from Entra (Postgres)', () => {
  it('the baseline sync reports nobody, even someone already disabled', async () => {
    users = [user('omar', 'Omar Farooq'), user('nadia', 'Nadia Rahman'), user('chen', 'Chen Wei'), user('priya', 'Priya Nair')];
    set('nadia', { accountEnabled: false });
    await sync();
    expect(lifecycleEvents()).toEqual([]);
    expect(DataService.getInstance().getGraph().getNode('person:nadia@globex.com')?.facts.get('status')?.value).toBe('departed');
  });

  it('a later disable is exactly one "Possible leaver" suggestion, and no departure', async () => {
    set('omar', { accountEnabled: false });
    await sync();
    const events = lifecycleEvents();
    expect(events.map((e) => [e.kind, e.title])).toEqual([['person_left', 'Possible leaver: Omar Farooq (Entra)']]);
    expect(events[0].href).toMatch(/^\/departures\?record=person%3Aomar%40globex\.com&source=entra&detectedAt=/);
    expect(DataService.getInstance().getDepartures().filter((d) => d.personId.endsWith('@globex.com'))).toEqual([]);
  });

  it('re-syncing the same state adds nothing', async () => {
    await sync();
    expect(lifecycleEvents()).toHaveLength(1);
  });

  it('opening the suggestion starts the departure at account_disabled, timed from detection', async () => {
    const href = lifecycleEvents()[0].href!;
    const detectedAt = new URLSearchParams(href.split('?')[1]).get('detectedAt')!;
    const today = new Date().toISOString().slice(0, 10);
    const res = await authedFetch(`${baseUrl}/api/departures`, json('POST', { personId: 'person:omar@globex.com', leaveDate: today, detectedFrom: 'entra', disabledAt: detectedAt }));
    expect(res.status).toBe(201);
    const { id } = (await res.json()) as any;

    const dep = DataService.getInstance().getDeparture(id)!;
    expect(dep).toMatchObject({ detectedFrom: 'entra', stage: 'account_disabled' });
    expect(dep.stageTimestamps.account_disabled).toBe(detectedAt);
    const row = (await query(`SELECT stage, detected_from FROM departure WHERE id = $1`, [id])).rows[0];
    expect(row).toEqual({ stage: 'account_disabled', detected_from: 'entra' });
  });

  it('a passed leave date with the account still enabled stays initiated', async () => {
    set('chen', { employeeLeaveDateTime: new Date(Date.now() - 86_400_000).toISOString() });
    await sync();
    expect(lifecycleEvents().some((e) => e.title === 'Possible leaver: Chen Wei (Entra)')).toBe(true);

    const today = new Date().toISOString().slice(0, 10);
    const res = await authedFetch(`${baseUrl}/api/departures`, json('POST', { personId: 'person:chen@globex.com', leaveDate: today, detectedFrom: 'entra', disabledAt: new Date().toISOString() }));
    expect(res.status).toBe(201);
    expect(DataService.getInstance().getDeparture(((await res.json()) as any).id)?.stage).toBe('initiated');
  });

  it('a department change is a person_moved', async () => {
    set('priya', { department: 'Finance' });
    await sync();
    const moved = lifecycleEvents().filter((e) => e.kind === 'person_moved');
    expect(moved.map((e) => e.title)).toEqual(['Moved: Priya Nair (Entra)']);
    expect(moved[0].impact).toMatch(/^Platform → Finance\./);
  });

  it('rejects a disabledAt in the future', async () => {
    const res = await authedFetch(`${baseUrl}/api/departures`, json('POST', { personId: 'person:priya@globex.com', leaveDate: '2026-12-01', detectedFrom: 'entra', disabledAt: '2999-01-01T00:00:00Z' }));
    expect(res.status).toBe(400);
  });
});
