// =============================================================================
// Horquva Continuity Platform — Succession & Handover Lifecycle (HND-03/04/05)
// =============================================================================
// Stage machine: initiated → successor_named → accepted → account_disabled → verified
//
// The first three stages are derived from the handover rows, so they can move
// back (a decline re-opens naming). Once the account is disabled the lifecycle
// only moves forward. Only the named successor may accept or decline their own
// handover: acceptance is recorded as a *confirmed* ownership fact (HND-04),
// so nobody can confirm it on someone else's behalf. If a successor can't
// respond, HR/admin reassigns the row (reassignSuccessor) — never accepts it.
// =============================================================================

import crypto from 'node:crypto';
import type { ContinuityGraph } from '../domain/graph/index.js';
import type { DataService, DepartureRecord, UserAccount } from '../services/dataService.js';

export class SuccessionError extends Error {
  constructor(public status: 400 | 403 | 404 | 409, message: string) {
    super(message);
    this.name = 'SuccessionError';
  }
}

type Stage = DepartureRecord['stage'];
type Handover = DepartureRecord['handovers'][number];

export const STAGES: Stage[] = ['initiated', 'successor_named', 'accepted', 'account_disabled', 'verified'];

/** The stage implied by the handover rows alone. */
export function handoverStage(dep: DepartureRecord): 'initiated' | 'successor_named' | 'accepted' {
  const rows = dep.handovers;
  if (rows.length > 0 && rows.every((h) => h.acceptance === 'accepted')) return 'accepted';
  if (rows.length > 0 && rows.every((h) => h.successorId && h.acceptance !== 'declined')) return 'successor_named';
  return 'initiated';
}

function enterStage(dep: DepartureRecord, stage: Stage, now: string): void {
  if (dep.stage !== stage) dep.stageTimestamps[stage] = now;
  dep.stage = stage;
  // Moving back (e.g. a decline) clears timestamps of stages no longer reached.
  for (const later of STAGES.slice(STAGES.indexOf(stage) + 1)) delete dep.stageTimestamps[later];
  dep.updatedAt = now;
}

function refreshStage(dep: DepartureRecord, now: string): void {
  if (dep.stage === 'account_disabled' || dep.stage === 'verified') {
    dep.updatedAt = now;
    return;
  }
  enterStage(dep, handoverStage(dep), now);
}

function requireDeparture(ds: DataService, departureId: string): DepartureRecord {
  const dep = ds.getDeparture(departureId);
  if (!dep) throw new SuccessionError(404, `Departure ${departureId} not found.`);
  return dep;
}

function findHandover(ds: DataService, handoverId: string): { dep: DepartureRecord; hnd: Handover } {
  for (const dep of ds.getDepartures()) {
    const hnd = dep.handovers.find((h) => h.id === handoverId);
    if (hnd) return { dep, hnd };
  }
  throw new SuccessionError(404, `Handover ${handoverId} not found.`);
}

/** The person entity a signed-in user corresponds to (matched by email). */
export function personIdForUser(graph: ContinuityGraph, user: UserAccount): string | null {
  const email = user.email.toLowerCase();
  const direct = graph.getNode(`person:${email}`)?.entity;
  if (direct?.kind === 'person') return direct.id;
  const match = graph
    .getAllNodes()
    .find((n) => n.entity?.kind === 'person' && String(n.entity.externalRefs?.email ?? '').toLowerCase() === email);
  return match?.entity?.id ?? null;
}

/** Throws unless `successorId` is a person who can take over assets from `dep`. */
function requireEligibleSuccessor(ds: DataService, dep: DepartureRecord, successorId: string): void {
  const successor = ds.getGraph().getNode(successorId)?.entity;
  if (!successor || successor.kind !== 'person') {
    throw new SuccessionError(400, `Successor ${successorId} is not a person in the organization.`);
  }
  if (successorId === dep.personId) throw new SuccessionError(400, 'The departing person cannot be their own successor.');
  const leaving = ds.getDepartures().some((d) => d.stage !== 'verified' && d.personId === successorId);
  if (leaving) throw new SuccessionError(400, `${successor.name} has an open departure and cannot take over assets.`);
}

