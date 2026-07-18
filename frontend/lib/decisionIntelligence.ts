// lib/decisionIntelligence.ts
// Module 14 — Decision Intelligence

// ─── Types ────────────────────────────────────────────────────────────────────

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
  /** Org-wide Decision Quality Index 0–100 */
  dqi: number;
  dqiVerdict: 'STRONG' | 'MIXED' | 'WEAK' | 'CRITICAL';
  totalDecisions: number;
  /** Per-person concentration: owner → agent count */
  ownerConcentration: Record<string, number>;
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

const PENALTY_OWNERSHIP_ORPHANED = 65;
const PENALTY_WORKFLOW_ORPHANED  = 50;
const PENALTY_NO_BACKUP          = 25;
const PENALTY_NO_DOCS_AGENT      = 20;
const PENALTY_NO_DOCS_TOOL       = 15;
const PENALTY_NO_DOCS_WORKFLOW   = 15;
const PENALTY_CONCENTRATION      = 20;   // owner has 5+ agents
const PENALTY_CRITICAL_NO_BACKUP = 15;
const PENALTY_CRITICAL_NO_FALLBACK = 30; // critical tool, no fallback

function qualityTier(score: number): QualityTier {
  if (score >= 80) return 'GOOD';
  if (score >= 55) return 'ACCEPTABLE';
  if (score >= 30) return 'POOR';
  return 'HARMFUL';
}

// ─── Ownership decision scoring ───────────────────────────────────────────────

function scoreAgentDecision(
  agent: {
    id: string; name: string; owner: string | null; backup_owner: string | null;
    criticality: string; department: string; documented: boolean;
  },
  ownerAgentCount: Record<string, number>
): DecisionRecord {
  let score = 100;
  const influences: DecisionInfluence[] = [];

  const isCritical = agent.criticality === 'critical';
  const isHigh     = agent.criticality === 'high';

  // Orphaned agent
  if (!agent.owner) {
    score -= PENALTY_OWNERSHIP_ORPHANED;
    influences.push({
      factor: 'No Owner Assigned',
      impact: 'negative',
      detail: `Agent left unassigned — nobody is accountable (−${PENALTY_OWNERSHIP_ORPHANED})`,
    });
  } else {
    influences.push({
      factor: 'Owner Assigned',
      impact: 'positive',
      detail: `${agent.owner} holds ownership of this agent`,
    });

    // Concentration: owner manages 5+ agents
    const count = ownerAgentCount[agent.owner] ?? 0;
    if (count >= 5) {
      score -= PENALTY_CONCENTRATION;
      influences.push({
        factor: 'Owner Concentration Risk',
        impact: 'negative',
        detail: `${agent.owner} owns ${count} agents — excessive concentration (−${PENALTY_CONCENTRATION})`,
      });
    }
  }

  // No backup owner
  if (!agent.backup_owner) {
    score -= PENALTY_NO_BACKUP;
    influences.push({
      factor: 'No Backup Owner',
      impact: 'negative',
      detail: `No fallback person if the owner is unavailable (−${PENALTY_NO_BACKUP})`,
    });
  } else {
    influences.push({
      factor: 'Backup Owner Present',
      impact: 'positive',
      detail: `${agent.backup_owner} can step in if needed`,
    });
  }

  // Not documented
  if (!agent.documented) {
    score -= PENALTY_NO_DOCS_AGENT;
    influences.push({
      factor: 'No Documentation / Runbook',
      impact: 'negative',
      detail: `Agent deployed without a runbook — tribal knowledge risk (−${PENALTY_NO_DOCS_AGENT})`,
    });
  } else {
    influences.push({
      factor: 'Documented',
      impact: 'positive',
      detail: 'Runbook or documentation exists for this agent',
    });
  }

  // Critical with no backup
  if ((isCritical || isHigh) && !agent.backup_owner) {
    score -= PENALTY_CRITICAL_NO_BACKUP;
    influences.push({
      factor: `${agent.criticality.charAt(0).toUpperCase() + agent.criticality.slice(1)} Asset — No Backup`,
      impact: 'negative',
      detail: `High-stakes agent with no coverage (−${PENALTY_CRITICAL_NO_BACKUP})`,
    });
  }

  score = Math.max(0, score);
  const quality = qualityTier(score);

  const fix = (quality === 'POOR' || quality === 'HARMFUL')
    ? buildAgentFix(agent)
    : null;

  const trailSummary = buildAgentTrail(agent, ownerAgentCount);

  return {
    id: `dec_${agent.id}`,
    decision: agent.owner
      ? `Assign "${agent.name}" to ${agent.owner}`
      : `Leave "${agent.name}" unassigned`,
    category: 'ownership',
    subject: agent.name,
    subjectId: agent.id,
    criticality: agent.criticality,
    department: agent.department,
    decisionMaker: agent.owner,
    score,
    quality,
    influences,
    fix,
    trailSummary,
  };
}

