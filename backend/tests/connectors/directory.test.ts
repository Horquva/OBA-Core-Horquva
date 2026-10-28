// =============================================================================
// Directory connectors (B3): Google and CSV write the manager as `reports_to`
// (not a team), and Entra/Google keep the account state that explains a
// `departed` status in externalRefs.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { GoogleWorkspaceConnector } from '../../src/connectors/google/index.js';
import { EntraConnector } from '../../src/connectors/entra/index.js';
import { CsvConnector } from '../../src/connectors/csv/index.js';
import { ReadOnlyHttpGuard } from '../../src/connectors/sdk/guard.js';

let fake: http.Server;
let baseUrl: string;

beforeAll(async () => {
  fake = http.createServer((req, res) => {
    const url = new URL(req.url!, 'http://x');
    const send = (body: unknown) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    if (url.pathname === '/google/users') {
      return send({
        users: [
          { id: 'g-omar', primaryEmail: 'Omar@acme.com', name: { fullName: 'Omar Farooq' }, suspended: false, relations: [{ type: 'manager', value: 'Maya@acme.com' }] },
          { id: 'g-maya', primaryEmail: 'maya@acme.com', name: { fullName: 'Maya Chen' }, suspended: true },
        ],
      });
    }
    if (url.pathname === '/graph/users') {
      return send({
        value: [
          { id: 'e-omar', displayName: 'Omar Farooq', mail: 'omar@acme.com', accountEnabled: false, employeeLeaveDateTime: null },
          { id: 'e-chen', displayName: 'Chen Wei', mail: 'chen@acme.com', accountEnabled: true, employeeLeaveDateTime: '2026-12-31T00:00:00Z' },
        ],
      });
    }
    if (url.pathname === '/graph/applications') return send({ value: [] });
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => fake.listen(0, () => r()));
  baseUrl = `http://localhost:${(fake.address() as any).port}`;
});

afterAll(() => new Promise<void>((r) => fake.close(() => r())));

/** No real token endpoint in tests: pre-seed the cached token and let the guard reach the fake. */
function offline<T extends object>(connector: T): T {
  return Object.assign(connector, { cachedAccessToken: 'test-token', tokenExpiresAt: Date.now() + 3_600_000, guard: new ReadOnlyHttpGuard(['localhost']) });
}

describe('Google Workspace connector', () => {
  it('writes the manager as reports_to and the suspended flag on every person', async () => {
    const google = offline(new GoogleWorkspaceConnector('conn_g', 'Google', { adminEmail: 'admin@acme.com', serviceAccountKeyJson: '{}', apiBaseUrl: `${baseUrl}/google` }));
    const result = await google.sync();

    expect(result.edges).toEqual([
      expect.objectContaining({ fromId: 'person:omar@acme.com', toId: 'person:maya@acme.com', type: 'reports_to' }),
    ]);
    expect(result.edges.some((e) => e.type === 'member_of')).toBe(false);

    const maya = result.entities.find((e) => e.id === 'person:maya@acme.com')!;
    expect(maya.externalRefs.suspended).toBe('true');
    expect(result.facts.find((f) => f.entityId === maya.id && f.attribute === 'status')?.value).toBe('departed');
    expect(result.entities.find((e) => e.id === 'person:omar@acme.com')!.externalRefs.suspended).toBe('false');
  });
});

describe('Entra connector', () => {
  it('stores accountEnabled and the leave date as strings, and a disabled user is departed', async () => {
    const entra = offline(new EntraConnector('conn_e', 'Entra', { tenantId: 't', clientId: 'c', clientSecret: 's', graphBaseUrl: `${baseUrl}/graph` }));
    const result = await entra.sync();

    const omar = result.entities.find((e) => e.id === 'person:omar@acme.com')!;
    expect(omar.externalRefs).toMatchObject({ accountEnabled: 'false', employeeLeaveDateTime: '' });
    expect(result.facts.find((f) => f.entityId === omar.id && f.attribute === 'status')?.value).toBe('departed');

    const chen = result.entities.find((e) => e.id === 'person:chen@acme.com')!;
    expect(chen.externalRefs).toMatchObject({ accountEnabled: 'true', employeeLeaveDateTime: '2026-12-31T00:00:00Z' });
  });
});

describe('CSV connector', () => {
  it('writes manager_email as reports_to', async () => {
    const csv = new CsvConnector('conn_csv', 'CSV', { peopleCsvContent: 'email,name,manager_email\nomar@acme.com,Omar,maya@acme.com\nmaya@acme.com,Maya,\n' });
    const result = await csv.sync();
    expect(result.edges.filter((e) => e.fromId === 'person:omar@acme.com').map((e) => [e.type, e.toId])).toEqual([['reports_to', 'person:maya@acme.com']]);
  });
});
