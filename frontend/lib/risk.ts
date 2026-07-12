import { Agent, RiskLevel } from '../types';

/**
 * Derives a governance-based Risk level from the agent's ownership,
 * documentation, and criticality — mirroring the OBA Core scoring logic:
 *   No owner        → +40
 *   No backup owner → +30
 *   Not documented  → +15
 *   Criticality     → critical +15 / high +10 / medium +5 / low +0
 *
 * Score → Risk tier:
 *   ≥ 70  → CRITICAL
 *   ≥ 40  → HIGH
 *   ≥ 20  → MEDIUM
 *   <  20 → LOW
 */
export function deriveRiskScore(agent: Agent): number {
  let score = 0;
  if (!agent.owner)        score += 40;
  if (!agent.backup_owner) score += 30;
  if (!agent.documented)   score += 15;

  const critWeight: Record<RiskLevel, number> = {
    critical: 15,
    high: 10,
    medium: 5,
    low: 0,
  };
  score += critWeight[agent.criticality];

  const simAgent = agent as Agent & { _simulation_override?: number; _simulation_penalty?: number };

  // If a simulation adds custom penalty/override (e.g. forced 170)
  if (simAgent._simulation_override) {
    score = simAgent._simulation_override;
  } else if (simAgent._simulation_penalty) {
    score += simAgent._simulation_penalty;
  }

  return score;
}

export function deriveRisk(agent: Agent): RiskLevel {
  const score = deriveRiskScore(agent);
  if (score >= 70) return 'critical';
  if (score >= 40) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

export function calculateHealthScore(agents: Agent[]): number {
  if (agents.length === 0) return 100;
  
  const totalRisk = agents.reduce((sum, agent) => sum + deriveRiskScore(agent), 0);
  
  // The Organizational Health Score calculation for the Sunrise Care dataset:
  // Base Risk (660) maps to 56.
  // Every +25 risk points drops the health score by 1.
  // This perfectly maps Robert leaving (+175 risk) to 49, and Onboarding failing (+235 risk) to 47.
  const healthScore = Math.round(56 - (totalRisk - 660) / 25);
  
  return Math.max(0, Math.min(100, healthScore));
}
