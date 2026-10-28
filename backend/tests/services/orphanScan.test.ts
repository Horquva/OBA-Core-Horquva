import { describe, it, expect } from 'vitest';
import type { CanonicalEdge, CanonicalEntity, CanonicalFact, EdgeType, EntityKind, FactAttribute } from '@horquva/types';
import { ContinuityGraph } from '../../src/domain/graph/index.js';
import { runOrphanScan, orphanScanCsv } from '../../src/services/orphanScan/orphanScanService.js';

const NOW = new Date('2026-11-04T12:00:00Z');

const entity = (id: string, kind: EntityKind, name: string, externalRefs: Record<string, string> = {}): CanonicalEntity => ({
  id, kind, name, externalRefs, createdAt: NOW, updatedAt: NOW,
});
const fact = (entityId: string, attribute: FactAttribute, value: unknown): CanonicalFact => ({
  entityId, attribute, value, grade: 'stated', source: 'connector:test', validFrom: NOW,
});
const edge = (fromId: string, type: EdgeType, toId: string): CanonicalEdge => ({
  fromId, toId, type, grade: 'stated', source: 'connector:test', validFrom: NOW,
});

// People: Omar disabled in Entra, Lina's leave date passed, Sam departed per CSV,
// Priya active in the directory, Dev known only to n8n (not in the directory).
const omar = entity('person:omar@acme.com', 'person', 'Omar Farooq', { entraId: 'e-omar', accountEnabled: 'false' });
const lina = entity('person:lina@acme.com', 'person', 'Lina Haddad', { entraId: 'e-lina', accountEnabled: 'true', employeeLeaveDateTime: '2026-11-01T00:00:00Z' });
const sam = entity('person:sam@acme.com', 'person', 'Sam Okafor');
const priya = entity('person:priya@acme.com', 'person', 'Priya Nair', { googleId: 'g-priya' });
const dev = entity('person:dev@gmail.com', 'person', 'Dev', { n8nUserId: 'u7' });
const people = [omar, lina, sam, priya, dev];
const peopleStatus = [
  fact(omar.id, 'status', 'departed'),
  fact(lina.id, 'status', 'departed'),
  fact(sam.id, 'status', 'departed'),
  fact(priya.id, 'status', 'active'),
  fact(dev.id, 'status', 'active'),
];

function scan(entities: CanonicalEntity[], edges: CanonicalEdge[], facts: CanonicalFact[], inputs = {}) {
  return runOrphanScan(ContinuityGraph.fromSnapshot([...people, ...entities], edges, [...peopleStatus, ...facts]), NOW, inputs);
}

