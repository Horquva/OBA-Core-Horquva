// =============================================================================
// Horquva Continuity Platform — Orphan scan
// =============================================================================
// What is already orphaned today, on the first sync, without waiting for a
// leaver event: keys and automations still tied to people who have gone, app
// secrets about to expire with nobody to rotate them, and owners the
// directory doesn't know.
//
// Pure: it reads a ContinuityGraph and the inputs it is given, never the
// database, so the API and the customer-run CLI (scripts/orphanScan.ts) share
// it. There is no score or index (MVP rule): a ranked list of findings.
// =============================================================================

import type { CanonicalEntity, EntityKind } from '@horquva/types';
import type { ContinuityGraph } from '../../domain/graph/index.js';
import { KeyOutlivesOwnerCheck, isVendorKey } from '../../domain/checks/index.js';

export type OrphanFindingKind = 'key_owner_gone' | 'automation_on_gone_identity' | 'app_secret_expiring_unowned' | 'owner_not_in_directory';
export type OrphanSeverity = 'high' | 'medium' | 'low';
/** Why an owner counts as gone (or, for owner_not_in_directory, unverified). */
export type OwnerReason =
  | 'account_disabled'
  | 'leave_date_passed'
  | 'departure_recorded'
  /** Marked departed by a source that doesn't say why (e.g. a CSV status column). */
  | 'marked_departed'
  | 'lost_project_access'
  | 'not_in_directory';

export interface OrphanFinding {
  kind: OrphanFindingKind;
  severity: OrphanSeverity;
  asset: { id: string; kind: EntityKind; name: string; vendor: string | null };
  owner: { id: string; name: string; reason: OwnerReason } | null;
  cost30dUsd: number | null;
  lastUsedAt: string | null;
  evidence: string[];
}

export interface OrphanScanResult {
  scannedAt: string;
  directoryConnected: boolean;
  connectionsScanned: Array<{ id: string; type: string; name: string }>;
  totals: { byKind: Record<OrphanFindingKind, number>; monthlyCostUsd: number };
  findings: OrphanFinding[];
}

export interface OrphanScanInputs {
  /** Recorded departures, for the `departure_recorded` reason. */
  departures?: Array<{ personId: string }>;
  connectionsScanned?: Array<{ id: string; type: string; name: string }>;
  /** Whether any directory (Entra / Google) was scanned. Defaults to: the graph holds a directory person. */
  directoryConnected?: boolean;
}

const EXPIRY_WINDOW_MS = 30 * 86_400_000;
const SEVERITY: Record<OrphanFindingKind, OrphanSeverity> = {
  key_owner_gone: 'high',
  automation_on_gone_identity: 'high',
  app_secret_expiring_unowned: 'medium',
  owner_not_in_directory: 'low',
};
const SEVERITY_RANK: Record<OrphanSeverity, number> = { high: 0, medium: 1, low: 2 };

const isDirectoryPerson = (e: CanonicalEntity) => Boolean(e.externalRefs?.entraId || e.externalRefs?.googleId);

