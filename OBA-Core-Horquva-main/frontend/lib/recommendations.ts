import { Agent, Dependency, AITool, Workflow, Dataset, RiskLevel } from '../types';
import { deriveRisk, calculateHealthScore } from './risk';



export type RecPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM';
export type RecCategory =
  | 'OWNERSHIP'
  | 'DOCUMENTATION'
  | 'DEPENDENCY'
  | 'CONCENTRATION'
  | 'TOOL_GOVERNANCE';

export interface Recommendation {
  id: string;
  priority: RecPriority;
  category: RecCategory;
  title: string;
  description: string;
  /** What happens if this is ignored */
  impact: string;
  /** Specific, named action */
  action: string;
  /** Which agent/workflow/tool this targets */
  targetId: string;
  targetName: string;
  targetType: 'agent' | 'workflow' | 'person' | 'tool';
  /** Estimated effort: Quick / Medium / Strategic */
  effort: 'Quick' | 'Medium' | 'Strategic';
}

export interface RecommendationEngineOutput {
  recommendations: Recommendation[];
  top5: Recommendation[];
  healthScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  /** Ordered list: CRITICAL → HIGH → MEDIUM */
  prioritized: Recommendation[];
  ownerConcentrationWarning: { owner: string; agentCount: number } | null;
  orphanedAgentCount: number;
  undocumentedCriticalCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Priority mapper
// ─────────────────────────────────────────────────────────────────────────────
function riskToPriority(risk: RiskLevel): RecPriority {
  if (risk === 'critical') return 'CRITICAL';
  if (risk === 'high') return 'HIGH';
  return 'MEDIUM';
}

let _idCounter = 0;
function nextId(prefix: string) {
  return `${prefix}_${++_idCounter}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core engine
// ─────────────────────────────────────────────────────────────────────────────
export function generateRecommendations(dataset: Dataset): RecommendationEngineOutput {
  _idCounter = 0;
  const { agents, dependencies, ai_tools, workflows } = dataset;
  const recs: Recommendation[] = [];

  // ── 1. ORPHANED AGENTS (no owner) ────────────────────────────────────────
  const orphaned = agents.filter(a => !a.owner);
  orphaned.forEach(agent => {
    const risk = deriveRisk(agent);
    recs.push({
      id: nextId('rec'),
      priority: riskToPriority(risk),
      category: 'OWNERSHIP',
      title: `Assign owner to "${agent.name}"`,
      description: `${agent.name} (${agent.department}) is completely unowned — no primary or backup owner exists. It is operating as a ghost agent.`,
      impact: `An unowned ${risk.toUpperCase()} agent is a single point of catastrophic failure with no human accountability.`,
      action: `Immediately assign a primary owner and a backup owner from the ${agent.department} department. Add to the agent registry.`,
      targetId: agent.id,
      targetName: agent.name,
      targetType: 'agent',
      effort: 'Quick',
    });
  });

  // ── 2. AGENTS WITH NO BACKUP OWNER ───────────────────────────────────────
  const noBackup = agents.filter(a => a.owner && !a.backup_owner);
  noBackup.forEach(agent => {
    const risk = deriveRisk(agent);
    if (risk === 'critical' || risk === 'high') {
      recs.push({
        id: nextId('rec'),
        priority: riskToPriority(risk),
        category: 'OWNERSHIP',
        title: `Assign backup owner to "${agent.name}"`,
        description: `${agent.name} is owned solely by ${agent.owner} with no backup. A single departure or absence leaves this ${risk} agent uncontrolled.`,
        impact: `If ${agent.owner} is unavailable, this ${risk.toUpperCase()} agent becomes instantly orphaned — risk score jumps by +30.`,
        action: `Designate a backup owner for ${agent.name}. Recommended: cross-train someone from the same department (${agent.department}).`,
        targetId: agent.id,
        targetName: agent.name,
        targetType: 'agent',
        effort: 'Quick',
      });
    }
  });

  // ── 3. OWNER CONCENTRATION (SPOF-person) ─────────────────────────────────
  const ownerCounts: Record<string, number> = {};
  agents.forEach(a => {
    if (a.owner) ownerCounts[a.owner] = (ownerCounts[a.owner] || 0) + 1;
  });
  let maxOwner: { owner: string; agentCount: number } | null = null;
  Object.entries(ownerCounts).forEach(([owner, count]) => {
    if (count >= 4) {
      if (!maxOwner || count > maxOwner.agentCount) {
        maxOwner = { owner, agentCount: count };
      }
      recs.push({
        id: nextId('rec'),
        priority: count >= 5 ? 'CRITICAL' : 'HIGH',
        category: 'CONCENTRATION',
        title: `Redistribute ${owner}'s ${count} agents`,
        description: `${owner} owns ${count} agents — the highest concentration in the organization. This creates a catastrophic single point of failure if ${owner} leaves.`,
        impact: `If ${owner} departs, ${count} agents instantly escalate to ORPHANED status, collapsing the Organizational Health Score.`,
        action: `Immediately begin redistributing ${owner}'s lower-criticality agents to other qualified personnel. Target: no single owner should control more than 3 agents.`,
        targetId: `person_${owner}`,
        targetName: owner,
        targetType: 'person',
        effort: 'Strategic',
      });
    }
  });

  // ── 4. UNDOCUMENTED CRITICAL / HIGH AGENTS ───────────────────────────────
  const undocumentedCritical = agents.filter(
    a => !a.documented && (a.criticality === 'critical' || a.criticality === 'high')
  );
  undocumentedCritical.forEach(agent => {
    const risk = deriveRisk(agent);
    recs.push({
      id: nextId('rec'),
      priority: riskToPriority(risk),
      category: 'DOCUMENTATION',
      title: `Document "${agent.name}" immediately`,
      description: `${agent.name} (${agent.criticality.toUpperCase()} criticality) has no documentation. If its owner is unavailable, no one can maintain or recover this agent.`,
      impact: `Undocumented ${agent.criticality.toUpperCase()} agents cannot be handed off, recovered, or audited — a compliance and operational liability.`,
      action: `Create a runbook for ${agent.name} covering: purpose, inputs/outputs, failure modes, recovery steps, and escalation path.`,
      targetId: agent.id,
      targetName: agent.name,
      targetType: 'agent',
      effort: 'Medium',
    });
  });

  // ── 5. WORKFLOWS WITH NO BACKUP OWNER ────────────────────────────────────
  const criticalUndocumentedWFs = workflows.filter(
    w => !w.backup_owner && (w.criticality === 'critical' || w.criticality === 'high')
  );
  criticalUndocumentedWFs.forEach(wf => {
    recs.push({
      id: nextId('rec'),
      priority: wf.criticality === 'critical' ? 'CRITICAL' : 'HIGH',
      category: 'OWNERSHIP',
      title: `Assign backup owner to workflow "${wf.name}"`,
      description: `The ${wf.criticality.toUpperCase()} workflow "${wf.name}" (${wf.department}) has only one owner: ${wf.owner}. No backup coverage exists.`,
      impact: `Without a backup, any absence of ${wf.owner} halts the entire "${wf.name}" workflow — impacting the ${wf.department} department.`,
      action: `Designate a backup workflow owner for "${wf.name}" and schedule a knowledge transfer session.`,
      targetId: wf.id,
      targetName: wf.name,
      targetType: 'workflow',
      effort: 'Quick',
    });
  });

  // ── 6. AI TOOLS WITH NO BACKUP TOOL ──────────────────────────────────────
  const criticalToolsNoBackup = ai_tools.filter(
    t => !t.backup_tool && (t.criticality === 'critical' || t.criticality === 'high')
  );
  criticalToolsNoBackup.forEach(tool => {
    recs.push({
      id: nextId('rec'),
      priority: tool.criticality === 'critical' ? 'CRITICAL' : 'HIGH',
      category: 'TOOL_GOVERNANCE',
      title: `Establish fallback for "${tool.name}"`,
      description: `${tool.name} (${tool.vendor}) is rated ${tool.criticality.toUpperCase()} and has no backup tool. It powers ${tool.agents_using.length} agents and ${tool.workflows.length} workflows.`,
      impact: `A ${tool.name} outage cascades instantly to ${tool.agents_using.length} dependent agents with no alternative pathway.`,
      action: `Identify and contract a backup LLM/tool for ${tool.name}. Document the failover procedure. Test switching time monthly.`,
      targetId: tool.id,
      targetName: tool.name,
      targetType: 'tool',
      effort: 'Strategic',
    });
  });

  // ── 7. UNDOCUMENTED CRITICAL WORKFLOWS ───────────────────────────────────
  const undocumentedCriticalWFs = workflows.filter(
    w => !w.documented && w.criticality === 'critical'
  );
  undocumentedCriticalWFs.forEach(wf => {
    // Avoid duplicate if already covered by backup-owner rec
    const alreadyCovered = recs.some(
      r => r.targetId === wf.id && r.category === 'DOCUMENTATION'
    );
    if (!alreadyCovered) {
      recs.push({
        id: nextId('rec'),
        priority: 'CRITICAL',
        category: 'DOCUMENTATION',
        title: `Document CRITICAL workflow "${wf.name}"`,
        description: `"${wf.name}" is a CRITICAL workflow in ${wf.department} with zero documentation. Audit trails and continuity are impossible.`,
        impact: `Regulatory exposure, inability to audit, and complete operational halt if ${wf.owner} is unavailable.`,
        action: `Document all ${wf.steps.length} steps of "${wf.name}", including human touchpoints, tool dependencies, and decision authority.`,
        targetId: wf.id,
        targetName: wf.name,
        targetType: 'workflow',
        effort: 'Medium',
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // De-duplicate by targetId + category (keep highest priority)
  // ─────────────────────────────────────────────────────────────────────────
  const dedupMap = new Map<string, Recommendation>();
  const priorityOrder: RecPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM'];

  recs.forEach(rec => {
    const key = `${rec.targetId}::${rec.category}`;
    const existing = dedupMap.get(key);
    if (!existing) {
      dedupMap.set(key, rec);
    } else {
      if (priorityOrder.indexOf(rec.priority) < priorityOrder.indexOf(existing.priority)) {
        dedupMap.set(key, rec);
      }
    }
  });

  const deduped = Array.from(dedupMap.values());

  // Sort: CRITICAL → HIGH → MEDIUM, then by effort (Quick first)
  const effortOrder = { Quick: 0, Medium: 1, Strategic: 2 };
  deduped.sort((a, b) => {
    const pd = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    if (pd !== 0) return pd;
    return effortOrder[a.effort] - effortOrder[b.effort];
  });

  const criticalCount = deduped.filter(r => r.priority === 'CRITICAL').length;
  const highCount = deduped.filter(r => r.priority === 'HIGH').length;
  const mediumCount = deduped.filter(r => r.priority === 'MEDIUM').length;
  const healthScore = calculateHealthScore(agents);

  return {
    recommendations: deduped,
    top5: deduped.slice(0, 5),
    healthScore,
    criticalCount,
    highCount,
    mediumCount,
    prioritized: deduped,
    ownerConcentrationWarning: maxOwner,
    orphanedAgentCount: orphaned.length,
    undocumentedCriticalCount: undocumentedCritical.length,
  };
}
