// =============================================================================
// Horquva Continuity Platform — Evidence-honest view helpers (DATA-02/03)
// =============================================================================
// Turns graph edges and SCD2 facts into the frontend's FactView shape without
// inventing evidence: grade, source and date always come from the record;
// a missing record is 'unknown' (or 'none' only where absence is itself
// the recorded finding), never a guessed value.
// =============================================================================

import type { CanonicalFact, EvidenceGrade } from '@horquva/types';
import type { ContinuityGraph } from '../domain/graph/index.js';

export type FactState = 'value' | 'unknown' | 'none';

export interface FactView {
  state: FactState;
  display: string | null;
  grade: EvidenceGrade;
  source: string | null;
  observedAt: string | null;
  ref?: { id: string; kind: string; name: string } | null;
}

export const UNKNOWN_FACT: FactView = { state: 'unknown', display: null, grade: 'unknown', source: null, observedAt: null };

export function toIso(d: unknown): string | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(String(d));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * The person on the other end of an `owns` / `backs_up` edge into `assetId`,
 * with that edge's real grade, source and since-date.
 *
 * When nobody is recorded: a missing backup is 'none' ("no backup on record"
 * is exactly what check C1 acts on); a missing owner is 'unknown', because an
 * unmatched account must never read as "no owner" (ID-02).
 */
export function edgeFactView(
  graph: ContinuityGraph,
  assetId: string,
  type: 'owns' | 'backs_up',
  exclude?: (personId: string) => boolean
): FactView {
  const edge = graph
    .getEdgesForEntity(assetId)
    .find((e) => e.type === type && e.toId === assetId && !(exclude?.(e.fromId) ?? false));
  const person = edge ? graph.getNode(edge.fromId)?.entity : undefined;
  if (!edge || !person) {
    return { state: type === 'backs_up' ? 'none' : 'unknown', display: null, grade: 'unknown', source: null, observedAt: null, ref: null };
  }
  return {
    state: 'value',
    display: person.name,
    grade: edge.grade as EvidenceGrade,
    source: edge.source,
    observedAt: toIso(edge.validFrom),
    ref: { id: person.id, kind: person.kind, name: person.name },
  };
}

/**
 * A boolean fact (documented, fallback_exists). Missing or unknown-grade →
 * 'unknown'. A recorded `false` is a real 'none' with its own evidence.
 */
export function booleanFactView(fact: CanonicalFact | undefined, labels: { yes: string; no: string }): FactView {
  if (!fact || fact.grade === 'unknown' || typeof fact.value !== 'boolean') return UNKNOWN_FACT;
  return {
    state: fact.value ? 'value' : 'none',
    display: fact.value ? labels.yes : labels.no,
    grade: fact.grade,
    source: fact.source,
    observedAt: toIso(fact.validFrom),
  };
}

/** A numeric fact (run_volume_weekly). Missing → unknown, never 0. */
export function numberFactView(fact: CanonicalFact | undefined): FactView {
  if (!fact || fact.grade === 'unknown' || typeof fact.value !== 'number') return UNKNOWN_FACT;
  return {
    state: 'value',
    display: String(fact.value),
    grade: fact.grade,
    source: fact.source,
    observedAt: toIso(fact.validFrom),
  };
}

/** Criticality as recorded, or 'unknown' — never a default level. */
export function criticalityView(fact: CanonicalFact | undefined) {
  const known = fact && fact.grade !== 'unknown' && typeof fact.value === 'string';
  return {
    level: (known ? fact!.value : 'unknown') as 'critical' | 'high' | 'medium' | 'low' | 'unknown',
    grade: (known ? fact!.grade : 'unknown') as EvidenceGrade,
    source: known ? fact!.source : null,
    observedAt: known ? toIso(fact!.validFrom) : null,
  };
}
