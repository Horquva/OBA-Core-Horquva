// =============================================================================
// Horquva Continuity Platform — Overview + Assets wiring (Sprint 2 D7, UI-01/UI-04)
// =============================================================================
// Hand-checked against tests/fixtures/handCheckableTruth.json:
//   critical/high: 101 (critical, omar, no backup, 500 runs), 102 (critical,
//   omar, no backup, undocumented, 120 runs), 103 (high, maya, chen backs up,
//   all confirmed), 104 (critical, sarah, no backup, NO documented/fallback
//   facts, 350 runs). 105 medium (david's personal credential), 106 low.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { ContinuityGraph } from '../../src/domain/graph/index.js';
import { calculateHeadlineMetrics } from '../../src/domain/checks/index.js';
import { authedFetch } from '../helpers/session.js';
import { SnapshotService } from '../../src/services/snapshot/snapshotService.js';
import { DataService } from '../../src/services/dataService.js';

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

const get = async (path: string, as = 'user:admin') => {
  const res = await authedFetch(`${baseUrl}${path}`, {}, as);
  return { status: res.status, body: (await res.json()) as any };
};

describe('Headline coverage partitions unknown out of exposed (DATA-03, B-01)', () => {
  it('fixture: 1 covered, 3 exposed (known gaps), 0 unknown — and the three add up', async () => {
    const { metrics } = (await get('/api/continuity/overview')).body;
    expect(metrics).toMatchObject({
      totalCriticalAssets: 4,
      fullyCoveredCriticalAssets: 1,
      exposedCriticalAssets: 3,
      unknownCriticalAssets: 0,
    });
  });

  it('an asset with a backup and only unconfirmed/unrecorded facts is unknown, not exposed', () => {
    const t = new Date('2025-01-01T00:00:00Z');
    const entity = (id: string, kind: any, name: string) => ({ id, kind, name, externalRefs: {}, createdAt: t, updatedAt: t });
    const fact = (attribute: any, value: unknown, grade: any) =>
      ({ id: `${attribute}`, entityId: 'automation:x', attribute, value, grade, source: 'test', validFrom: t, validTo: null }) as any;
    const graph = ContinuityGraph.fromSnapshot(
      [entity('automation:x', 'automation', 'X'), entity('person:p', 'person', 'P'), entity('person:b', 'person', 'B')],
      [
        { id: 'e1', fromId: 'person:p', toId: 'automation:x', type: 'owns', grade: 'stated', source: 'n8n', validFrom: t, validTo: null },
        { id: 'e2', fromId: 'person:b', toId: 'automation:x', type: 'backs_up', grade: 'confirmed', source: 'attestation', validFrom: t, validTo: null },
      ] as any,
      [fact('criticality', 'critical', 'confirmed'), fact('documented', true, 'stated')] // stated, not confirmed; no fallback fact
    );
    expect(calculateHeadlineMetrics(graph)).toMatchObject({
      totalCriticalAssets: 1,
      fullyCoveredCriticalAssets: 0,
      exposedCriticalAssets: 0,
      unknownCriticalAssets: 1,
    });
  });
});

describe('Overview trend compares against the snapshot a week ago', () => {
  afterAll(() => SnapshotService.resetInMemoryCache());

  it('is null while no snapshot is at least 7 days old', async () => {
    SnapshotService.resetInMemoryCache();
    await SnapshotService.captureDailySnapshot(DataService.getInstance()); // today only
    expect((await get('/api/continuity/overview')).body.trend).toBeNull();
  });

  it('reports counted deltas against the latest snapshot on or before 7 days ago', async () => {
    SnapshotService.resetInMemoryCache();
    const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
    const old = await SnapshotService.captureDailySnapshot(DataService.getInstance(), day(9));
    await SnapshotService.captureDailySnapshot(DataService.getInstance(), day(3)); // too recent to compare against
    // Fixture today: 1 covered, 3 exposed, 0 unknown. Pretend a week ago was 0 / 4 / 0.
    old.headline = { ...old.headline, coveredCount: 0, exposedCount: 4, unknownCount: 0 };

    expect((await get('/api/continuity/overview')).body.trend).toEqual({
      comparedTo: day(9),
      covered: 1,
      exposed: -1,
      unknown: 0,
    });
  });
});

