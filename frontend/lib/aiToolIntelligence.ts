import { AITool, Workflow, Agent } from '../types';

// ─── Risk Tier ───────────────────────────────────────────────────────────────

export type ToolRiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ToolRiskFactor {
  label: string;
  points: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ToolRiskProfile {
  tool: AITool;

  /** Composite risk score (0–100) */
  compositeScore: number;

  /** Tier derived from composite score */
  tier: ToolRiskTier;

  /** Is CRITICAL by hard rule (no policy + no backup + critical business use) */
  isCriticalByRule: boolean;

  /** Has no backup/fallback tool assigned */
  hasNoBackup: boolean;

  /** Has no usage policy documented */
  hasNoPolicy: boolean;

  /** Individual risk factors */
  factors: ToolRiskFactor[];

  /** Workflows that break if this tool goes offline */
  affectedWorkflows: Workflow[];

  /** Agents that use this tool */
  affectedAgents: Agent[];

  /** Department exposure count */
  departmentCount: number;
}

// ─── Score (from the backend) ─────────────────────────────────────────────────

/** GET /api/tools now computes compositeScore/tier/isCriticalByRule/riskFactors
 *  itself (backend/routes/tools.js's computeToolRiskScore()) -- this used to
 *  be buildToolScore()/scoreToTier(), a client-side reimplementation of the
 *  identical weights. Callers pass the raw per-tool fields straight through;
 *  see ToolScoreInput below for what ai-tools/page.tsx must capture from the
 *  fetch response before normalizing into AITool. */
export interface ToolScoreInput {
  compositeScore: number;
  tier: ToolRiskTier;
  isCriticalByRule: boolean;
  factors: ToolRiskFactor[];
}

// ─── Outage impact simulation ─────────────────────────────────────────────────

export interface OutageImpact {
  tool: AITool;
  brokenWorkflows: Workflow[];
  brokenAgents: Agent[];
  departmentsHit: string[];
  usersAffected: number;
}

export function simulateOutage(tool: AITool, workflows: Workflow[], agents: Agent[]): OutageImpact {
  const brokenWorkflows = workflows.filter(w =>
    w.steps.some(s => s.actor === 'tool' && s.name === tool.name)
  );

  const brokenAgents = agents.filter(a => tool.agents_using.includes(a.id));

  const departmentsHit = Array.from(new Set([
    ...brokenWorkflows.map(w => w.department),
    ...brokenAgents.map(a => a.department),
  ]));

  return {
    tool,
    brokenWorkflows,
    brokenAgents,
    departmentsHit,
    usersAffected: tool.users.length,
  };
}

// ─── Department exposure map ──────────────────────────────────────────────────

export interface DeptExposure {
  department: string;
  tools: string[];
  toolCount: number;
  criticalToolCount: number;
  monthlySpend: number;
}

export function buildDeptExposure(tools: AITool[]): DeptExposure[] {
  const map = new Map<string, { tools: string[]; criticalCount: number; spend: number }>();

  for (const tool of tools) {
    for (const dept of tool.departments) {
      if (!map.has(dept)) {
        map.set(dept, { tools: [], criticalCount: 0, spend: 0 });
      }
      const entry = map.get(dept)!;
      entry.tools.push(tool.name);
      if (tool.criticality === 'critical' || tool.criticality === 'high') {
        entry.criticalCount++;
      }
      // Distribute cost evenly across departments
      entry.spend += Math.round(tool.monthly_cost_usd / tool.departments.length);
    }
  }

  return Array.from(map.entries())
    .map(([department, data]) => ({
      department,
      tools: data.tools,
      toolCount: data.tools.length,
      criticalToolCount: data.criticalCount,
      monthlySpend: data.spend,
    }))
    .sort((a, b) => b.criticalToolCount - a.criticalToolCount || b.toolCount - a.toolCount);
}

// ─── Main report ─────────────────────────────────────────────────────────────

export interface AIToolReport {
  profiles: ToolRiskProfile[];
  criticalTools: ToolRiskProfile[];
  highTools: ToolRiskProfile[];
  mediumTools: ToolRiskProfile[];
  lowTools: ToolRiskProfile[];
  totalMonthlySpend: number;
  toolsWithNoBackup: number;
  toolsWithNoPolicy: number;
  totalUsers: number;
  deptExposure: DeptExposure[];
  outageImpacts: OutageImpact[];
}

export function computeAIToolIntelligence(
  tools: AITool[],
  workflows: Workflow[],
  agents: Agent[],
  scoreByToolId: Map<string, ToolScoreInput>
): AIToolReport {
  const profiles: ToolRiskProfile[] = tools.map(tool => {
    // Real backend score (backend/routes/tools.js's computeToolRiskScore()) --
    // falls back to LOW/0 only if a tool is somehow missing from the map
    // (fetch failure), never re-derived locally.
    const scored = scoreByToolId.get(tool.id);
    const hasNoBackup = !tool.backup_tool;
    const hasNoPolicy = !tool.documented;

    const affectedWorkflows = workflows.filter(w =>
      w.steps.some(s => s.actor === 'tool' && s.name === tool.name)
    );
    const affectedAgents = agents.filter(a => tool.agents_using.includes(a.id));

    return {
      tool,
      compositeScore: scored?.compositeScore ?? 0,
      tier: scored?.tier ?? 'LOW',
      isCriticalByRule: scored?.isCriticalByRule ?? false,
      hasNoBackup,
      hasNoPolicy,
      factors: scored?.factors ?? [],
      affectedWorkflows,
      affectedAgents,
      departmentCount: tool.departments.length,
    };
  });

  // Sort: CRITICAL first, then by score
  profiles.sort((a, b) => {
    if (a.tier === 'CRITICAL' && b.tier !== 'CRITICAL') return -1;
    if (a.tier !== 'CRITICAL' && b.tier === 'CRITICAL') return 1;
    return b.compositeScore - a.compositeScore;
  });

  const criticalTools = profiles.filter(p => p.tier === 'CRITICAL');
  const highTools     = profiles.filter(p => p.tier === 'HIGH');
  const mediumTools   = profiles.filter(p => p.tier === 'MEDIUM');
  const lowTools      = profiles.filter(p => p.tier === 'LOW');

  const totalMonthlySpend = tools.reduce((sum, t) => sum + t.monthly_cost_usd, 0);
  const toolsWithNoBackup = tools.filter(t => !t.backup_tool).length;
  const toolsWithNoPolicy = tools.filter(t => !t.documented).length;
  const totalUsers = new Set(tools.flatMap(t => t.users)).size;

  const deptExposure = buildDeptExposure(tools);
  const outageImpacts = tools.map(t => simulateOutage(t, workflows, agents));

  return {
    profiles,
    criticalTools,
    highTools,
    mediumTools,
    lowTools,
    totalMonthlySpend,
    toolsWithNoBackup,
    toolsWithNoPolicy,
    totalUsers,
    deptExposure,
    outageImpacts,
  };
}
