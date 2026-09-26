import { RiskLevel } from '../types';

export interface PredictiveRiskEntry {
  predictedScore: number;
  threatLevel: RiskLevel;
  /** BBN causal attribution: score shed if variable restored to optimal state (2) */
  contributingFactors: Record<string, number>;
  /** Human-readable, causal remediation reasons. */
  reasons: string[];
  /** eIRWR continuous blast radius / failure mass (arXiv:2608.08073) */
  blastRadius: number;
  /** BBN (O, D, S, U) discrete evidence tuple (arXiv:0906.3968) */
  evidence?: {
    ownership: number;
    documentation: number;
    runtime_state: number;
    cascade_exposure: number;
  } | null;
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
      threatLevel: THREAT_TO_RISK_LEVEL[p.threatLevel] ?? 'unknown',
      contributingFactors: (p.contributingFactors && typeof p.contributingFactors === 'object') ? p.contributingFactors : {},
      reasons: Array.isArray(p.reasons) ? p.reasons : [],
      blastRadius: typeof p.blastRadius === 'number' ? p.blastRadius : 0,
      evidence: (p.evidence && typeof p.evidence === 'object') ? p.evidence : null,
    });
  }
  return map;
}
