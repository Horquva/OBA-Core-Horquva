// =============================================================================
// Horquva Continuity Platform — People & Teams + Actions (Sprint 2 D9)
// =============================================================================
// Hand-checked against tests/fixtures/handCheckableTruth.json:
//   Platform Engineering (directory group): omar, chen, maya, david, elena.
//     Critical/high owned: omar 101 + 102 (no backups), maya 103 (chen backs up).
//     → total 3, covered 1; omar holds 2/3 = a majority on his own.
//   Revenue Operations: sarah, liam, priya, carlos, aisha. sarah 104 (no backup).
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { DataService } from '../../src/services/dataService.js';
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

const PLATFORM = 'group:platform-engineering';

describe('People & Teams (UI-03, SEC-07)', () => {
  it('teams are the directory groups, not a hard-coded roster', async () => {
    const { body } = await call('GET', '/api/people/teams');
    expect(body.teams.map((t: any) => [t.id, t.name, t.memberCount])).toEqual([
      [PLATFORM, 'Platform Engineering', 5],
      ['group:revenue-operations', 'Revenue Operations', 5],
    ]);
  });

  it('coverage and concentration are counted from the graph; the sentence names nobody', async () => {
    const platform = (await call('GET', '/api/people/teams')).body.teams[0];
    expect(platform.coverage).toMatchObject({ total: 3, covered: 1, exposed: 2 });
    expect(platform.concentration.sentence).toBe("1 person holds 2 of Platform Engineering's 3 critical assets.");
    expect(platform.concentration.sentence).not.toMatch(/Omar|Maya/);
    const revops = (await call('GET', '/api/people/teams')).body.teams[1];
    expect(revops.concentration.sentence).toBe("1 person holds Revenue Operations' only critical asset.");
    // UX D-23: the named share bar is the one approved place names appear, by descending share.
    expect(platform.concentration.holders).toEqual([
      { person: { id: 'person:omar@acme.com', kind: 'person', name: 'Omar Farooq' }, count: 2, sharePct: 67 },
      { person: { id: 'person:maya@acme.com', kind: 'person', name: 'Maya Lin' }, count: 1, sharePct: 33 },
    ]);
  });

  it('team members are alphabetical only, never by holdings', async () => {
    const { body } = await call('GET', `/api/people/teams/${encodeURIComponent(PLATFORM)}`);
    expect(body.members.map((m: any) => m.person.name)).toEqual(['Chen Wei', 'David Miller', 'Elena Rostova', 'Maya Lin', 'Omar Farooq']);
    expect(body.members.every((m: any) => m.title === null)).toBe(true); // no invented job titles
  });

  it('teams below the minimum group size show no per-person breakdown', async () => {
    const ds = DataService.getInstance();
    const org = ds.getOrganization(); // a copy
    ds.saveOrganization({ ...org, minGroupSize: 6 });
    try {
      const team = (await call('GET', '/api/people/teams')).body.teams[0];
      expect(team.rolledUp).toBe(true);
      expect(team.concentration).toBeNull();
      expect((await call('GET', `/api/people/teams/${encodeURIComponent(PLATFORM)}`)).body.members).toEqual([]);
    } finally {
      ds.saveOrganization(org);
    }
  });

  it('person holdings carry the real evidence; unknowns stay unknown', async () => {
    const chen = (await call('GET', '/api/people/person:chen@acme.com')).body;
    expect(chen.team).toEqual({ id: PLATFORM, kind: 'group', name: 'Platform Engineering' });
    expect(chen.title).toBeNull();
    expect(chen.pendingConfirmations).toBeNull(); // not counted here — never "all verified"
    const backing = chen.holdings.find((h: any) => h.relation === 'backs_up');
    expect(backing).toMatchObject({
      asset: { id: 'automation:n8n:103' },
      criticality: 'high',
      backup: { state: 'value', display: 'Chen Wei', grade: 'confirmed', source: 'attestation', observedAt: '2025-01-01T00:00:00.000Z' },
    });

    const omar = (await call('GET', '/api/people/person:omar@acme.com')).body;
    expect(omar.holdings.map((h: any) => h.asset.id).sort()).toEqual(['automation:n8n:101', 'automation:n8n:102']);
    expect(omar.holdings.every((h: any) => h.backup.state === 'none' && h.backup.grade === 'unknown')).toBe(true);
  });
});

