// =============================================================================
// Horquva Continuity Platform — Departure read models
// =============================================================================
// One summary shape for the Departures list, the Overview and the executive PDF,
// so every surface groups and flags a departure the same way.
// =============================================================================

import type { DataService, DepartureRecord } from '../services/dataService.js';

/** The person's team from a `member_of` edge; null when the graph doesn't say (never a guess). */
function teamOf(personId: string, dataService: DataService): string | null {
  const graph = dataService.getGraph();
  const edge = graph.getEdgesForEntity(personId).find((e) => e.type === 'member_of' && e.fromId === personId);
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