function buildAgentFix(agent: {
  name: string; owner: string | null; backup_owner: string | null;
  criticality: string; documented: boolean;
}): string {
  const parts: string[] = [];
  if (!agent.owner)         parts.push(`Assign a primary owner for "${agent.name}"`);
  if (!agent.backup_owner)  parts.push(`Designate a backup owner`);
  if (!agent.documented)    parts.push(`Create a runbook / documentation`);
  return parts.join('; ') + '.';
}

function buildAgentTrail(
  agent: { name: string; owner: string | null; backup_owner: string | null; criticality: string; documented: boolean; department: string },
  ownerAgentCount: Record<string, number>
): string {
  if (!agent.owner) {
    return `"${agent.name}" was deployed in ${agent.department} without assigning any owner, leaving it orphaned with no accountable stakeholder.`;
  }
  const count = ownerAgentCount[agent.owner] ?? 0;
  const concentration = count >= 5 ? ` ${agent.owner} was already managing ${count} agents, creating unsafe concentration.` : '';
  const backup = agent.backup_owner ? ` ${agent.backup_owner} was named as backup.` : ` No backup was designated.`;
  const docs = agent.documented ? ` Documentation was created.' ` : ` No runbook was created.`;
  return `"${agent.name}" was assigned to ${agent.owner} in ${agent.department}.${concentration}${backup}${docs}`;
}

// ─── Tooling decision scoring ─────────────────────────────────────────────────

function scoreToolDecision(
  tool: {
    id: string; name: string; access_owner: string | null; backup_tool: string | null;
    criticality: string; documented: boolean; departments: string[];
  },
  toolMap: Record<string, string>   // id → name
): DecisionRecord {
  let score = 100;
  const influences: DecisionInfluence[] = [];

  const isCritical = tool.criticality === 'critical';

  // No access owner
  if (!tool.access_owner) {
    score -= PENALTY_OWNERSHIP_ORPHANED;
    influences.push({
      factor: 'No Access Owner',
      impact: 'negative',
      detail: `Tool adopted with no designated access owner (−${PENALTY_OWNERSHIP_ORPHANED})`,
    });
  } else {
    influences.push({
      factor: 'Access Owner Assigned',
      impact: 'positive',
      detail: `${tool.access_owner} manages access and governance`,
    });
  }

  // No fallback tool
  if (!tool.backup_tool) {
    const penalty = isCritical ? PENALTY_CRITICAL_NO_FALLBACK : PENALTY_NO_BACKUP;
    score -= penalty;
    influences.push({
      factor: isCritical ? 'Critical Tool — No Fallback' : 'No Fallback Tool',
      impact: 'negative',
      detail: isCritical
        ? `Critical tool adopted with zero fallback selected (−${penalty})`
        : `No backup tool designated if this tool becomes unavailable (−${penalty})`,
    });
  } else {
    influences.push({
      factor: 'Fallback Tool Available',
      impact: 'positive',
      detail: `${toolMap[tool.backup_tool] ?? tool.backup_tool} is the designated fallback`,
    });
  }

  // Not documented
  if (!tool.documented) {
    score -= PENALTY_NO_DOCS_TOOL;
    influences.push({
      factor: 'No Documentation',
      impact: 'negative',
      detail: `Tool deployed without usage documentation or runbook (−${PENALTY_NO_DOCS_TOOL})`,
    });
  } else {
    influences.push({
      factor: 'Documented',
      impact: 'positive',
      detail: 'Usage documentation exists for this tool',
    });
  }

  score = Math.max(0, score);
  const quality = qualityTier(score);

  const fix = (quality === 'POOR' || quality === 'HARMFUL')
    ? buildToolFix(tool)
    : null;

  const dept = tool.departments?.[0] ?? 'General';
  const trailSummary = buildToolTrail(tool, dept, toolMap);

  return {
    id: `dec_${tool.id}`,
    decision: `Adopt "${tool.name}" as ${tool.criticality} AI tool`,
    category: 'tooling',
    subject: tool.name,
    subjectId: tool.id,
    criticality: tool.criticality,
    department: dept,
    decisionMaker: tool.access_owner,
    score,
    quality,
    influences,
    fix,
    trailSummary,
  };
}