describe('Overview history and exposure causes (charts)', () => {
  afterAll(() => SnapshotService.resetInMemoryCache());

  it('history is oldest-first and always ends with the live counts for today', async () => {
    SnapshotService.resetInMemoryCache();
    const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
    await SnapshotService.captureDailySnapshot(DataService.getInstance(), day(5));
    await SnapshotService.captureDailySnapshot(DataService.getInstance(), day(90)); // outside a 30-day window

    const { body } = await get('/api/continuity/history?days=30');
    expect(body.days).toBe(30);
    expect(body.points.map((p: any) => p.date)).toEqual([day(5), day(0)]);
    expect(body.points.at(-1)).toEqual({ date: day(0), covered: 1, exposed: 3, unknown: 0, total: 4 });
  });

  it('demo history back-fills the window without overwriting real snapshots', async () => {
    SnapshotService.resetInMemoryCache();
    const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
    const real = await SnapshotService.captureDailySnapshot(DataService.getInstance(), day(10));
    real.headline = { ...real.headline, coveredCount: 4, exposedCount: 0 };

    expect(await SnapshotService.seedDemoHistory(DataService.getInstance(), 60)).toBe(59);
    const { body } = await get('/api/continuity/history?days=60');
    expect(body.points).toHaveLength(61);
    expect(body.points.find((p: any) => p.date === day(10))).toMatchObject({ covered: 4, exposed: 0 });
    for (const p of body.points) expect(p.covered + p.exposed + p.unknown).toBe(p.total);
  });

  it('groups failing checks by cause, counting distinct assets', async () => {
    const { exposureByCause } = (await get('/api/continuity/overview')).body;
    expect(exposureByCause.map((c: any) => c.checkId).sort()).toEqual(
      ['C1_UNBACKED_CRITICAL', 'C2_DEPARTED_OWNER', 'C3_UNDOCUMENTED_CRITICAL', 'C4_MISSING_FALLBACK', 'C5_KEY_OUTLIVES_OWNER'],
    );
    // Fixture: 101, 102 and 104 are critical with no backup.
    expect(exposureByCause.find((c: any) => c.checkId === 'C1_UNBACKED_CRITICAL')).toMatchObject({ label: 'One owner, no backup', assets: 3 });
    const counts = exposureByCause.map((c: any) => c.assets);
    expect(counts).toEqual([...counts].sort((a: number, b: number) => b - a));
  });
});

describe('GET /api/assets reports real evidence (UI-04)', () => {
  let rows: Record<string, any>;
  beforeAll(async () => {
    const { body } = await get('/api/assets');
    rows = Object.fromEntries(body.assets.map((a: any) => [a.id, a]));
  });

  it('missing facts are unknown — never "0", "medium" or a guessed source', () => {
    const a104 = rows['automation:n8n:104'];
    expect(a104.documented).toMatchObject({ state: 'unknown', grade: 'unknown', source: null });
    expect(a104.fallback).toMatchObject({ state: 'unknown', grade: 'unknown', source: null });
    expect(a104.runsPerWeek).toMatchObject({ state: 'value', display: '350' });
  });

  it('backup evidence comes from the backs_up edge (grade, source, since-date)', () => {
    expect(rows['automation:n8n:103'].backup).toMatchObject({
      state: 'value',
      display: 'Chen Wei',
      grade: 'confirmed',
      source: 'attestation',
      observedAt: '2025-01-01T00:00:00.000Z',
    });
    expect(rows['automation:n8n:101'].backup).toMatchObject({ state: 'none', grade: 'unknown' }); // no backup on record
  });

  it('owner evidence comes from the owns edge, not a blanket "confirmed / n8n / now"', () => {
    const owner = rows['automation:n8n:101'].owner;
    expect(owner.state).toBe('value');
    expect(owner.display).toBe('Omar Farooq');
    expect(owner.observedAt).not.toBeNull();
    expect(Date.now() - new Date(owner.observedAt).getTime()).toBeGreaterThan(60_000); // a recorded date, not "now"
  });

  it('a recorded false is a real "none" with its evidence', () => {
    expect(rows['automation:n8n:102'].documented).toMatchObject({ state: 'none', display: 'Undocumented', grade: 'confirmed' });
  });
});