describe('Actions remediation (SIM-08)', () => {
  const actionFor = async (assetId: string) =>
    (await call('GET', '/api/actions')).body.actions.find((a: any) => a.asset.id === assetId && a.type === 'assign_backup');

  it('rejects an owner as their own backup, and someone who is leaving', async () => {
    const a101 = await actionFor('automation:n8n:101');
    expect((await call('POST', `/api/actions/${encodeURIComponent(a101.id)}/assign-backup`, { personId: 'person:omar@acme.com' })).status).toBe(400);
    expect((await call('POST', `/api/actions/${encodeURIComponent(a101.id)}/assign-backup`, { personId: 'person:sarah@acme.com' })).status).toBe(400);
    expect((await call('POST', '/api/actions/C1:nope/assign-backup', { personId: 'person:chen@acme.com' })).status).toBe(404);
  });

  it('records an assigned backup as "stated" (only the backup can confirm), then resolves the action', async () => {
    const a101 = await actionFor('automation:n8n:101');
    const res = await call('POST', `/api/actions/${encodeURIComponent(a101.id)}/assign-backup`, { personId: 'person:priya@acme.com' });
    expect(res.status).toBe(200);
    const edge = DataService.getInstance()
      .getGraph()
      .getAllEdges()
      .find((e) => e.type === 'backs_up' && e.fromId === 'person:priya@acme.com' && e.toId === 'automation:n8n:101');
    expect(edge).toMatchObject({ grade: 'stated', source: 'manual_assignment' });
    // Second attempt: already resolved.
    expect((await call('POST', `/api/actions/${encodeURIComponent(a101.id)}/assign-backup`, { personId: 'person:liam@acme.com' })).status).toBe(409);
  });

  it('accept-risk records the real signed-in person and a bounded future expiry', async () => {
    const a102 = await actionFor('automation:n8n:102');
    const path = `/api/actions/${encodeURIComponent(a102.id)}/accept-risk`;
    const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
    expect((await call('POST', path, { reason: 'x', expiresAt: inDays(-1) })).status).toBe(400);
    expect((await call('POST', path, { reason: 'x', expiresAt: inDays(400) })).status).toBe(400);

    // Accept as Chen promoted to admin, so the recorded name can't be a hard-coded default.
    const ds = DataService.getInstance();
    ds.updateUser('user:chen', { role: 'admin' });
    try {
      expect((await call('POST', path, { reason: 'Vendor migration in Q1', expiresAt: inDays(30) }, 'user:chen')).status).toBe(200);
    } finally {
      ds.updateUser('user:chen', { role: 'reviewer' });
    }
    const after = (await call('GET', '/api/actions')).body.actions.find((a: any) => a.id === a102.id);
    expect(after.status).toBe('accepted_risk');
    expect(after.acceptedRisk.acceptedBy).toBe('Chen Wei');
  });

  it('an accepted risk lapses back to open at its expiry', async () => {
    const a104 = await actionFor('automation:n8n:104');
    DataService.getInstance().getAllActionOverrides().set(a104.id, {
      id: a104.id,
      checkId: a104.checkId,
      entityId: 'automation:n8n:104',
      status: 'accepted_risk',
      acceptedRisk: { reason: 'old', expiresAt: '2020-01-01T00:00:00.000Z', acceptedBy: 'Someone' },
    });
    const after = (await call('GET', '/api/actions')).body.actions.find((a: any) => a.id === a104.id);
    expect(after).toMatchObject({ status: 'open', acceptedRisk: null });
  });
});
