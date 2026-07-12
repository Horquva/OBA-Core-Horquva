import { Agent, Dependency } from '../types';
import { deriveRiskScore, deriveRisk, calculateHealthScore } from './risk';
import { getDownstream, getSPOFs } from './graph';

// ─── Risk Tier ───────────────────────────────────────────────────────────────

export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskFactor {
  label: string;
  points: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface AgentRiskProfile {
  agent: Agent;

  /** Combined raw score (ownership + dependency penalties) */
  compositeScore: number;

  /** Tier derived from composite score */
  tier: RiskTier;

  /** Is CRITICAL by the hard rule? */
  isCriticalByRule: boolean;

  /** Is orphaned (no owner)? */
  isOrphaned: boolean;

  /** Is a SPOF with no backup? */
  isSPOF: boolean;

  /** Individual risk factors that contributed to the score */
  factors: RiskFactor[];

  /** How many downstream agents this one can cascade into */
  downstreamCount: number;
}

// ─── Score → Tier mapping ─────────────────────────────────────────────────────

function scoreToTier(score: number): RiskTier {
  if (score >= 70) return 'CRITICAL';
  if (score >= 40) return 'HIGH';
  if (score >= 20) return 'MEDIUM';
  return 'LOW';
}

// ─── Build factor list for an agent ──────────────────────────────────────────

function buildFactors(
  agent: Agent,
  isSPOF: boolean,
  downstreamCount: number
): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (!agent.owner) {
    factors.push({ label: 'No Owner Assigned', points: 40, severity: 'critical' });
  }

  if (!agent.backup_owner) {
    factors.push({ label: 'No Backup Owner', points: 30, severity: 'high' });
  }

  if (!agent.documented) {
    factors.push({ label: 'Not Documented', points: 15, severity: 'medium' });
  }

  const critWeights: Record<string, { points: number; severity: 'critical' | 'high' | 'medium' | 'low' }> = {
    critical: { points: 15, severity: 'critical' },
    high:     { points: 10, severity: 'high' },
    medium:   { points: 5,  severity: 'medium' },
    low:      { points: 0,  severity: 'low' },
  };

  const cw = critWeights[agent.criticality];
  if (cw && cw.points > 0) {
    factors.push({
      label: `Business Criticality: ${agent.criticality.toUpperCase()}`,
      points: cw.points,
      severity: cw.severity,
    });
  }

  if (isSPOF) {
    factors.push({
      label: `Single Point of Failure (${downstreamCount} downstream agents)`,
      points: 0, // already reflected in no-backup penalty; shown for clarity
      severity: 'critical',
    });
  }

  return factors;
}

// ─── Main computation ─────────────────────────────────────────────────────────

export interface RiskIntelligenceReport {
  agents: AgentRiskProfile[];
  criticalAgents: AgentRiskProfile[];
  highAgents: AgentRiskProfile[];
  mediumAgents: AgentRiskProfile[];
  lowAgents: AgentRiskProfile[];
  organizationalHealthScore: number;
  healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  totalAgents: number;
  orphanedCount: number;
  spofCount: number;
}

export function computeRiskIntelligence(
  agents: Agent[],
  dependencies: Dependency[]
): RiskIntelligenceReport {
  const spofs = new Set(getSPOFs(agents, dependencies).map(s => s.agentId));

  const profiles: AgentRiskProfile[] = agents.map(agent => {
    const downstream = getDownstream(agent.id, dependencies);
    const downstreamCount = downstream.size;
    const isSPOF = spofs.has(agent.id);
    const isOrphaned = !agent.owner;

    const compositeScore = deriveRiskScore(agent);

    // CRITICAL hard rule: orphaned OR (SPOF + no backup owner)
    const isCriticalByRule = isOrphaned || (isSPOF && !agent.backup_owner);

    // Final tier
    let tier: RiskTier;
    if (isCriticalByRule) {
      tier = 'CRITICAL';
    } else {
      tier = scoreToTier(compositeScore);
    }

    const factors = buildFactors(agent, isSPOF, downstreamCount);

    return {
      agent,
      compositeScore,
      tier,
      isCriticalByRule,
      isOrphaned,
      isSPOF,
      factors,
      downstreamCount,
    };
  });

  // Sort by composite score descending
  profiles.sort((a, b) => {
    // CRITICAL first, then by score
    if (a.tier === 'CRITICAL' && b.tier !== 'CRITICAL') return -1;
    if (a.tier !== 'CRITICAL' && b.tier === 'CRITICAL') return 1;
    return b.compositeScore - a.compositeScore;
  });

  const criticalAgents = profiles.filter(p => p.tier === 'CRITICAL');
  const highAgents     = profiles.filter(p => p.tier === 'HIGH');
  const mediumAgents   = profiles.filter(p => p.tier === 'MEDIUM');
  const lowAgents      = profiles.filter(p => p.tier === 'LOW');

  const ohs = calculateHealthScore(agents);

  let healthStatus: RiskIntelligenceReport['healthStatus'];
  if (ohs >= 75)      healthStatus = 'HEALTHY';
  else if (ohs >= 50) healthStatus = 'AT_RISK';
  else               healthStatus = 'CRITICAL';

  return {
    agents: profiles,
    criticalAgents,
    highAgents,
    mediumAgents,
    lowAgents,
    organizationalHealthScore: ohs,
    healthStatus,
    totalAgents: agents.length,
    orphanedCount: profiles.filter(p => p.isOrphaned).length,
    spofCount: profiles.filter(p => p.isSPOF).length,
  };
}
