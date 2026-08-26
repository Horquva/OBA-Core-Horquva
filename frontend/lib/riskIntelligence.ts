import { Agent, Dependency } from '../types';
import { getDownstream } from './graph';
import { evidenceGate } from './evidenceGate';
import type { EvidenceInfo } from '../components/ui/EvidenceBadge';
import type { PredictiveRiskEntry } from './predictiveRisk';

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

  /** Canonical tier — domain/derived.js's threatLevel(), never re-banded locally */
  tier: RiskTier;

  /** Orphaned, or a SPOF with no backup — informational only; no longer
   *  overrides `tier`, since that duplicated a definition the backend's
   *  factor-weighted score already accounts for (NO_OWNER/SINGLE_OWNER). */
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

// ─── Factor list for an agent ─────────────────────────────────────────────────

/** Display-only severity banding for a real backend-computed point value --
 *  colors the badge, never changes the number or feeds back into a score.
 *  Thresholds sit between derived.js's own RISK_FACTORS values (10-35) so
 *  every real factor lands somewhere, not a re-derivation of risk itself. */
function severityForPoints(points: number): RiskFactor['severity'] {
  if (points >= 25) return 'critical';
  if (points >= 15) return 'high';
  if (points >= 8)  return 'medium';
  return 'low';
}

/** Builds the display factor list straight from predictiveRisk()'s own
 *  contributingFactors/reasons (via /api/predictive-risk/agents) -- this used
 *  to be a second, locally-invented point scheme (40/30/15/15) that didn't
 *  even sum to the same compositeScore shown next to it. Object key order
 *  matches `reasons` order by construction in derived.js's predictiveRisk(). */
function factorsFromRisk(risk: PredictiveRiskEntry | undefined): RiskFactor[] {
  if (!risk) return [];
  const keys = Object.keys(risk.contributingFactors);
  return keys.map((key, i) => ({
    label: risk.reasons[i] ?? key,
    points: risk.contributingFactors[key],
    severity: severityForPoints(risk.contributingFactors[key]),
  }));
}

// ─── Main computation ─────────────────────────────────────────────────────────

export interface RiskIntelligenceReport {
  agents: AgentRiskProfile[];
  criticalAgents: AgentRiskProfile[];
  highAgents: AgentRiskProfile[];
  mediumAgents: AgentRiskProfile[];
  lowAgents: AgentRiskProfile[];
  organizationalHealthScore: number | null;
  healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL' | null;
  totalAgents: number;
  orphanedCount: number;
  spofCount: number;
  summary: OrgHealthSummary;
  evidence: EvidenceInfo & { sufficient: boolean };
}

export interface OrgHealthSummary {
  mostOverloadedOwner: { name: string; agentCount: number; backupCount: number } | null;
  highestRisk: { name: string; score: number } | null;
  maxCascade: number;
  undocumentedCount: number;
  findings: string[];
}

