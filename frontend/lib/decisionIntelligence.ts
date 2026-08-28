// lib/decisionIntelligence.ts
// Module 14 — Decision Intelligence.
//
// Types only. The scoring engine (computeDecisionIntelligence and its
// helpers) now lives on the backend (backend/routes/decisionIntelligence.js,
// GET /api/decision-intelligence) — consolidated so there's one
// implementation instead of a client-side reimplementation working off
// differently-shaped, sometimes-broken data (that port surfaced a real bug:
// the old pipeline fed this scoring engine from /api/workflows/intelligence,
// whose response shape didn't actually have most of the fields this expected,
// so every workflow decision silently scored as "Unknown Workflow").

import type { EvidenceInfo } from '../components/ui/EvidenceBadge';

export type DecisionCategory = 'ownership' | 'tooling' | 'workflow';
export type QualityTier = 'GOOD' | 'ACCEPTABLE' | 'POOR' | 'HARMFUL';

export interface DecisionInfluence {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  detail: string;
}

export interface DecisionRecord {
  id: string;
  /** Human-readable label of what was decided */
  decision: string;
  category: DecisionCategory;
  /** The asset/tool/workflow that was the subject */
  subject: string;
  subjectId: string;
  criticality: string;
  department: string;
  /** Who made / carries this decision */
  decisionMaker: string | null;
  /** Final 0-100 score */
  score: number;
  quality: QualityTier;
  /** Breakdown of the score (why it is what it is) */
  influences: DecisionInfluence[];
  /** Human-readable fix for POOR / HARMFUL */
  fix: string | null;
  /** The reasoning chain — "why was this made" */
  trailSummary: string;
}

export interface DecisionIntelligenceReport {
  decisions: DecisionRecord[];
  good: DecisionRecord[];
  acceptable: DecisionRecord[];
  poor: DecisionRecord[];
  harmful: DecisionRecord[];
  /** Org-wide Decision Quality Index 0–100, or null when evidence is insufficient */
  dqi: number | null;
  dqiVerdict: 'STRONG' | 'MIXED' | 'WEAK' | 'CRITICAL' | null;
  evidence: EvidenceInfo & { sufficient: boolean };
  totalDecisions: number;
  /** Per-person concentration: owner → agent count */
  ownerConcentration: Record<string, number>;
}