function buildToolFix(tool: {
  name: string; access_owner: string | null; backup_tool: string | null; documented: boolean;
}): string {
  const parts: string[] = [];
  if (!tool.access_owner) parts.push(`Assign an access owner for "${tool.name}"`);
  if (!tool.backup_tool)  parts.push(`Select a fallback tool in case of outage`);
  if (!tool.documented)   parts.push(`Create usage documentation / runbook`);
  return parts.join('; ') + '.';
}

function buildToolTrail(
  tool: { name: string; access_owner: string | null; backup_tool: string | null; criticality: string; documented: boolean },
  dept: string,
  toolMap: Record<string, string>
): string {
  const owner = tool.access_owner ? `Access was granted by ${tool.access_owner}` : 'No access owner was assigned';
  const fallback = tool.backup_tool
    ? `${toolMap[tool.backup_tool] ?? tool.backup_tool} was chosen as the fallback`
    : 'No fallback tool was selected';
  const docs = tool.documented ? 'Documentation was created' : 'No documentation was produced';
  return `"${tool.name}" was adopted as a ${tool.criticality} tool across ${dept}. ${owner}. ${fallback}. ${docs}.`;
}

// ─── Workflow decision scoring ─────────────────────────────────────────────────

function scoreWorkflowDecision(
  wf: {
    id: string; name: string; owner: string | null; backup_owner: string | null;
    department: string; criticality: string; documented: boolean;
  }
): DecisionRecord {
  let score = 100;
  const influences: DecisionInfluence[] = [];

  const isCritical = wf.criticality === 'critical';
  const isHigh     = wf.criticality === 'high';

  // Orphaned workflow
  if (!wf.owner) {
    score -= PENALTY_WORKFLOW_ORPHANED;
    influences.push({
      factor: 'No Workflow Owner',
      impact: 'negative',
      detail: `Workflow left without an owner — no accountable stakeholder (−${PENALTY_WORKFLOW_ORPHANED})`,
    });
  } else {
    influences.push({
      factor: 'Owner Assigned',
      impact: 'positive',
      detail: `${wf.owner} is responsible for this workflow`,
    });
  }

  // No backup owner
  if (!wf.backup_owner) {
    score -= PENALTY_NO_BACKUP;
    influences.push({
      factor: 'No Backup Owner',
      impact: 'negative',
      detail: `No fallback person if the workflow owner is unavailable (−${PENALTY_NO_BACKUP})`,
    });
  } else {
    influences.push({
      factor: 'Backup Owner Present',
      impact: 'positive',
      detail: `${wf.backup_owner} can step in if needed`,
    });
  }

  // Not documented
  if (!wf.documented) {
    score -= PENALTY_NO_DOCS_WORKFLOW;
    influences.push({
      factor: 'No Documentation / SOP',
      impact: 'negative',
      detail: `Workflow set up without a standard operating procedure (−${PENALTY_NO_DOCS_WORKFLOW})`,
    });
  } else {
    influences.push({
      factor: 'Documented',
      impact: 'positive',
      detail: 'SOP / documentation exists for this workflow',
    });
  }

  // Critical/high with no backup
  if ((isCritical || isHigh) && !wf.backup_owner) {
    score -= PENALTY_CRITICAL_NO_BACKUP;
    influences.push({
      factor: `${wf.criticality.charAt(0).toUpperCase() + wf.criticality.slice(1)} Workflow — No Backup`,
      impact: 'negative',
      detail: `High-stakes workflow with zero backup coverage (−${PENALTY_CRITICAL_NO_BACKUP})`,
    });
  }

  score = Math.max(0, score);
  const quality = qualityTier(score);

  const fix = (quality === 'POOR' || quality === 'HARMFUL')
    ? buildWorkflowFix(wf)
    : null;

  const trailSummary = buildWorkflowTrail(wf);

  return {
    id: `dec_${wf.id}`,
    decision: wf.owner
      ? `Set up "${wf.name}" under ${wf.owner}`
      : `Deploy "${wf.name}" with no owner`,
    category: 'workflow',
    subject: wf.name,
    subjectId: wf.id,
    criticality: wf.criticality,
    department: wf.department,
    decisionMaker: wf.owner,
    score,
    quality,
    influences,
    fix,
    trailSummary,
  };
}

