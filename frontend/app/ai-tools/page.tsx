'use client';

import { useEffect, useState, useMemo } from 'react';
import { computeAIToolIntelligence, AIToolReport } from '../../lib/aiToolIntelligence';
import { AITool, Agent, Workflow } from '../../types';
import { AIToolHeader } from '../../components/ai-tools/AIToolHeader';
import { CriticalToolPanel } from '../../components/ai-tools/CriticalToolPanel';
import { ToolRiskTable } from '../../components/ai-tools/ToolRiskTable';
import { OutageImpactPanel } from '../../components/ai-tools/OutageImpactPanel';
import { DeptExposureTable } from '../../components/ai-tools/DeptExposureTable';
import { authHeader } from '../../lib/authFetch';
import { resolveCriticality } from '../../lib/criticality';
import { ExternalEcosystemTab } from '../../components/ai-tools/ExternalEcosystemTab';

export default function AIToolsPage() {
  const [tools, setTools]       = useState<AITool[]>([]);
  const [agents, setAgents]     = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    Promise.all([
      fetch(`${base}/api/tools`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/agents`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/workflows/intelligence`, { headers: authHeader() }).then(r => r.ok ? r.json() : { workflows: [] }),
    ])
    .then(([toolsData, agentsData, wData]) => {
      // Normalize tools
      const normalizedTools: AITool[] = (Array.isArray(toolsData) ? toolsData : []).map((t: any) => ({
        id: t.id?.toString() || '',
        name: t.name || 'Unknown Tool',
        vendor: t.vendor || t.provider || 'Unknown',
        category: t.category || 'General',
        users: Array.isArray(t.users) ? t.users : [],
        departments: Array.isArray(t.departments) ? t.departments : (t.department ? [t.department] : []),
        workflows: Array.isArray(t.workflows) ? t.workflows : [],
        agents_using: Array.isArray(t.agents_using) ? t.agents_using.map(String) : [],
        monthly_cost_usd: Number(t.monthly_cost_usd ?? t.monthly_cost ?? 0),
        criticality: t.criticality || t.risk || 'low',
        documented: Boolean(t.documented ?? t.has_policy ?? false),
        backup_tool: t.backup_tool || t.fallback_tool || null,
        access_owner: t.access_owner || t.owner || 'Unassigned',
      }));

      // Normalize agents
      const normalizedAgents: Agent[] = (Array.isArray(agentsData) ? agentsData : []).map((a: any) => ({
        id: a.id?.toString() || '',
        name: a.name || 'Unknown Agent',
        owner: typeof a.owner === 'object' && a.owner ? a.owner.name : (a.owner || null),
        backup_owner: typeof a.backup_owner === 'object' && a.backup_owner ? a.backup_owner.name : (a.backup_owner || null),
        criticality: resolveCriticality(a),
        department: a.department || 'Operations',
        documented: Boolean(a.documented ?? false),
      }));

      // Normalize workflows
      const rawWorkflows = Array.isArray(wData.workflows) ? wData.workflows : [];
      const normalizedWorkflows: Workflow[] = rawWorkflows.map((w: any) => ({
        id: w.id?.toString() || '',
        name: w.name || 'Unknown Workflow',
        owner: w.owner || 'Unassigned',
        backup_owner: w.backup_owner || null,
        department: w.department || 'Operations',
        criticality: w.criticality || 'low',
        documented: Boolean(w.documented ?? false),
        steps: Array.isArray(w.steps) ? w.steps : [],
      }));

      setTools(normalizedTools);
      setAgents(normalizedAgents);
      setWorkflows(normalizedWorkflows);
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
  }, []);

  const report: AIToolReport | null = useMemo(() => {
    if (tools.length === 0 && !loading) return computeAIToolIntelligence([], [], []);
    if (loading) return null;
    return computeAIToolIntelligence(tools, workflows, agents);
  }, [tools, agents, workflows, loading]);

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

      {/* External ecosystem tab receives live tools for vendor derivation */}
      <ExternalEcosystemTab tools={tools} />
    </div>
  );
}
