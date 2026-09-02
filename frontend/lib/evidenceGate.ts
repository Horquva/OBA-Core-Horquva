// lib/evidenceGate.ts
//
// Minimal TypeScript port of backend/domain/definitions.js's coverage()/
// evidenceGate(). Ports only the population/coverage primitives — not the
// criticality vocabulary (atOrAbove, spofVerdict) — because the two
// client-side files that need this (riskIntelligence.ts, orgMemory.ts) only
// ever aggregate a score, they never reimplement SPOF or threshold
// comparison logic. Exists only because there is no shared runtime between
// backend/ and frontend/ to unify the two implementations; if the 50%
// threshold or the coverage formula ever changes, both files need the edit.

export interface CoverageResult {
  covered: number;
  total: number;
  ratio: number;
}

export interface EvidenceGateResult {
  sufficient: boolean;
  status: 'computed' | 'insufficient_evidence';
  coverage: number;
  covered: number;
  total: number;
  threshold: number;
}

const COVERAGE_THRESHOLD = 0.5;

export function coverage<T>(rows: T[], hasField: (row: T) => boolean): CoverageResult {
  const total = rows.length;
  const covered = rows.filter(hasField).length;
  return { covered, total, ratio: total === 0 ? 0 : covered / total };
}

export function evidenceGate<T>(
  rows: T[],
  hasField: (row: T) => boolean,
  opts: { threshold?: number } = {},
): EvidenceGateResult {
  const threshold = opts.threshold ?? COVERAGE_THRESHOLD;
  const { covered, total, ratio } = coverage(rows, hasField);
  const sufficient = total > 0 && ratio >= threshold;
  return {
    sufficient,
    status: sufficient ? 'computed' : 'insufficient_evidence',
    coverage: ratio,
    covered,
    total,
    threshold,
  };
}
