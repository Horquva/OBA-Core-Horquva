'use client';

import { useEffect, useState, useMemo } from 'react';
import { computeAIToolIntelligence, AIToolReport, ToolScoreInput } from '../../lib/aiToolIntelligence';
import { AITool, Agent, Workflow, RiskLevel } from '../../types';
import { AIToolHeader } from '../../components/ai-tools/AIToolHeader';
import { CriticalToolPanel } from '../../components/ai-tools/CriticalToolPanel';
import { ToolRiskTable } from '../../components/ai-tools/ToolRiskTable';
import { OutageImpactPanel } from '../../components/ai-tools/OutageImpactPanel';
import { DeptExposureTable } from '../../components/ai-tools/DeptExposureTable';
import { authHeader } from '../../lib/authFetch';
import { normalizeAgent, normalizeWorkflow } from '../../lib/normalize';
import { ExternalEcosystemTab } from '../../components/ai-tools/ExternalEcosystemTab';

interface RawTool {
  id?: string | number;
  name?: string;
  vendor?: string;
  provider?: string;
  category?: string;
  users?: string[];
  departments?: string[];
  department?: string;
  workflows?: string[];
  agents_using?: (string | number)[];
  monthly_cost_usd?: number;
  monthly_cost?: number;
  criticality?: string;
  risk?: string;
  documented?: boolean;
  has_policy?: boolean;
  backup_tool?: string | null;
  fallback_tool?: string | null;
  access_owner?: string;
  owner?: string;
  compositeScore?: number;
  tier?: string;
  isCriticalByRule?: boolean;
  riskFactors?: unknown[];
}

export default function AIToolsPage() {
  const [tools, setTools]       = useState<AITool[]>([]);
  const [agents, setAgents]     = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [scoreByToolId, setScoreByToolId] = useState<Map<string, ToolScoreInput>>(new Map());
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    Promise.all([
      fetch(`${base}/api/tools`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/agents`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/workflows`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
    ])
    .then(([toolsData, agentsData, wData]) => {
      const rawTools = Array.isArray(toolsData) ? toolsData : [];

      // Normalize tools
      const normalizedTools: AITool[] = rawTools.map((t: RawTool) => ({
        id: t.id?.toString() || '',
        name: t.name || 'Unknown Tool',
        vendor: t.vendor || t.provider || 'Unknown',
        category: t.category || 'General',
        users: Array.isArray(t.users) ? t.users : [],
        departments: Array.isArray(t.departments) ? t.departments : (t.department ? [t.department] : []),
        workflows: Array.isArray(t.workflows) ? t.workflows : [],
        agents_using: Array.isArray(t.agents_using) ? t.agents_using.map(String) : [],
        monthly_cost_usd: Number(t.monthly_cost_usd ?? t.monthly_cost ?? 0),
        criticality: (t.criticality || t.risk || 'low') as RiskLevel,
        documented: Boolean(t.documented ?? t.has_policy ?? false),
        backup_tool: t.backup_tool || t.fallback_tool || null,
        access_owner: t.access_owner || t.owner || 'Unassigned',
      }));

      // Real score/tier/factors from backend/routes/tools.js's
      // computeToolRiskScore() -- captured separately from AITool since the
      // shared type is used by pages that don't need it.
      const scoreMap = new Map<string, ToolScoreInput>(
        rawTools
          .filter((t: RawTool) => t.id != null && typeof t.compositeScore === 'number')
          .map((t: RawTool) => [String(t.id), {
            compositeScore: t.compositeScore as number,
            tier: t.tier as ToolScoreInput['tier'],
            isCriticalByRule: Boolean(t.isCriticalByRule),
            factors: (Array.isArray(t.riskFactors) ? t.riskFactors : []) as ToolScoreInput['factors'],
          }])
      );

      const normalizedAgents: Agent[] = (Array.isArray(agentsData) ? agentsData : []).map(normalizeAgent);
      const normalizedWorkflows: Workflow[] = (Array.isArray(wData) ? wData : []).map(normalizeWorkflow);

      setTools(normalizedTools);
      setAgents(normalizedAgents);
      setWorkflows(normalizedWorkflows);
      setScoreByToolId(scoreMap);
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
  }, []);

  const report: AIToolReport | null = useMemo(() => {
    if (tools.length === 0 && !loading) return computeAIToolIntelligence([], [], [], scoreByToolId);
    if (loading) return null;
    return computeAIToolIntelligence(tools, workflows, agents, scoreByToolId);
  }, [tools, agents, workflows, scoreByToolId, loading]);

  if (loading || !report) {
    return (
      <div className="space-y-8 pb-12 animate-pulse mt-8 px-6">
        <div className="h-48 w-full bg-[var(--border-subtle)] rounded-xl" />
        <div className="h-72 w-full bg-[var(--border-subtle)] rounded-xl" />
        <div className="h-64 w-full bg-[var(--border-subtle)] rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mt-10 mx-6">
        Failed to load AI Tool Intelligence: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <AIToolHeader report={report} />
      <CriticalToolPanel criticalTools={report.criticalTools} />

      {report.highTools.length > 0 && (
        <ToolRiskTable
          tools={report.highTools}
          title="High Risk Tools"
          subtitle="Score ≥ 45 — Escalate to department heads and assign backup alternatives"
          tier="HIGH"
        />
      )}

      {report.mediumTools.length > 0 && (
        <ToolRiskTable
          tools={report.mediumTools}
          title="Medium Risk Tools"
          subtitle="Score ≥ 20 — Document policies and schedule usage reviews"
          tier="MEDIUM"
        />
      )}

      {report.lowTools.length > 0 && (
        <ToolRiskTable
          tools={report.lowTools}
          title="Low Risk Tools"
          subtitle="Score < 20 — Well-governed, continue monitoring"
          tier="LOW"
        />
      )}

      <OutageImpactPanel outageImpacts={report.outageImpacts} />

      <DeptExposureTable
        deptExposure={report.deptExposure}
        totalMonthlySpend={report.totalMonthlySpend}
      />

      {/* External ecosystem tab groups the same canonical per-tool risk
          profiles ToolRiskTable/CriticalToolPanel use -- see aiToolIntelligence.ts */}
      <ExternalEcosystemTab profiles={report.profiles} />
    </div>
  );
}