// ── HND-03: name successors ───────────────────────────────────────────────

export function nameSuccessors(
  ds: DataService,
  departureId: string,
  assignments: Array<{ assetId: string; successorId: string }>
): DepartureRecord {
  const dep = requireDeparture(ds, departureId);
  if (dep.stage === 'account_disabled' || dep.stage === 'verified') {
    throw new SuccessionError(409, 'Successors can no longer change once the account is disabled; reassign a single handover instead.');
  }
  if (assignments.length === 0) throw new SuccessionError(400, 'Name at least one successor.');

  // Validate everything before changing anything.
  for (const a of assignments) {
    const hnd = dep.handovers.find((h) => h.assetId === a.assetId);
    if (!hnd) throw new SuccessionError(400, `${a.assetId} is not part of this departure's handover.`);
    if (hnd.acceptance === 'accepted' && hnd.successorId === a.successorId) continue; // unchanged: no-op
    if (hnd.acceptance === 'accepted') {
      throw new SuccessionError(409, `${a.assetId} was already accepted by its successor.`);
    }
    requireEligibleSuccessor(ds, dep, a.successorId);
  }

  for (const a of assignments) {
    const hnd = dep.handovers.find((h) => h.assetId === a.assetId)!;
    if (hnd.successorId !== a.successorId) {
      hnd.successorId = a.successorId;
      hnd.acceptance = 'none'; // a new person must be asked afresh
      hnd.declineReason = null;
    }
  }

  refreshStage(dep, new Date().toISOString());
  ds.addAuditEntry('user:admin', 'ASSIGN_SUCCESSORS', `departure:${departureId}`, `Assigned ${assignments.length} successor(s).`);
  return dep;
}

/**
 * HR/admin unblock: hand one unaccepted row to someone else, at any stage before
 * verified — including after the account is disabled, when bulk naming is locked.
 * The admin never accepts on anyone's behalf: the new successor is asked directly
 * and must still accept themselves. A reason is required for the audit trail.
 */
export function reassignSuccessor(ds: DataService, handoverId: string, successorId: string, reason: string): DepartureRecord {
  const { dep, hnd } = findHandover(ds, handoverId);
  const why = reason.trim();
  if (!why) throw new SuccessionError(400, 'Give a reason for reassigning this handover.');
  if (hnd.acceptance === 'accepted') {
    throw new SuccessionError(409, `${hnd.assetId} was already accepted by its successor.`);
  }
  if (dep.stage === 'verified') throw new SuccessionError(409, 'This departure is verified and closed.');
  if (hnd.successorId === successorId) throw new SuccessionError(400, 'That person is already the named successor.');
  requireEligibleSuccessor(ds, dep, successorId);

  const previous = hnd.successorId;
  hnd.successorId = successorId;
  hnd.acceptance = 'requested';
  hnd.declineReason = null;
  refreshStage(dep, new Date().toISOString());
  ds.addAuditEntry(
    'user:admin',
    'REASSIGN_SUCCESSOR',
    `handover:${handoverId}`,
    `${hnd.assetId}: ${previous ?? 'nobody'} → ${successorId}. Reason: ${why}`
  );
  return dep;
}

// ── HND-04/05: request, accept, decline ───────────────────────────────────

export function requestAcceptance(ds: DataService, departureId: string): { requested: number } {
  const dep = requireDeparture(ds, departureId);
  const pending = dep.handovers.filter((h) => h.successorId && h.acceptance === 'none');
  if (pending.length === 0) {
    throw new SuccessionError(409, 'No named successors are waiting to be asked.');
  }
  for (const h of pending) h.acceptance = 'requested';
  dep.updatedAt = new Date().toISOString();
  ds.addAuditEntry('user:admin', 'SEND_ACCEPTANCE_REQUESTS', `departure:${departureId}`, `Asked ${pending.length} successor(s) to accept.`);
  return { requested: pending.length };
}