function buildWorkflowFix(wf: {
  name: string; owner: string | null; backup_owner: string | null; documented: boolean;
}): string {
  const parts: string[] = [];
  if (!wf.owner)        parts.push(`Assign a primary owner for "${wf.name}"`);
  if (!wf.backup_owner) parts.push(`Designate a backup owner`);
  if (!wf.documented)   parts.push(`Create a standard operating procedure (SOP)`);
  return parts.join('; ') + '.';
}

function buildWorkflowTrail(wf: {
  name: string; owner: string | null; backup_owner: string | null;
  criticality: string; documented: boolean; department: string;
}): string {
  if (!wf.owner) {
    return `"${wf.name}" was deployed in ${wf.department} without assigning an owner — creating an unowned ${wf.criticality} process.`;
  }
  const backup = wf.backup_owner ? `${wf.backup_owner} was named as backup` : 'No backup was named';
  const docs = wf.documented ? 'An SOP was documented' : 'No SOP was created';
  return `"${wf.name}" was established under ${wf.owner} in ${wf.department}. ${backup}. ${docs}.`;
}

// ─── DQI Calculation ──────────────────────────────────────────────────────────

function calcDQI(decisions: DecisionRecord[]): number {
  if (decisions.length === 0) return 100;
  const avg = decisions.reduce((s, d) => s + d.score, 0) / decisions.length;
  return Math.round(avg);
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function computeDecisionIntelligence(
  agents: {
    id: string; name: string; owner: string | null; backup_owner: string | null;
    criticality: string; department: string; documented: boolean;
  }[],
  workflows: {
    id: string; name: string; owner: string | null; backup_owner: string | null;
    department: string; criticality: string; documented: boolean;
  }[],
  tools: {
    id: string; name: string; access_owner: string | null; backup_tool: string | null;
    criticality: string; documented: boolean;
    users: string[]; departments: string[];
  }[]
): DecisionIntelligenceReport {
  // Build owner → agent count for concentration checks
  const ownerAgentCount: Record<string, number> = {};
  agents.forEach(a => {
    if (a.owner) {
      ownerAgentCount[a.owner] = (ownerAgentCount[a.owner] ?? 0) + 1;
    }
  });

  // Build tool id → name map
  const toolMap: Record<string, string> = {};
  tools.forEach(t => { toolMap[t.id] = t.name; });

  const agentDecisions    = agents.map(a => scoreAgentDecision(a, ownerAgentCount));
  const workflowDecisions = workflows.map(w => scoreWorkflowDecision(w));
  const toolDecisions     = tools.map(t => scoreToolDecision(t, toolMap));

  const decisions = [...agentDecisions, ...workflowDecisions, ...toolDecisions];
  // Sort by score ascending (worst first)
  decisions.sort((a, b) => a.score - b.score);

  const dqi = calcDQI(decisions);
  const dqiVerdict: DecisionIntelligenceReport['dqiVerdict'] =
    dqi >= 80 ? 'STRONG' :
    dqi >= 55 ? 'MIXED'  :
    dqi >= 30 ? 'WEAK'   : 'CRITICAL';

  return {
    decisions,
    good:       decisions.filter(d => d.quality === 'GOOD'),
    acceptable: decisions.filter(d => d.quality === 'ACCEPTABLE'),
    poor:       decisions.filter(d => d.quality === 'POOR'),
    harmful:    decisions.filter(d => d.quality === 'HARMFUL'),
    dqi,
    dqiVerdict,
    totalDecisions: decisions.length,
    ownerConcentration: ownerAgentCount,
  };
}
