import { RiskLevel } from '../types';

export interface PredictiveRiskEntry {
  predictedScore: number;
  threatLevel: RiskLevel;
  /** domain/derived.js's predictiveRisk() per-factor point breakdown (e.g.
   *  single_owner, high_dependency_count) -- the backend's real weights, not
   *  a locally re-derived set. Object key order matches `reasons` order. */
  contributingFactors: Record<string, number>;
  /** Human-readable, same order as contributingFactors' keys. */
  reasons: string[];
}

const THREAT_TO_RISK_LEVEL: Record<string, RiskLevel> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * The backend's canonical per-agent risk (domain/derived.js's predictiveRisk()
 * + threatLevel() bands: 35/55/75), keyed by agent name, from
 * GET /api/predictive-risk/agents. This is the one place a risk tier should
 * come from — never re-band predictedScore locally (frontend/lib/risk.ts's
 * deriveRisk() used its own 20/40/70 bands and a completely different
 * ownership-flags formula; different agents got different tiers for the same
 * underlying data depending which page rendered them).
 */
export function buildPredictiveRiskByAgentName(predictiveData: unknown): Map<string, PredictiveRiskEntry> {
  const map = new Map<string, PredictiveRiskEntry>();
  if (!Array.isArray(predictiveData)) return map;
  for (const p of predictiveData) {
    if (!p || typeof p.agentName !== 'string') continue;
    map.set(p.agentName, {
      predictedScore: typeof p.predictedScore === 'number' ? p.predictedScore : 0,
      threatLevel: THREAT_TO_RISK_LEVEL[p.threatLevel] ?? 'low',
      contributingFactors: (p.contributingFactors && typeof p.contributingFactors === 'object') ? p.contributingFactors : {},
      reasons: Array.isArray(p.reasons) ? p.reasons : [],
    });
  }
  return map;
}