/** Vendor timestamps arrive as ISO strings or Unix seconds; anything unreadable is null. */
function isoOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const d = typeof value === 'number' ? new Date(value < 1e11 ? value * 1000 : value) : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function runOrphanScan(graph: ContinuityGraph, now: Date, inputs: OrphanScanInputs = {}): OrphanScanResult {
  const departed = new Set((inputs.departures ?? []).map((d) => d.personId));
  const nodes = graph.getAllNodes();
  const directoryConnected = inputs.directoryConnected ?? nodes.some((n) => n.entity.kind === 'person' && isDirectoryPerson(n.entity));

  const statusOf = (personId: string) => graph.getNode(personId)?.facts.get('status')?.value;
  const isGone = (personId: string) => statusOf(personId) === 'departed';
  const goneReason = (person: CanonicalEntity): OwnerReason => {
    const refs = person.externalRefs ?? {};
    if (refs.accountEnabled === 'false' || refs.suspended === 'true') return 'account_disabled';
    const leave = refs.employeeLeaveDateTime ? new Date(refs.employeeLeaveDateTime) : null;
    if (leave && !Number.isNaN(leave.getTime()) && leave <= now) return 'leave_date_passed';
    if (departed.has(person.id)) return 'departure_recorded';
    return 'marked_departed';
  };

  const findings: OrphanFinding[] = [];
  const add = (kind: OrphanFindingKind, asset: CanonicalEntity, owner: OrphanFinding['owner'], evidence: string[]) => {
    const facts = graph.getNode(asset.id)?.facts;
    const cost = facts?.get('cost_30d_usd')?.value;
    findings.push({
      kind,
      severity: SEVERITY[kind],
      asset: { id: asset.id, kind: asset.kind, name: asset.name, vendor: asset.externalRefs?.vendor ?? asset.id.split(':')[1] ?? null },
      owner,
      cost30dUsd: typeof cost === 'number' && Number.isFinite(cost) ? cost : null,
      lastUsedAt: isoOrNull(facts?.get('last_used_at')?.value),
      evidence,
    });
  };

  for (const { entity, facts } of nodes) {
    const thirdParty = entity.externalRefs?.thirdParty === 'true';

    // 1. A vendor key whose owner has gone: exactly C5's FAIL.
    if (entity.kind === 'credential' && isVendorKey(entity.id)) {
      const check = KeyOutlivesOwnerCheck.evaluate(entity, facts, graph);
      if (check?.status === 'FAIL') {
        const owners = graph.getOwners(entity.id);
        const gone = owners.find((o) => isGone(o.id));
        const lostAccess = facts.get('owner_access')?.value === 'inactive';
        const owner = gone ?? owners[0] ?? null;
        add('key_owner_gone', entity, owner && { id: owner.id, name: owner.name, reason: gone ? goneReason(gone) : 'lost_project_access' }, [
          check.reason,
          ...(lostAccess && gone ? ["The owner also lost access to the key's project."] : []),
        ]);
      }
    }

    // 2. An active automation owned by, or running on the credentials of, someone gone.
    if (entity.kind === 'automation' && facts.get('status')?.value !== 'inactive') {
      const ownedBy = graph.getOwners(entity.id).filter((p) => isGone(p.id));
      const runsAs = graph
        .getEdgesForEntity(entity.id)
        .filter((e) => e.type === 'runs_on_credentials_of' && e.fromId === entity.id && isGone(e.toId))
        .flatMap((e) => graph.getNode(e.toId)?.entity ?? []);
      const first = runsAs[0] ?? ownedBy[0];
      if (first) {
        add('automation_on_gone_identity', entity, { id: first.id, name: first.name, reason: goneReason(first) }, [
          ...runsAs.map((p) => `Runs on the credentials of ${p.name}, who has left.`),
          ...ownedBy.map((p) => `Owned by ${p.name}, who has left.`),
        ]);
      }
    }

    // 3. An app secret expiring within 30 days that no active person owns (needs A4's facts).
    const expires = isoOrNull(facts.get('credential_expires_at')?.value);
    if (entity.kind === 'app' && !thirdParty && expires) {
      const msLeft = new Date(expires).getTime() - now.getTime();
      const owners = graph.getOwners(entity.id);
      if (msLeft >= 0 && msLeft <= EXPIRY_WINDOW_MS && !owners.some((o) => statusOf(o.id) === 'active')) {
        const gone = owners.find((o) => isGone(o.id));
        const days = Math.ceil(msLeft / 86_400_000);
        add('app_secret_expiring_unowned', entity, gone ? { id: gone.id, name: gone.name, reason: goneReason(gone) } : null, [
          `A secret or certificate expires on ${expires.slice(0, 10)} (in ${days} day${days === 1 ? '' : 's'}).`,
          owners.length === 0 ? 'Nobody on record owns this app.' : 'None of its owners is still active.',
        ]);
      }
    }

    // 4. An owner the directory doesn't know: unverified, never "left".
    if (directoryConnected && !thirdParty && (entity.kind === 'automation' || entity.kind === 'credential' || entity.kind === 'app')) {
      const unverified = graph.getOwners(entity.id).find((o) => o.kind === 'person' && !isDirectoryPerson(o) && !isGone(o.id));
      if (unverified) {
        add('owner_not_in_directory', entity, { id: unverified.id, name: unverified.name, reason: 'not_in_directory' }, [
          `${unverified.name} isn't in the connected directory, so whether they still work here can't be checked.`,
        ]);
      }
    }
  }

  // Severity, then the biggest monthly cost, then the most recent use (an orphan still in use is the bigger risk).
  const time = (iso: string | null) => (iso ? new Date(iso).getTime() : -Infinity);
  findings.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      (b.cost30dUsd ?? -Infinity) - (a.cost30dUsd ?? -Infinity) ||
      time(b.lastUsedAt) - time(a.lastUsedAt) ||
      a.asset.name.localeCompare(b.asset.name)
  );

  const byKind: Record<OrphanFindingKind, number> = { key_owner_gone: 0, automation_on_gone_identity: 0, app_secret_expiring_unowned: 0, owner_not_in_directory: 0 };
  const costByAsset = new Map<string, number>();
  for (const f of findings) {
    byKind[f.kind]++;
    if (f.cost30dUsd !== null) costByAsset.set(f.asset.id, f.cost30dUsd); // an asset in two kinds is counted once
  }
  const monthlyCostUsd = Math.round([...costByAsset.values()].reduce((sum, c) => sum + c, 0) * 100) / 100;

  return {
    scannedAt: now.toISOString(),
    directoryConnected,
    connectionsScanned: inputs.connectionsScanned ?? [],
    totals: { byKind, monthlyCostUsd },
    findings,
  };
}

const CSV_COLUMNS = ['severity', 'kind', 'asset_id', 'asset_name', 'asset_kind', 'vendor', 'owner_id', 'owner_name', 'owner_reason', 'cost_30d_usd', 'last_used_at', 'evidence'];

/** One CSV cell. Names come from vendor APIs, so a leading = + - @ is neutralised for spreadsheets. */
function cell(value: string | number | null): string {
  if (value === null) return '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function orphanScanCsv(result: OrphanScanResult): string {
  const rows = result.findings.map((f) =>
    [
      f.severity, f.kind, f.asset.id, f.asset.name, f.asset.kind, f.asset.vendor,
      f.owner?.id ?? null, f.owner?.name ?? null, f.owner?.reason ?? null,
      f.cost30dUsd, f.lastUsedAt, f.evidence.join(' '),
    ].map(cell).join(',')
  );
  return [CSV_COLUMNS.join(','), ...rows].join('\r\n') + '\r\n';
}
