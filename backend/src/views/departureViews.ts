// =============================================================================
// Horquva Continuity Platform — Departure read models
// =============================================================================
// One summary shape for the Departures list, the Overview and the executive PDF,
// so every surface groups and flags a departure the same way.
// =============================================================================

import type { DataService, DepartureRecord } from '../services/dataService.js';
import { isVendorKey } from '../domain/keys.js';

/** The person's team from a `member_of` edge; null when the graph doesn't say (never a guess). */
function teamOf(personId: string, dataService: DataService): string | null {
  const graph = dataService.getGraph();
  const edge = graph
    .getEdgesForEntity(personId)
    .find((e) => e.type === 'member_of' && e.fromId === personId && graph.getNode(e.toId)?.entity?.kind === 'group');
  return edge ? graph.getNode(edge.toId)?.entity?.name ?? null : null;
}

export function departureSummary(dep: DepartureRecord, dataService: DataService) {
  const graph = dataService.getGraph();
  const personNode = graph.getNode(dep.personId);
  const person = personNode?.entity
    ? { id: personNode.entity.id, kind: personNode.entity.kind, name: personNode.entity.name }
    : { id: dep.personId, kind: 'person' as const, name: dep.personId.replace('person:', '') };

  const assetsTotal = dep.handovers.length;
  const assetsHandedOver = dep.handovers.filter((h) => h.acceptance === 'accepted').length;

  // departed: the leave date passed or the account is already disabled/verified.
  // in_handover: a successor has been named or asked. upcoming: nothing started yet.
  const leftAlready =
    new Date(dep.leaveDate).getTime() < Date.now() || dep.stage === 'account_disabled' || dep.stage === 'verified';
  const handoverStarted = dep.handovers.some((h) => h.successorId !== null || h.acceptance !== 'none');
  const group: 'upcoming' | 'in_handover' | 'departed' = leftAlready
    ? 'departed'
    : handoverStarted
      ? 'in_handover'
      : 'upcoming';

  // Has alert if any handover is for a critical asset without an accepted successor
  let hasAlert = false;
  for (const h of dep.handovers) {
    const node = graph.getNode(h.assetId);
    const crit = node?.facts.get('criticality')?.value;
    if ((crit === 'critical' || crit === 'high') && h.acceptance !== 'accepted') {
      hasAlert = true;
      break;
    }
  }

  return {
    id: dep.id,
    person,
    role: personNode?.entity?.description || null,
    team: teamOf(dep.personId, dataService),
    leaveDate: dep.leaveDate,
    stage: dep.stage,
    assetsTotal,
    assetsHandedOver,
    hasAlert,
    detectedFrom: dep.detectedFrom,
    group,
  };
}

// ── Work at risk: what departing people leave behind without cover ───────────

export interface AtRiskAsset {
  asset: { id: string; kind: string; name: string };
  criticality: string | null;
  owner: { id: string; kind: string; name: string };
  departureId: string;
  leaveDate: string;
  /** null = not recorded (never shown as 0). */
  runsPerWeek: number | null;
  /** No accepted successor yet (critical/high assets only). */
  noSuccessor: boolean;
  /** Runs on the leaver's own credentials: it stops when their account is disabled. */
  personalCredential: boolean;
  /** An AI vendor key the leaver owns: rotate or revoke it (no successor). */
  vendorKey: boolean;
  successor: { id: string; kind: string; name: string } | null;
  acceptance: 'none' | 'requested' | 'accepted' | 'declined' | null;
}

export interface WorkAtRisk {
  assets: AtRiskAsset[];
  totals: {
    assets: number;
    /** Sum of the recorded weekly runs; assets without a count are in `unknownRuns`. */
    runsPerWeek: number;
    unknownRuns: number;
    personalCredential: number;
    /** AI vendor keys open leavers own. */
    keys: number;
    people: number;
  };
}

const CRIT_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * Across every departure still open: critical/high assets without an accepted successor,
 * plus anything running on the leaver's credentials. Soonest leaver first.
 */
export function workAtRisk(ds: DataService): WorkAtRisk {
  const graph = ds.getGraph();
  const ref = (id: string) => {
    const e = graph.getNode(id)?.entity;
    return e ? { id: e.id, kind: e.kind, name: e.name } : { id, kind: 'automation', name: id };
  };
  const factOf = (id: string, attr: string) => graph.getNode(id)?.facts.get(attr as any)?.value;

  const rows = new Map<string, AtRiskAsset>();
  for (const dep of ds.getDepartures()) {
    if (departureSummary(dep, ds).group === 'departed') continue;
    const owner = ref(dep.personId);
    const row = (assetId: string): AtRiskAsset => {
      const key = `${dep.id}|${assetId}`;
      let r = rows.get(key);
      if (!r) {
        const crit = factOf(assetId, 'criticality');
        const runs = factOf(assetId, 'run_volume_weekly');
        r = {
          asset: ref(assetId),
          criticality: typeof crit === 'string' ? crit : null,
          owner,
          departureId: dep.id,
          leaveDate: dep.leaveDate,
          runsPerWeek: typeof runs === 'number' ? runs : null,
          noSuccessor: false,
          personalCredential: false,
          vendorKey: false,
          successor: null,
          acceptance: null,
        };
        rows.set(key, r);
      }
      return r;
    };

    for (const h of dep.handovers) {
      const crit = factOf(h.assetId, 'criticality');
      if ((crit === 'critical' || crit === 'high') && h.acceptance !== 'accepted') {
        const r = row(h.assetId);
        r.noSuccessor = true;
        r.successor = h.successorId ? ref(h.successorId) : null;
        r.acceptance = h.acceptance;
      }
    }
    for (const e of graph.getAllEdges()) {
      if (e.type === 'runs_on_credentials_of' && e.toId === dep.personId && !e.validTo) row(e.fromId).personalCredential = true;
    }
    for (const key of graph.getOwnedAssets(dep.personId, { includeVendorKeys: true })) {
      if (isVendorKey(key.id)) row(key.id).vendorKey = true;
    }
  }

  const assets = [...rows.values()].sort(
    (a, b) =>
      a.leaveDate.localeCompare(b.leaveDate) ||
      (CRIT_RANK[a.criticality ?? ''] ?? 9) - (CRIT_RANK[b.criticality ?? ''] ?? 9) ||
      (b.runsPerWeek ?? -1) - (a.runsPerWeek ?? -1),
  );
  return {
    assets,
    totals: {
      assets: assets.length,
      runsPerWeek: assets.reduce((n, a) => n + (a.runsPerWeek ?? 0), 0),
      unknownRuns: assets.filter((a) => a.runsPerWeek === null).length,
      personalCredential: assets.filter((a) => a.personalCredential).length,
      keys: assets.filter((a) => a.vendorKey).length,
      people: new Set(assets.map((a) => a.owner.id)).size,
    },
  };
}