function buildSummary(
  profiles: AgentRiskProfile[],
  criticalCount: number,
  highCount: number,
  orphanedNames: string[]
): OrgHealthSummary {
  const byOwner: Record<string, AgentRiskProfile[]> = {};
  profiles.forEach(p => {
    const owner = p.agent.owner;
    if (!owner) return;
    (byOwner[owner] = byOwner[owner] || []).push(p);
  });

  let mostOverloadedOwner: OrgHealthSummary['mostOverloadedOwner'] = null;
  for (const [name, owned] of Object.entries(byOwner)) {
    const backupCount = owned.filter(p => p.agent.backup_owner).length;
    if (!mostOverloadedOwner || owned.length > mostOverloadedOwner.agentCount) {
      mostOverloadedOwner = { name, agentCount: owned.length, backupCount };
    }
  }

  const highestRiskProfile = profiles.reduce<AgentRiskProfile | null>((max, p) => (
    !max || p.compositeScore > max.compositeScore ? p : max
  ), null);
  const highestRisk = highestRiskProfile
    ? { name: highestRiskProfile.agent.name, score: highestRiskProfile.compositeScore }
    : null;

  const spofProfiles = profiles.filter(p => p.isSPOF);
  const maxCascade = spofProfiles.reduce((max, p) => Math.max(max, p.downstreamCount), 0);
  const worstSpof = spofProfiles.reduce<AgentRiskProfile | null>((max, p) => (
    !max || p.downstreamCount > max.downstreamCount ? p : max
  ), null);

  const undocumentedCount = profiles.filter(p => !p.agent.documented).length;

  const findings: string[] = [];
  if (criticalCount > 0) findings.push(`${criticalCount} agent${criticalCount === 1 ? '' : 's'} at CRITICAL risk — immediate intervention required`);
  if (highCount > 0) findings.push(`${highCount} agent${highCount === 1 ? '' : 's'} at HIGH risk — escalate to department heads`);
  if (mostOverloadedOwner && mostOverloadedOwner.agentCount >= 2) {
    const missingBackups = mostOverloadedOwner.agentCount - mostOverloadedOwner.backupCount;
    findings.push(`${mostOverloadedOwner.name} owns ${mostOverloadedOwner.agentCount} agents with ${missingBackups} lacking backup coverage — concentration risk`);
  }
  if (orphanedNames.length > 0) {
    findings.push(`${orphanedNames.length} orphaned agent${orphanedNames.length === 1 ? '' : 's'}: ${orphanedNames.join(' & ')}`);
  }
  if (worstSpof) {
    findings.push(`SPOF detected: ${worstSpof.agent.name} → cascades to ${worstSpof.downstreamCount}+ downstream agents`);
  }

  return { mostOverloadedOwner, highestRisk, maxCascade, undocumentedCount, findings };
}

export function computeRiskIntelligence(
  agents: Agent[],
  dependencies: Dependency[],
  spofAgentIds: Set<string>,
  riskByAgentName: Map<string, PredictiveRiskEntry>,
  orgHealth: { healthIndex: number | null; healthStatus: 'STABLE' | 'WARNING' | 'CRITICAL' | null } | null
): RiskIntelligenceReport {
  const spofs = spofAgentIds;

  const profiles: AgentRiskProfile[] = agents.map(agent => {
    const downstream = getDownstream(agent.id, dependencies);
    const downstreamCount = downstream.size;
    const isSPOF = spofs.has(agent.id);
    const isOrphaned = !agent.owner;

    const risk = riskByAgentName.get(agent.name);
    const compositeScore = risk?.predictedScore ?? 0;

    // Informational only — see isCriticalByRule's doc comment.
    const isCriticalByRule = isOrphaned || (isSPOF && !agent.backup_owner);

    // Canonical tier straight from the backend's threatLevel() — no local
    // re-banding, no override. An agent's tier is the same value everywhere
    // it's shown, not whatever this page used to compute on its own.
    const tier: RiskTier = risk ? (risk.threatLevel.toUpperCase() as RiskTier) : 'LOW';

    const factors = factorsFromRisk(risk);

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

  const evidence = evidenceGate(agents, () => true);
  const ohs = orgHealth?.healthIndex ?? null;

  const statusMap: Record<string, RiskIntelligenceReport['healthStatus']> = {
    STABLE: 'HEALTHY',
    WARNING: 'AT_RISK',
    CRITICAL: 'CRITICAL',
  };
  const healthStatus: RiskIntelligenceReport['healthStatus'] =
    orgHealth?.healthStatus ? (statusMap[orgHealth.healthStatus] ?? null) : null;

  const orphanedNames = profiles.filter(p => p.isOrphaned).map(p => p.agent.name);

  return {
    agents: profiles,
    criticalAgents,
    highAgents,
    mediumAgents,
    lowAgents,
    organizationalHealthScore: ohs,
    healthStatus,
    totalAgents: agents.length,
    orphanedCount: orphanedNames.length,
    spofCount: profiles.filter(p => p.isSPOF).length,
    summary: buildSummary(profiles, criticalAgents.length, highAgents.length, orphanedNames),
    evidence,
  };
}
