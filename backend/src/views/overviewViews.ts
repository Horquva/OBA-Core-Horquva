// =============================================================================
// Horquva Continuity Platform — Overview read models (UI-01)
// =============================================================================
// Backs the Overview hero sentence, the "single points of failure" card and the
// sidebar badges. Every number is counted from records; anything the platform
// does not track yet is null (shown as "not tracked"), never a guessed 0.
// =============================================================================

import type { DataService, UserAccount } from '../services/dataService.js';
import { criticalityView } from './factViews.js';

const DAY_MS = 86_400_000;
export const FIRST_VISIT_WINDOW_DAYS = 7;
export const DEPARTURES_SOON_DAYS = 30;

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
