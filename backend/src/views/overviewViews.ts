// =============================================================================
// Horquva Continuity Platform — Overview read models (UI-01)
// =============================================================================
// Backs the Overview hero sentence, the "single points of failure" card and the
// sidebar badges. Every number is counted from records; anything the platform
// does not track yet is null (shown as "not tracked"), never a guessed 0.
// =============================================================================

import type { DataService, UserAccount } from '../services/dataService.js';
import type { CheckResult, HeadlineMetrics } from '@horquva/types';
import { criticalityView } from './factViews.js';

const DAY_MS = 86_400_000;
export const FIRST_VISIT_WINDOW_DAYS = 7;
export const DEPARTURES_SOON_DAYS = 30;
export const TREND_WINDOW_DAYS = 7;

// ── Change summary: "since your last sign-in" ─────────────────────────────

export interface ChangeSummary {
  since: string;
  /** How `since` was chosen, so the UI can word it honestly. */
  sinceKind: 'last_sign_in' | 'first_visit_window';
  peopleLeft: number;
  /** Not tracked until backup changes are diffed between snapshots. */
  backupsLost: number | null;
  /** Not tracked until daily snapshots exist (TRD-01). */
  newlyExposed: number | null;
  resolved: number;
}

/**
 * `since` is the user's previous sign-in (the most recent one is the current
 * session). With no earlier sign-in, the last 7 days. Deterministic and
 * side-effect free, so refreshes and double renders don't reset it.
 */
export async function changeSummaryFor(ds: DataService, user: UserAccount, now: Date = new Date()): Promise<ChangeSummary> {
  const signIns = ds
    .getAuditLog({ action: 'SIGN_IN' })
    .filter((e) => e.actor === user.id)
    .map((e) => e.at); // newest first
  const previous = signIns[1];
  const since = previous ?? new Date(now.getTime() - FIRST_VISIT_WINDOW_DAYS * DAY_MS).toISOString();
  const sinceMs = new Date(since).getTime();
  const after = (iso: string | null | undefined) => !!iso && new Date(iso).getTime() >= sinceMs;

  let backupsLost: number | null = null;
  let newlyExposed: number | null = null;

  try {
    const { SnapshotService } = await import('../services/snapshot/snapshotService.js');
    const pastSnapshot = await SnapshotService.getLatestSnapshotBefore(since);
    const latestSnapshot = await SnapshotService.getLatestSnapshotBefore(now.toISOString());

    if (pastSnapshot && latestSnapshot && pastSnapshot.snapshotDate !== latestSnapshot.snapshotDate) {
      const diff = SnapshotService.diffSnapshots(pastSnapshot, latestSnapshot);
      backupsLost = diff.backupsLost;
      newlyExposed = diff.newlyExposed;
    }
  } catch {
    // If snapshot service unavailable, retain honest null
  }

  return {
    since,
    sinceKind: previous ? 'last_sign_in' : 'first_visit_window',
    peopleLeft: ds.getChangeEvents().filter((c) => c.kind === 'person_left' && after(c.detectedAt)).length,
    backupsLost,
    newlyExposed,
    resolved: [...ds.getAllActionOverrides().values()].filter((a) => a.status === 'resolved' && after(a.resolvedAt)).length,
  };
}

// ── Coverage trend: today vs. the stored snapshot a week ago ──────────────

export interface CoverageTrend {
  /** Date (YYYY-MM-DD) of the snapshot the deltas are measured against. */
  comparedTo: string;
  covered: number;
  exposed: number;
  unknown: number;
}

/**
 * Counted deltas between the live headline and the latest daily snapshot at least
 * TREND_WINDOW_DAYS old. Null until such a snapshot exists: no history, no trend.
 */
export async function coverageTrend(current: HeadlineMetrics, now: Date = new Date()): Promise<CoverageTrend | null> {
  try {
    const { SnapshotService } = await import('../services/snapshot/snapshotService.js');
    const cutoff = new Date(now.getTime() - TREND_WINDOW_DAYS * DAY_MS).toISOString();
    const past = await SnapshotService.getLatestSnapshotBefore(cutoff);
    if (!past) return null;
    return {
      comparedTo: past.snapshotDate,
      covered: current.fullyCoveredCriticalAssets - past.headline.coveredCount,
      exposed: current.exposedCriticalAssets - past.headline.exposedCount,
      unknown: current.unknownCriticalAssets - past.headline.unknownCount,
    };
  } catch {
    return null;
  }
}

// ── Coverage history: one point per stored daily snapshot, plus today ─────

export interface HistoryPoint {
  date: string; // YYYY-MM-DD
  covered: number;
  exposed: number;
  unknown: number;
  total: number;
}

export const HISTORY_MAX_DAYS = 180;