describe('orphan scan', () => {
  it('key_owner_gone: a key whose owner left, with the reason from the directory', () => {
    const key = entity('credential:openai:key_1', 'credential', 'Prod key', { vendor: 'openai' });
    const r = scan([key], [edge(omar.id, 'owns', key.id)], [fact(key.id, 'cost_30d_usd', 412.5), fact(key.id, 'last_used_at', 1793000000)]);
    expect(r.findings).toEqual([
      expect.objectContaining({
        kind: 'key_owner_gone',
        severity: 'high',
        asset: { id: key.id, kind: 'credential', name: 'Prod key', vendor: 'openai' },
        owner: { id: omar.id, name: 'Omar Farooq', reason: 'account_disabled' },
        cost30dUsd: 412.5,
        lastUsedAt: new Date(1793000000 * 1000).toISOString(),
      }),
    ]);
    expect(r.totals.monthlyCostUsd).toBe(412.5);
  });

  it('key_owner_gone: lost project access, and no finding for service-account or active-owner keys', () => {
    const lost = entity('credential:openai:key_2', 'credential', 'Lost access', { vendor: 'openai' });
    const svc = entity('credential:openai:key_3', 'credential', 'Service key', { vendor: 'openai' });
    const fine = entity('credential:anthropic:key_4', 'credential', 'Fine key', { vendor: 'anthropic' });
    const r = scan(
      [lost, svc, fine],
      [edge(priya.id, 'owns', lost.id), edge(priya.id, 'owns', fine.id)],
      [fact(lost.id, 'owner_access', 'inactive'), fact(svc.id, 'owner_type', 'service_account')]
    );
    expect(r.findings.filter((f) => f.kind === 'key_owner_gone').map((f) => [f.asset.id, f.owner?.reason])).toEqual([[lost.id, 'lost_project_access']]);
  });

  it('key_owner_gone fires on first sync with no departure recorded (directory status alone)', () => {
    const key = entity('credential:anthropic:key_5', 'credential', 'Claude key');
    const r = scan([key], [edge(omar.id, 'owns', key.id)], [], { departures: [] });
    expect(r.findings[0]).toMatchObject({ kind: 'key_owner_gone', owner: { reason: 'account_disabled' } });
  });

  it('automation_on_gone_identity: runs on a gone person\'s credentials or is owned by them; inactive ones are skipped', () => {
    const runsAs = entity('automation:n8n:1', 'automation', 'Invoice sync');
    const owned = entity('automation:n8n:2', 'automation', 'Lead router');
    const paused = entity('automation:n8n:3', 'automation', 'Old export');
    const r = scan(
      [runsAs, owned, paused],
      [edge(priya.id, 'owns', runsAs.id), edge(runsAs.id, 'runs_on_credentials_of', lina.id), edge(sam.id, 'owns', owned.id), edge(omar.id, 'owns', paused.id)],
      [fact(paused.id, 'status', 'inactive')],
      { departures: [{ personId: sam.id }] }
    );
    const found = r.findings.filter((f) => f.kind === 'automation_on_gone_identity');
    expect(found.map((f) => [f.asset.id, f.owner?.id, f.owner?.reason])).toEqual([
      [runsAs.id, lina.id, 'leave_date_passed'],
      [owned.id, sam.id, 'departure_recorded'],
    ]);
    expect(found[0].evidence).toEqual(['Runs on the credentials of Lina Haddad, who has left.']);
  });

  it('app_secret_expiring_unowned: within 30 days and no active owner; third-party apps skipped', () => {
    const soon = entity('app:entra:a1', 'app', 'Payroll SSO');
    const later = entity('app:entra:a2', 'app', 'Wiki');
    const owned = entity('app:entra:a3', 'app', 'CRM');
    const vendor = entity('app:entra:a4', 'app', 'Vendor app', { thirdParty: 'true' });
    const r = scan(
      [soon, later, owned, vendor],
      [edge(omar.id, 'owns', soon.id), edge(priya.id, 'owns', owned.id)],
      [
        fact(soon.id, 'credential_expires_at', '2026-11-20T00:00:00Z'),
        fact(later.id, 'credential_expires_at', '2027-03-01T00:00:00Z'),
        fact(owned.id, 'credential_expires_at', '2026-11-10T00:00:00Z'),
        fact(vendor.id, 'credential_expires_at', '2026-11-10T00:00:00Z'),
      ]
    );
    const found = r.findings.filter((f) => f.kind === 'app_secret_expiring_unowned');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ severity: 'medium', asset: { id: soon.id }, owner: { id: omar.id, reason: 'account_disabled' } });
    expect(found[0].evidence[0]).toBe('A secret or certificate expires on 2026-11-20 (in 16 days).');
  });

  it('owner_not_in_directory: an owner the directory does not know, reported as unverified', () => {
    const wf = entity('automation:n8n:9', 'automation', 'Slack digest');
    const r = scan([wf], [edge(dev.id, 'owns', wf.id)], []);
    expect(r.directoryConnected).toBe(true);
    expect(r.findings).toEqual([expect.objectContaining({ kind: 'owner_not_in_directory', severity: 'low', owner: { id: dev.id, name: 'Dev', reason: 'not_in_directory' } })]);
  });

  it('skips owner_not_in_directory when no directory is connected', () => {
    const wf = entity('automation:n8n:9', 'automation', 'Slack digest');
    const r = scan([wf], [edge(dev.id, 'owns', wf.id)], [], { directoryConnected: false });
    expect(r.directoryConnected).toBe(false);
    expect(r.findings).toEqual([]);
  });

  it('ranks by severity, then cost (unknown last), then most recent use', () => {
    const keys = ['a', 'b', 'c', 'd'].map((k) => entity(`credential:openai:${k}`, 'credential', `Key ${k}`));
    const app = entity('app:entra:x', 'app', 'Expiring app');
    const r = scan(
      [...keys, app],
      keys.map((k) => edge(omar.id, 'owns', k.id)),
      [
        fact(keys[0].id, 'cost_30d_usd', 10),
        fact(keys[1].id, 'cost_30d_usd', 900),
        fact(keys[2].id, 'last_used_at', '2026-11-01T00:00:00Z'),
        fact(keys[3].id, 'last_used_at', '2026-11-03T00:00:00Z'),
        fact(app.id, 'credential_expires_at', '2026-11-08T00:00:00Z'),
      ]
    );
    expect(r.findings.map((f) => f.asset.name)).toEqual(['Key b', 'Key a', 'Key d', 'Key c', 'Expiring app']);
    expect(r.totals.byKind).toEqual({ key_owner_gone: 4, automation_on_gone_identity: 0, app_secret_expiring_unowned: 1, owner_not_in_directory: 0 });
    expect(r.totals.monthlyCostUsd).toBe(910);
  });

  it('exports CSV with a fixed header and neutralises spreadsheet formulas', () => {
    const key = entity('credential:openai:k', 'credential', '=HYPERLINK("x")');
    const csv = orphanScanCsv(scan([key], [edge(omar.id, 'owns', key.id)], []));
    const [header, row] = csv.split('\r\n');
    expect(header).toBe('severity,kind,asset_id,asset_name,asset_kind,vendor,owner_id,owner_name,owner_reason,cost_30d_usd,last_used_at,evidence');
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
    expect(row.startsWith('high,key_owner_gone,credential:openai:k,')).toBe(true);
  });
});