describe('GET /api/continuity/spof-assets (B-04)', () => {
  it('lists critical/high assets hanging on one person, critical first then by weekly runs', async () => {
    const { assets } = (await get('/api/continuity/spof-assets?limit=5')).body;
    expect(assets.map((a: any) => a.asset.id)).toEqual(['automation:n8n:101', 'automation:n8n:104', 'automation:n8n:102']);
    expect(assets[0]).toMatchObject({
      dependsOn: { id: 'person:omar@acme.com', name: 'Omar Farooq' },
      runsPerWeek: 500,
    });
    expect(assets[0].reason).toContain('no backup');
    // 103 has a backup; 105 is only medium.
    expect(assets.some((a: any) => ['automation:n8n:103', 'automation:n8n:105'].includes(a.asset.id))).toBe(false);
  });

  it('respects the limit', async () => {
    expect((await get('/api/continuity/spof-assets?limit=1')).body.assets).toHaveLength(1);
  });
});

describe('GET /api/nav-counts (B-05)', () => {
  it('counts open departures due within 30 days, open critical actions, and pending identities for admins', async () => {
    const { status, body } = await get('/api/nav-counts');
    expect(status).toBe(200);
    expect(body.departuresSoon).toBe(1); // seeded Sarah departure (past leave date, still open)
    expect(body.openCriticalActions).toBeGreaterThanOrEqual(3); // 101, 102, 104 lack backups
    expect(body.identityPending).toBe(1); // seeded D. Miller queue item
  });

  it('hides the identity count from non-admins as null, not 0', async () => {
    expect((await get('/api/nav-counts', 'user:maya')).body.identityPending).toBeNull();
  });
});

describe('GET /api/changes/summary (B-03)', () => {
  it('first visit: last 7 days, counts what is tracked and says null for what is not', async () => {
    const { status, body } = await get('/api/changes/summary', 'user:chen');
    expect(status).toBe(200);
    expect(body.sinceKind).toBe('first_visit_window');
    expect(Date.now() - new Date(body.since).getTime()).toBeGreaterThan(6.9 * 86_400_000);
    // Sarah's departure event carries its real date (Jan 2025), so nobody left in the last 7 days.
    // (Before D12 the seed was dated "a day before server start" and this read 1.)
    expect(body).toMatchObject({ peopleLeft: 0, backupsLost: null, newlyExposed: null, resolved: 0 });
  });

  it('after signing in again, "since" is the previous sign-in', async () => {
    process.env.AUTH_DEV_LOGIN = 'true';
    try {
      const signIn = () =>
        fetch(`${baseUrl}/api/auth/dev/sign-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'maya@acme.com' }),
        });
      await signIn();
      await new Promise((r) => setTimeout(r, 15));
      const second = await signIn();
      const cookie = second.headers.getSetCookie()[0].split(';')[0];
      const body = (await (await fetch(`${baseUrl}/api/changes/summary`, { headers: { cookie } })).json()) as any;
      expect(body.sinceKind).toBe('last_sign_in');
      expect(Date.now() - new Date(body.since).getTime()).toBeLessThan(60_000);
      expect(body.peopleLeft).toBe(0); // the seeded departure event is older than the last sign-in
    } finally {
      delete process.env.AUTH_DEV_LOGIN;
    }
  });
});