/** Oldest first. Today's point is the live headline, so the line always ends at what the page shows. */
export async function coverageHistory(current: HeadlineMetrics, days: number, now: Date = new Date()): Promise<HistoryPoint[]> {
  const { SnapshotService } = await import('../services/snapshot/snapshotService.js');
  const today = now.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - days * DAY_MS).toISOString().slice(0, 10);
  const points: HistoryPoint[] = (await SnapshotService.listSnapshots(days + 1))
    .filter((s) => s.snapshotDate >= from && s.snapshotDate < today)
    .map((s) => ({
      date: s.snapshotDate,
      covered: s.headline.coveredCount,
      exposed: s.headline.exposedCount,
      unknown: s.headline.unknownCount,
      total: s.headline.totalCriticalAssets,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  points.push({
    date: today,
    covered: current.fullyCoveredCriticalAssets,
    exposed: current.exposedCriticalAssets,
    unknown: current.unknownCriticalAssets,
    total: current.totalCriticalAssets,
  });
  return points;
}

// ── Exposure by cause: failing checks grouped by what is missing ──────────

export interface ExposureCause {
  checkId: string;
  label: string;
  /** Distinct assets failing this check. One asset can fail several, so causes don't sum to "exposed". */
  assets: number;
}

const CAUSE_LABEL: Record<string, string> = {
  C1_UNBACKED_CRITICAL: 'One owner, no backup',
  C2_DEPARTED_OWNER: 'Owner has left',
  C3_UNDOCUMENTED_CRITICAL: 'Undocumented',
  C4_MISSING_FALLBACK: 'No fallback',
  C5_KEY_OUTLIVES_OWNER: 'Key outlives its owner',
};

/** Every known cause is listed (zero included), largest first. */
export function exposureByCause(checks: CheckResult[]): ExposureCause[] {
  const assetsByCheck = new Map<string, Set<string>>(Object.keys(CAUSE_LABEL).map((id) => [id, new Set<string>()]));
  for (const c of checks) {
    if (c.status !== 'FAIL') continue;
    if (!assetsByCheck.has(c.checkId)) assetsByCheck.set(c.checkId, new Set());
    assetsByCheck.get(c.checkId)!.add(c.entityId);
  }
  return [...assetsByCheck.entries()]
    .map(([checkId, ids]) => ({ checkId, label: CAUSE_LABEL[checkId] ?? checkId, assets: ids.size }))
    .sort((a, b) => b.assets - a.assets || a.label.localeCompare(b.label));
}

// ── Single points of failure ──────────────────────────────────────────────

export interface SpofAsset {
  asset: { id: string; kind: string; name: string };
  reason: string;
  dependsOn: { id: string; kind: string; name: string };
  runsPerWeek: number | null;
}

const CRIT_ORDER: Record<string, number> = { critical: 0, high: 1 };

/**
 * Critical/high assets that hang on exactly one person: a sole owner with no
 * backup, or an automation running on someone's personal credentials. Lists
 * assets, never ranks people (SEC-07). Ordered: critical before high, then
 * weekly runs (unknown last), then name.
 */
export function spofAssets(ds: DataService, limit: number): SpofAsset[] {
  const graph = ds.getGraph();
  const out: Array<SpofAsset & { crit: string }> = [];

  for (const node of graph.getAllNodes()) {
    const crit = criticalityView(node.facts.get('criticality')).level;
    if (crit !== 'critical' && crit !== 'high') continue;
    const asset = { id: node.entity.id, kind: node.entity.kind, name: node.entity.name };
    const runsFact = node.facts.get('run_volume_weekly');
    const runsPerWeek = runsFact && runsFact.grade !== 'unknown' && typeof runsFact.value === 'number' ? runsFact.value : null;

    const owners = graph.getOwners(asset.id);
    const backups = graph.getBackups(asset.id);
    const credentialEdge = graph
      .getEdgesForEntity(asset.id)
      .find((e) => e.type === 'runs_on_credentials_of' && e.fromId === asset.id);
    const credentialOwner = credentialEdge ? graph.getNode(credentialEdge.toId)?.entity : undefined;

    let dependsOn: { id: string; kind: string; name: string } | null = null;
    let reason = '';
    if (owners.length === 1 && backups.length === 0) {
      const o = owners[0];
      dependsOn = { id: o.id, kind: o.kind, name: o.name };
      reason = `Only ${o.name} owns it and no backup is on record.`;
    } else if (credentialOwner) {
      dependsOn = { id: credentialOwner.id, kind: credentialOwner.kind, name: credentialOwner.name };
      reason = `Runs on ${credentialOwner.name}'s personal credentials.`;
    }
    if (dependsOn) out.push({ asset, reason, dependsOn, runsPerWeek, crit });
  }

  out.sort(
    (a, b) =>
      CRIT_ORDER[a.crit] - CRIT_ORDER[b.crit] ||
      (b.runsPerWeek ?? -1) - (a.runsPerWeek ?? -1) ||
      a.asset.name.localeCompare(b.asset.name)
  );
  return out.slice(0, limit).map(({ crit: _crit, ...rest }) => rest);
}

// ── Sidebar badge counts ──────────────────────────────────────────────────

export interface NavCounts {
  departuresSoon: number;
  openCriticalActions: number;
  /** Identity review is admin-only; null for everyone else (not a 0). */
  identityPending: number | null;
}

export async function navCountsFor(
  ds: DataService,
  user: UserAccount,
  openActions: Array<{ status: string; asset: { id: string } }>,
  now: Date = new Date()
): Promise<NavCounts> {
  const horizon = now.getTime() + DEPARTURES_SOON_DAYS * DAY_MS;
  const graph = ds.getGraph();
  const isCritical = (id: string) => {
    const level = criticalityView(graph.getNode(id)?.facts.get('criticality')).level;
    return level === 'critical' || level === 'high';
  };

  return {
    departuresSoon: ds.getDepartures().filter((d) => d.stage !== 'verified' && new Date(d.leaveDate).getTime() <= horizon).length,
    openCriticalActions: openActions.filter((a) => (a.status === 'open' || a.status === 'in_progress') && isCritical(a.asset.id)).length,
    identityPending: user.role === 'admin' ? (await ds.getQueueService().listQueue({ status: 'pending' })).length : null,
  };
}
