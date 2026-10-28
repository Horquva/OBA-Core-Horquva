import { describe, it, expect, beforeEach } from 'vitest';
import { DataService } from '../../src/services/dataService.js';
import { SnapshotService } from '../../src/services/snapshot/snapshotService.js';
import { changeSummaryFor } from '../../src/views/overviewViews.js';
import { ContinuityGraph } from '../../src/domain/graph/index.js';
import type { CanonicalEntity, CanonicalFact, EntityKind, FactAttribute } from '@horquva/types';

describe('TRD-01 / G-21: Daily Continuity Snapshot Service', () => {
  let ds: DataService;

  beforeEach(() => {
    ds = DataService.resetInstance();
    SnapshotService.resetInMemoryCache();
  });

  it('computes accurate headline metrics and concentrations from active graph', () => {
    const metrics = SnapshotService.computeMetrics(ds);

    expect(metrics.headline).toBeDefined();
    expect(metrics.headline.coveredCount).toBeGreaterThanOrEqual(0);
    expect(metrics.headline.totalCriticalAssets).toBeGreaterThan(0);
    expect(metrics.headline.unconfirmedFacts).toBeGreaterThan(0);
    expect(Array.isArray(metrics.teamConcentration)).toBe(true);
    expect(Array.isArray(metrics.automationFailures)).toBe(true);
  });

  it('captures and retrieves daily snapshots', async () => {
    const today = '2026-10-23';
    const snapshot = await SnapshotService.captureDailySnapshot(ds, today);

    expect(snapshot.id).toBeDefined();
    expect(snapshot.snapshotDate).toBe(today);
    expect(snapshot.headline.totalCriticalAssets).toBeGreaterThan(0);

    const retrieved = await SnapshotService.getSnapshot(today);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.snapshotDate).toBe(today);
  });

  it('retrieves the latest snapshot on or before a given date', async () => {
    await SnapshotService.captureDailySnapshot(ds, '2026-10-20');
    await SnapshotService.captureDailySnapshot(ds, '2026-10-22');

    const match1 = await SnapshotService.getLatestSnapshotBefore('2026-10-21');
    expect(match1?.snapshotDate).toBe('2026-10-20');

    const match2 = await SnapshotService.getLatestSnapshotBefore('2026-10-23');
    expect(match2?.snapshotDate).toBe('2026-10-22');
  });

  it('accurately diffs snapshots to compute backupsLost and newlyExposed', () => {
    const earlier = {
      id: '1',
      snapshotDate: '2026-10-15',
      headline: {
        coveredCount: 8,
        exposedCount: 2,
        unknownCount: 1,
        totalCriticalAssets: 11,
        ownerlessAssets: 0,
        openHandovers: 1,
        unconfirmedFacts: 10,
      },
      teamConcentration: [],
      automationFailures: [],
      createdAt: '2026-10-15T00:00:00Z',
    };

    const later = {
      id: '2',
      snapshotDate: '2026-10-22',
      headline: {
        coveredCount: 5, // 3 covered lost
        exposedCount: 5, // 3 newly exposed
        unknownCount: 1,
        totalCriticalAssets: 11,
        ownerlessAssets: 1,
        openHandovers: 2,
        unconfirmedFacts: 12,
      },
      teamConcentration: [],
      automationFailures: [],
      createdAt: '2026-10-22T00:00:00Z',
    };

    const diff = SnapshotService.diffSnapshots(earlier, later);
    expect(diff.backupsLost).toBe(3);
    expect(diff.newlyExposed).toBe(3);
  });

  it('populates backupsLost and newlyExposed in changeSummaryFor when snapshots exist', async () => {
    const adminUser = ds.getUserById('user:admin')!;
    // A fixed clock: with the real one, the 7-day window drifts past the
    // hard-coded snapshot dates and the test starts failing on its own.
    const now = new Date('2026-10-23T12:00:00Z');

    // Initial check without past snapshots: backupsLost and newlyExposed are null
    const summaryBefore = await changeSummaryFor(ds, adminUser, now);
    expect(summaryBefore.backupsLost).toBeNull();
    expect(summaryBefore.newlyExposed).toBeNull();

    // Create a snapshot for the past visit date and today
    const pastDate = summaryBefore.since.slice(0, 10);
    const pastSnapshot = await SnapshotService.captureDailySnapshot(ds, pastDate);
    // Simulate past snapshot had 1 more covered and 1 less exposed
    pastSnapshot.headline.coveredCount += 1;
    pastSnapshot.headline.exposedCount -= 1;

    await SnapshotService.captureDailySnapshot(ds, '2026-10-23');

    const summaryAfter = await changeSummaryFor(ds, adminUser, now);
    expect(summaryAfter.backupsLost).toBe(1);
    expect(summaryAfter.newlyExposed).toBe(1);
  });
});

describe('snapshot counts for keys and third-party apps', () => {
  const entity = (id: string, kind: EntityKind, externalRefs: Record<string, string> = {}): CanonicalEntity => ({
    id, kind, name: id, externalRefs, createdAt: new Date(), updatedAt: new Date(),
  });
  const fact = (entityId: string, attribute: FactAttribute, value: unknown): CanonicalFact => ({
    entityId, attribute, value, grade: 'stated', source: 'connector:test', validFrom: new Date(),
  });
  const metricsFor = (entities: CanonicalEntity[], facts: CanonicalFact[]) => {
    const graph = ContinuityGraph.fromSnapshot(entities, [], facts);
    const ds = { getGraph: () => graph, getDepartures: () => [], getChangeEvents: () => [] } as unknown as DataService;
    return SnapshotService.computeMetrics(ds).headline;
  };

  it('counts a service-account key as owned and skips third-party apps', () => {
    const headline = metricsFor(
      [
        entity('credential:openai:svc', 'credential'),
        entity('credential:openai:nobody', 'credential'),
        entity('app:entra:vendor', 'app', { thirdParty: 'true' }),
        entity('app:entra:ours', 'app'),
      ],
      [fact('credential:openai:svc', 'owner_type', 'service_account')]
    );
    // Only the unowned key and our own unowned app.
    expect(headline.ownerlessAssets).toBe(2);
  });

  it('does not count vendor telemetry as unconfirmed facts', () => {
    const headline = metricsFor(
      [entity('credential:openai:k1', 'credential')],
      [
        fact('credential:openai:k1', 'last_used_at', '2026-10-27T10:00:00Z'),
        fact('credential:openai:k1', 'cost_30d_usd', 12.5),
        fact('credential:openai:k1', 'owner_type', 'user'),
        fact('credential:openai:k1', 'status', 'active'),
      ]
    );
    expect(headline.unconfirmedFacts).toBe(1); // status only
  });
});
