// =============================================================================
// Task 2.4: people anchored on directory ids (plan review focus 2).
// Two real Entra connector syncs through ConnectorRunner against Postgres, with
// a fake Microsoft Graph whose user changes their primary email in between.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'node:http';
import { DataService } from '../../src/services/dataService.js';
import { ConnectorRunner } from '../../src/connectors/sdk/runner.js';
import { EntraConnector } from '../../src/connectors/entra/index.js';
import { ReadOnlyHttpGuard } from '../../src/connectors/sdk/guard.js';
import { query } from '../../src/db/client.js';
import { resetDatabase } from './db.js';

const CONN = 'conn_entra_anchor';
let fake: http.Server;
let graphBaseUrl = '';

// Omar's mailbox is renamed between syncs. Exchange keeps the old primary as an
// smtp: proxy address, which is what keeps tool accounts on the old address linked.
let omar: Record<string, unknown> = {
  id: 'e-omar',
  displayName: 'Omar Farooq',
  mail: 'omar@acme.com',
  userPrincipalName: 'omar@acme.onmicrosoft.com',
  proxyAddresses: ['SMTP:omar@acme.com'],
  accountEnabled: true,
};
let chen: Record<string, unknown> = { id: 'e-chen', displayName: 'Chen Wei', mail: 'chen@acme.com', userPrincipalName: 'chen@acme.onmicrosoft.com', jobTitle: 'Staff Engineer', accountEnabled: true };

beforeAll(async () => {
  await resetDatabase();
  await DataService.initialize();
  await query(`INSERT INTO connection (id, type, name, status) VALUES ($1, 'entra', 'Entra', 'disconnected')`, [CONN]);

  fake = http.createServer((req, res) => {
    const url = new URL(req.url!, 'http://x');
    const send = (body: unknown) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    if (url.pathname === '/graph/users') return send({ value: [omar, chen] });
    if (url.pathname === '/graph/applications') return send({ value: [{ id: 'app-1', appId: 'client-1', displayName: 'Payroll Portal' }] });
    if (url.pathname === '/graph/applications/app-1/owners') {
      return send({ value: [{ '@odata.type': '#microsoft.graph.user', id: 'e-omar', mail: omar.mail }, { '@odata.type': '#microsoft.graph.servicePrincipal', id: 'sp-1' }] });
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => fake.listen(0, () => r()));
  graphBaseUrl = `http://localhost:${(fake.address() as any).port}/graph`;

  vi.spyOn(ConnectorRunner, 'load').mockImplementation(async () => {
    const entra = new EntraConnector(CONN, 'Entra', { tenantId: 't', clientId: 'c', clientSecret: 's', graphBaseUrl });
    return Object.assign(entra, { cachedAccessToken: 'test-token', tokenExpiresAt: Date.now() + 3_600_000, guard: new ReadOnlyHttpGuard(['localhost']) });
  });
});

afterAll(async () => {
  vi.restoreAllMocks();
  await new Promise<void>((r) => fake.close(() => r()));
});

async function syncEntra(): Promise<void> {
  const { syncRunId } = await ConnectorRunner.queueSync(CONN);
  const result = await ConnectorRunner.executeSync(CONN, syncRunId);
  expect(result.ok).toBe(true);
}

describe('people anchored on directory ids (Task 2.4)', () => {
  it('email change keeps the same person entity and edges', async () => {
    await syncEntra();
    const before = (await query(`SELECT id FROM edge WHERE from_id = 'person:entra:e-omar' AND to_id = 'app:entra:client-1' AND type = 'owns' AND valid_to IS NULL`)).rows;
    expect(before).toHaveLength(1);

    omar = { ...omar, mail: 'omar.farooq@acme.com', proxyAddresses: ['SMTP:omar.farooq@acme.com', 'smtp:omar@acme.com'] };
    await syncEntra();

    const people = (await query(`SELECT id, external_refs FROM entity WHERE external_refs ->> 'entraId' = 'e-omar'`)).rows;
    expect(people).toHaveLength(1);
    expect(people[0].id).toBe('person:entra:e-omar');
    expect(people[0].external_refs.email).toBe('omar.farooq@acme.com');
    expect(JSON.parse(people[0].external_refs.emails)).toContain('omar@acme.com');

    // The same owns edge row is still open: nothing was closed and re-created.
    const after = (await query(`SELECT id FROM edge WHERE from_id = 'person:entra:e-omar' AND to_id = 'app:entra:client-1' AND type = 'owns' AND valid_to IS NULL`)).rows;
    expect(after.map((r) => r.id)).toEqual(before.map((r) => r.id));
    expect((await query(`SELECT COUNT(*)::int n FROM edge WHERE from_id = 'person:entra:e-omar' AND valid_to IS NOT NULL`)).rows[0].n).toBe(0);
  });

  it('a service principal owner is not turned into a person', async () => {
    const owners = (await query(`SELECT from_id FROM edge WHERE to_id = 'app:entra:client-1' AND type = 'owns' AND valid_to IS NULL`)).rows;
    expect(owners.map((r) => r.from_id)).toEqual(['person:entra:e-omar']);
  });

  it('two Entra users never share an entity', async () => {
    const ids = (await query(`SELECT id FROM entity WHERE kind = 'person' ORDER BY id`)).rows.map((r) => r.id);
    expect(ids).toEqual(['person:entra:e-chen', 'person:entra:e-omar']);
  });

  it('a title cleared in Entra clears the stored description', async () => {
    const desc = async () => (await query(`SELECT description FROM entity WHERE id = 'person:entra:e-chen'`)).rows[0].description;
    expect(await desc()).toBe('Staff Engineer');
    chen = { ...chen, jobTitle: null };
    await syncEntra();
    expect(await desc()).toBeNull();
  });
});
