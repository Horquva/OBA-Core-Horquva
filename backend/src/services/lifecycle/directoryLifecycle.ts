// =============================================================================
// Horquva Continuity Platform — Leavers and movers from the directory
// =============================================================================
// After an Entra or Google sync, the graph before the sync is diffed with the
// graph after it. Who left, came back or moved becomes a change event. A
// leaver is only ever SUGGESTED: the event links to the departure form,
// prefilled, and an admin decides. Nothing here creates a departure.
//
// Baseline rule: a connection's first completed sync only establishes what is
// true; everyone already disabled then is not news. (The orphan scan and C5
// report those, without a leaver event.)
// =============================================================================

import type { ChangeEvent, ChangeEventKind } from '@horquva/types';
import type { ContinuityGraph } from '../../domain/graph/index.js';
import { DiffEngine } from '../../domain/changes/diffEngine.js';
import type { DataService } from '../dataService.js';

export type DirectoryType = 'entra' | 'google';
const LIFECYCLE: ReadonlySet<ChangeEventKind> = new Set<ChangeEventKind>(['person_left', 'person_reenabled', 'person_moved']);
const SOURCE: Record<DirectoryType, { label: string; ref: string }> = {
  entra: { label: 'Entra', ref: 'entraId' },
  google: { label: 'Google', ref: 'googleId' },
};

const factsOf = (graph: ContinuityGraph) => graph.getAllNodes().flatMap((n) => [...n.facts.values()]);

/** The lifecycle events between two graphs, for people this directory knows. Pure. */
export function lifecycleChanges(previous: ContinuityGraph, current: ContinuityGraph, directory: DirectoryType): ChangeEvent[] {
  const ref = SOURCE[directory].ref;
  return DiffEngine.detectChanges({
    previousGraph: previous,
    currentGraph: current,
    previousFacts: factsOf(previous),
    currentFacts: factsOf(current),
  }).filter((c) => LIFECYCLE.has(c.kind) && !!c.entityId && !!current.getNode(c.entityId)?.entity.externalRefs?.[ref]);
}

/** The change-feed entry for one lifecycle event. */
export function toFeedEvent(change: ChangeEvent, current: ContinuityGraph, directory: DirectoryType): { kind: string; title: string; impact: string; href: string | null } {
  const personId = change.entityId!;
  const name = current.getNode(personId)?.entity.name ?? personId;
  const label = SOURCE[directory].label;
  const detectedAt = change.detectedAt.toISOString();
  const assets = current.getOwnedAssets(personId, { includeVendorKeys: true }).length;
  const holds = assets ? `They own ${assets} system${assets === 1 ? '' : 's'} on record.` : 'Nothing on record is owned by them.';

  switch (change.kind) {
    case 'person_left':
      return {
        kind: change.kind,
        title: `Possible leaver: ${name} (${label})`,
        impact: `${label} reports this account as gone. ${holds} Record a departure to start the handover.`,
        href: `/departures?record=${encodeURIComponent(personId)}&source=${directory}&detectedAt=${encodeURIComponent(detectedAt)}`,
      };
    case 'person_reenabled':
      return {
        kind: change.kind,
        title: `Account re-enabled: ${name} (${label})`,
        impact: `${label} reports this account as active again. Check any open departure for them.`,
        href: `/people/${personId}`,
      };
    default: {
      const before = change.beforeState ?? {};
      const after = change.afterState ?? {};
      const parts = [
        before.department && after.department ? `${before.department} → ${after.department}` : null,
        before.managerId && after.managerId
          ? `now reports to ${current.getNode(after.managerId)?.entity.name ?? after.managerId}`
          : null,
      ].filter(Boolean);
      return {
        kind: change.kind,
        title: `Moved: ${name} (${label})`,
        impact: `${parts.join('; ')}. ${holds} Check whether their systems should move with them.`,
        href: `/people/${personId}`,
      };
    }
  }
}

/**
 * Records the lifecycle events of one directory sync in the change feed.
 * `isBaseline` is true on the connection's first completed sync. Returns the
 * events recorded.
 */
export function recordDirectoryLifecycle(
  ds: DataService,
  previous: ContinuityGraph,
  directory: DirectoryType,
  isBaseline: boolean
): ChangeEvent[] {
  if (isBaseline) return [];
  const current = ds.getGraph();
  const changes = lifecycleChanges(previous, current, directory);
  for (const change of changes) ds.addChangeEvent(toFeedEvent(change, current, directory));
  return changes;
}
