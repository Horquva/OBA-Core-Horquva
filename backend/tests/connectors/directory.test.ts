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
let requestCount = 0;

beforeAll(async () => {
  fake = http.createServer((req, res) => {
    requestCount++;
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
          { id: 'e-omar', displayName: 'Omar Farooq', mail: 'omar@acme.com', userPrincipalName: 'Omar.F@acme.onmicrosoft.com', proxyAddresses: ['SMTP:omar@acme.com', 'smtp:o.farooq@acme.com', 'SIP:omar@acme.com', 'X500:/o=ExchangeLabs'], otherMails: ['omar.personal@example.org'], accountEnabled: false, employeeLeaveDateTime: null },
          { id: 'e-chen', displayName: 'Chen Wei', mail: 'chen@acme.com', accountEnabled: true, employeeLeaveDateTime: '2026-12-31T00:00:00Z', jobTitle: 'Staff Engineer' },
          { id: 'e-lina', displayName: 'Lina Haddad', mail: 'lina@acme.com', accountEnabled: true, jobTitle: 'Researcher', department: 'Ethics' },
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
      expect.objectContaining({ fromId: 'person:google:g-omar', toId: 'person:google:g-maya', type: 'reports_to' }),
    ]);
    expect(result.edges.some((e) => e.type === 'member_of')).toBe(false);

    const maya = result.entities.find((e) => e.id === 'person:google:g-maya')!;
    expect(maya.externalRefs.suspended).toBe('true');
    expect(result.facts.find((f) => f.entityId === maya.id && f.attribute === 'status')?.value).toBe('departed');
    expect(result.entities.find((e) => e.id === 'person:google:g-omar')!.externalRefs.suspended).toBe('false');
  });
});

describe('Google Workspace connector without a key', () => {
  it('google connector without service account key throws a configuration error naming serviceAccountKeyJson', async () => {
    const before = requestCount;
    const google = new GoogleWorkspaceConnector('conn_g2', 'Google', { adminEmail: 'admin@acme.com', serviceAccountKeyJson: '{}', apiBaseUrl: `${baseUrl}/google` });
    Object.assign(google, { guard: new ReadOnlyHttpGuard(['localhost']) });

    const err = await (google as any).getAccessToken().catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('serviceAccountKeyJson');
    expect(err.message).not.toMatch(/sandbox|token:/i);
    await google.sync().catch(() => undefined);
    expect(requestCount).toBe(before);
  });
});

describe('Entra connector', () => {
  it('missing jobTitle and department produce no description', async () => {
    const entra = offline(new EntraConnector('conn_e3', 'Entra', { tenantId: 't', clientId: 'c', clientSecret: 's', graphBaseUrl: `${baseUrl}/graph` }));
    const result = await entra.sync();
    const omar = result.entities.find((e) => e.externalRefs.entraId === 'e-omar')!;
    expect(omar.description).toBeUndefined();
    expect(omar.externalRefs).toMatchObject({ jobTitle: '', department: '' });
    expect(JSON.stringify(result.entities)).not.toMatch(/Team Member|Operations/);
  });

  it('jobTitle only gives description equal to jobTitle', async () => {
    const entra = offline(new EntraConnector('conn_e4', 'Entra', { tenantId: 't', clientId: 'c', clientSecret: 's', graphBaseUrl: `${baseUrl}/graph` }));
    const result = await entra.sync();
    expect(result.entities.find((e) => e.externalRefs.entraId === 'e-chen')!.description).toBe('Staff Engineer');
    expect(result.entities.find((e) => e.externalRefs.entraId === 'e-lina')!.description).toBe('Researcher - Ethics');
  });

  it('stores accountEnabled and the leave date as strings, and a disabled user is departed', async () => {
    const entra = offline(new EntraConnector('conn_e', 'Entra', { tenantId: 't', clientId: 'c', clientSecret: 's', graphBaseUrl: `${baseUrl}/graph` }));
    const result = await entra.sync();

    const omar = result.entities.find((e) => e.id === 'person:entra:e-omar')!;
    expect(omar.externalRefs).toMatchObject({ accountEnabled: 'false', employeeLeaveDateTime: '' });
    expect(result.facts.find((f) => f.entityId === omar.id && f.attribute === 'status')?.value).toBe('departed');

    const chen = result.entities.find((e) => e.id === 'person:entra:e-chen')!;
    expect(chen.externalRefs).toMatchObject({ accountEnabled: 'true', employeeLeaveDateTime: '2026-12-31T00:00:00Z' });
  });
});

describe('Entra people anchored on object id (Task 2.4)', () => {
  it('proxyAddresses become aliases', async () => {
    const entra = offline(new EntraConnector('conn_e5', 'Entra', { tenantId: 't', clientId: 'c', clientSecret: 's', graphBaseUrl: `${baseUrl}/graph` }));
    const result = await entra.sync();
    const omar = result.entities.find((e) => e.id === 'person:entra:e-omar')!;
    expect(omar.externalRefs.email).toBe('omar@acme.com');
    expect(JSON.parse(omar.externalRefs.emails)).toEqual([
      'omar@acme.com',
      'omar.f@acme.onmicrosoft.com',
      'o.farooq@acme.com',
      'omar.personal@example.org',
    ]);
  });

  it('two Entra users never share an entity', async () => {
    const entra = offline(new EntraConnector('conn_e6', 'Entra', { tenantId: 't', clientId: 'c', clientSecret: 's', graphBaseUrl: `${baseUrl}/graph` }));
    const result = await entra.sync();
    const people = result.entities.filter((e) => e.kind === 'person');
    expect(new Set(people.map((p) => p.id)).size).toBe(people.length);
    expect(people.every((p) => p.id === `person:entra:${p.externalRefs.entraId}`)).toBe(true);
  });
});

describe('CSV connector', () => {
  it('writes manager_email as reports_to', async () => {
    const csv = new CsvConnector('conn_csv', 'CSV', { peopleCsvContent: 'email,name,manager_email\nomar@acme.com,Omar,maya@acme.com\nmaya@acme.com,Maya,\n' });
    const result = await csv.sync();
    expect(result.edges.filter((e) => e.fromId === 'person:csv:omar@acme.com').map((e) => [e.type, e.toId])).toEqual([['reports_to', 'person:csv:maya@acme.com']]);
  });
});