function requireOwnRequest(ds: DataService, handoverId: string, actor: UserAccount) {
  const { dep, hnd } = findHandover(ds, handoverId);
  if (hnd.acceptance !== 'requested') {
    throw new SuccessionError(409, `This handover is not awaiting a response (status: ${hnd.acceptance}).`);
  }
  if (!hnd.successorId || personIdForUser(ds.getGraph(), actor) !== hnd.successorId) {
    throw new SuccessionError(403, 'Only the named successor can respond to this handover.');
  }
  return { dep, hnd };
}

export async function acceptHandover(ds: DataService, handoverId: string, actor: UserAccount): Promise<DepartureRecord> {
  const { dep, hnd } = requireOwnRequest(ds, handoverId, actor);
  const successorId = hnd.successorId!;

  ds.getGraph().addEdge({
    id: crypto.randomUUID(),
    fromId: successorId,
    toId: hnd.assetId,
    type: 'owns',
    grade: 'confirmed',
    source: 'handover_acceptance',
    sourceRef: hnd.id,
    validFrom: new Date(),
    validTo: null,
  });
  await ds.getFactStore().insertFact({
    entityId: hnd.assetId,
    attribute: 'status',
    value: 'handed_over',
    grade: 'confirmed',
    source: 'handover',
    sourceRef: hnd.id,
    attestedBy: successorId,
  });

  hnd.acceptance = 'accepted';
  refreshStage(dep, new Date().toISOString());
  ds.addAuditEntry(successorId, 'ACCEPT_HANDOVER', `handover:${handoverId}`, `Accepted ownership of ${hnd.assetId}.`);
  return dep;
}

export function declineHandover(ds: DataService, handoverId: string, actor: UserAccount, reason: string): DepartureRecord {
  const { dep, hnd } = requireOwnRequest(ds, handoverId, actor);
  hnd.acceptance = 'declined';
  hnd.declineReason = reason;
  refreshStage(dep, new Date().toISOString());
  ds.addAuditEntry(hnd.successorId!, 'DECLINE_HANDOVER', `handover:${handoverId}`, `Declined: ${reason}`);
  return dep;
}

// ── Lifecycle after handover ──────────────────────────────────────────────

/** Records that the leaver's account was disabled. Allowed at any point: accounts get disabled on the leave date whether or not handover finished. */
export function markAccountDisabled(ds: DataService, departureId: string): DepartureRecord {
  const dep = requireDeparture(ds, departureId);
  if (dep.stage === 'account_disabled' || dep.stage === 'verified') {
    throw new SuccessionError(409, 'The account is already recorded as disabled.');
  }
  const unaccepted = dep.handovers.filter((h) => h.acceptance !== 'accepted').length;
  enterStage(dep, 'account_disabled', new Date().toISOString());
  ds.addAuditEntry(
    'user:admin',
    'ACCOUNT_DISABLED',
    `departure:${departureId}`,
    unaccepted ? `Account disabled with ${unaccepted} handover(s) not yet accepted.` : 'Account disabled; all handovers accepted.'
  );
  return dep;
}

/** Closes the departure. Requires the account disabled and every asset accepted by a successor. */
export function verifyDeparture(ds: DataService, departureId: string): DepartureRecord {
  const dep = requireDeparture(ds, departureId);
  if (dep.stage !== 'account_disabled') {
    throw new SuccessionError(409, `Only a departure whose account is disabled can be verified (current stage: ${dep.stage}).`);
  }
  const open = dep.handovers.filter((h) => h.acceptance !== 'accepted');
  if (open.length > 0) {
    throw new SuccessionError(409, `${open.length} handover(s) still have no accepted successor.`);
  }
  enterStage(dep, 'verified', new Date().toISOString());
  ds.addAuditEntry('user:admin', 'VERIFY_DEPARTURE', `departure:${departureId}`, 'Departure verified and closed.');
  return dep;
}
