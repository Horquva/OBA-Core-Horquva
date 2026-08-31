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

// ─── Score calculation ────────────────────────────────────────────────────────

function buildToolScore(tool: AITool): { score: number; factors: ToolRiskFactor[] } {
  const factors: ToolRiskFactor[] = [];
  let score = 0;

  // No usage policy (documented = false means no policy)
  if (!tool.documented) {
    factors.push({ label: 'No Usage Policy Documented', points: 25, severity: 'high' });
    score += 25;
  }

  // No backup alternative
  if (!tool.backup_tool) {
    factors.push({ label: 'No Backup / Fallback Tool', points: 30, severity: 'critical' });
    score += 30;
  }

  // Business criticality weight
  const critWeights: Record<string, { points: number; severity: ToolRiskFactor['severity'] }> = {
    critical: { points: 20, severity: 'critical' },
    high:     { points: 12, severity: 'high' },
    medium:   { points: 6,  severity: 'medium' },
    low:      { points: 2,  severity: 'low' },
  };
  const cw = critWeights[tool.criticality];
  if (cw && cw.points > 0) {
    factors.push({
      label: `Business Criticality: ${tool.criticality.toUpperCase()}`,
      points: cw.points,
      severity: cw.severity,
    });
    score += cw.points;
  }

  // Wide department exposure (≥4 departments = high blast radius)
  if (tool.departments.length >= 6) {
    const pts = 20;
    factors.push({ label: `Org-Wide Exposure (${tool.departments.length} departments)`, points: pts, severity: 'critical' });
    score += pts;
  } else if (tool.departments.length >= 4) {
    const pts = 12;
    factors.push({ label: `Cross-Dept Exposure (${tool.departments.length} departments)`, points: pts, severity: 'high' });
    score += pts;
  }

  // Powers many agents
  if (tool.agents_using.length >= 3) {
    const pts = 15;
    factors.push({ label: `Powers ${tool.agents_using.length} Critical Agents`, points: pts, severity: 'high' });
    score += pts;
  } else if (tool.agents_using.length >= 1) {
    const pts = 8;
    factors.push({ label: `Used by ${tool.agents_using.length} Agent(s)`, points: pts, severity: 'medium' });
    score += pts;
  }

  return { score: Math.min(score, 100), factors };
}

function scoreToTier(score: number): ToolRiskTier {
  if (score >= 70) return 'CRITICAL';
  if (score >= 45) return 'HIGH';
  if (score >= 20) return 'MEDIUM';
  return 'LOW';
}

// ─── Outage impact simulation ─────────────────────────────────────────────────

export interface OutageImpact {
  tool: AITool;
  brokenWorkflows: Workflow[];
  brokenAgents: Agent[];
  departmentsHit: string[];
  usersAffected: number;
  estimatedRecoveryMinutes: number;
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

  // Rough recovery time estimate: 30 min base + 15 per workflow + 10 per agent
  const estimatedRecoveryMinutes = 30 + brokenWorkflows.length * 15 + brokenAgents.length * 10;

  return {
    tool,
    brokenWorkflows,
    brokenAgents,
    departmentsHit,
    usersAffected: tool.users.length,
    estimatedRecoveryMinutes,
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
  agents: Agent[]
): AIToolReport {
  const profiles: ToolRiskProfile[] = tools.map(tool => {
    const { score, factors } = buildToolScore(tool);
    const tier = scoreToTier(score);

    const isCriticalByRule =
      !tool.documented && !tool.backup_tool && (tool.criticality === 'critical' || tool.criticality === 'high');
    const hasNoBackup = !tool.backup_tool;
    const hasNoPolicy = !tool.documented;

    const affectedWorkflows = workflows.filter(w =>
      w.steps.some(s => s.actor === 'tool' && s.name === tool.name)
    );
    const affectedAgents = agents.filter(a => tool.agents_using.includes(a.id));

    return {
      tool,
      compositeScore: score,
      tier: isCriticalByRule ? 'CRITICAL' : tier,
      isCriticalByRule,
      hasNoBackup,
      hasNoPolicy,
      factors,
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
