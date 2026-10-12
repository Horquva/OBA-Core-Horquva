// =============================================================================
// Horquva Continuity Platform — Action remediation (SIM-08 actions screen)
// =============================================================================
// Assigning a backup records what an admin/reviewer *stated*, not a
// confirmation: only the backup person can confirm (attestation, CHK-02), so
// the edge is graded 'stated'. Accepting a risk records the real signed-in
// person and a bounded expiry; it lapses back to open afterwards.
// =============================================================================

import crypto from 'node:crypto';
import type { DataService, UserAccount } from '../services/dataService.js';
import { buildActions } from '../routes/actions.js';

export class ActionError extends Error {
  constructor(public status: 400 | 404 | 409, message: string) {
    super(message);
    this.name = 'ActionError';
  }
}

export const MAX_RISK_ACCEPTANCE_DAYS = 365;

function openAction(ds: DataService, actionId: string) {
  const action = buildActions(ds).find((a) => a.id === actionId);
  if (!action) throw new ActionError(404, `Action ${actionId} not found.`);
  if (action.status !== 'open' && action.status !== 'in_progress') {
    throw new ActionError(409, `This action is already ${String(action.status).replace('_', ' ')}.`);
  }
  return action as { id: string; type: string; checkId: string; asset: { id: string; name: string } };
}

export function assignBackup(ds: DataService, actionId: string, personId: string): void {
  const action = openAction(ds, actionId);
  if (action.type !== 'assign_backup') {
    throw new ActionError(400, 'This action is not about a missing backup.');
  }

  const graph = ds.getGraph();
  const person = graph.getNode(personId)?.entity;
  if (!person || person.kind !== 'person') throw new ActionError(400, `${personId} is not a person in the organization.`);
  const assetId = action.asset.id;
  if (graph.getOwners(assetId).some((o) => o.id === personId)) {
    throw new ActionError(400, `${person.name} already owns ${action.asset.name}; a backup must be someone else.`);
  }
  if (ds.getDepartures().some((d) => d.personId === personId && d.stage !== 'verified')) {
    throw new ActionError(400, `${person.name} has an open departure and can't become a backup.`);
  }

  graph.addEdge({
    id: crypto.randomUUID(),
    fromId: personId,
    toId: assetId,
    type: 'backs_up',
    grade: 'stated', // an assignment, not the backup's own confirmation
    source: 'manual_assignment',
    sourceRef: actionId,
    validFrom: new Date(),
    validTo: null,
  });

  ds.setActionOverride({
    id: actionId,
    checkId: action.checkId,
    entityId: assetId,
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
  });
  ds.addAuditEntry('user:admin', 'ASSIGN_BACKUP', `action:${actionId}`, `Assigned ${person.name} as backup for ${action.asset.name} (stated, awaiting their confirmation).`);
}

export function acceptRisk(
  ds: DataService,
  actionId: string,
  input: { reason: string; expiresAt: string },
  actor: UserAccount
): void {
  const action = openAction(ds, actionId);
  const expires = new Date(input.expiresAt);
  const now = Date.now();
  if (Number.isNaN(expires.getTime())) throw new ActionError(400, 'expiresAt must be a valid date.');
  if (expires.getTime() <= now) throw new ActionError(400, 'A risk acceptance must expire in the future.');
  if (expires.getTime() > now + MAX_RISK_ACCEPTANCE_DAYS * 86_400_000) {
    throw new ActionError(400, `A risk can be accepted for at most ${MAX_RISK_ACCEPTANCE_DAYS} days.`);
  }

  ds.setActionOverride({
    id: actionId,
    checkId: action.checkId,
    entityId: action.asset.id,
    status: 'accepted_risk',
    acceptedRisk: { reason: input.reason.trim(), expiresAt: expires.toISOString(), acceptedBy: actor.name },
  });
  ds.addAuditEntry(actor.id, 'ACCEPT_RISK', `action:${actionId}`, `Accepted risk until ${expires.toISOString()}: ${input.reason.trim()}`);
}
