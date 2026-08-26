'use client';

import { useEffect, useState, useMemo } from 'react';
import { computeKnowledgeRisk } from '../../lib/knowledgeRisk';
import { Agent, Workflow, AITool } from '../../types';
import { KnowledgeHeader } from '../../components/knowledge/KnowledgeHeader';
import { ConcentrationRiskPanel } from '../../components/knowledge/ConcentrationRiskPanel';
import { UndocumentedAssetsTable } from '../../components/knowledge/UndocumentedAssetsTable';
import { DepartureSim } from '../../components/knowledge/DepartureSim';
import { KnowledgeGapsPanel } from '../../components/knowledge/KnowledgeGapsPanel';
import { authHeader } from '../../lib/authFetch';
import { resolveCriticality } from '../../lib/criticality';
import { KnowledgeConcentrationGauge } from '../../components/knowledge/KnowledgeConcentrationGauge';
import { EntitySearchPanel } from '../../components/knowledge/EntitySearchPanel';

export default function KnowledgePage() {
  const [agents, setAgents]     = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [tools, setTools]       = useState<AITool[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    Promise.all([
      fetch(`${base}/api/agents`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/workflows/intelligence`, { headers: authHeader() }).then(r => r.ok ? r.json() : { workflows: [] }),
      fetch(`${base}/api/tools`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
    ])
    .then(([agentsData, wData, toolsData]) => {
      const normalizedAgents: Agent[] = (Array.isArray(agentsData) ? agentsData : []).map((a: any) => ({
        id: a.id?.toString() || '',
        name: a.name || 'Unknown Agent',
        owner: typeof a.owner === 'object' && a.owner ? a.owner.name : (a.owner || null),
        backup_owner: typeof a.backup_owner === 'object' && a.backup_owner ? a.backup_owner.name : (a.backup_owner || null),
        criticality: resolveCriticality(a),
        department: a.department || 'Operations',
        documented: Boolean(a.documented ?? false),
      }));

      const rawWorkflows = Array.isArray(wData.workflows) ? wData.workflows : [];
      const normalizedWorkflows: Workflow[] = rawWorkflows.map((w: any) => ({
        id: w.id?.toString() || '',
        name: w.name || 'Unknown Workflow',
        owner: typeof w.owner === 'object' && w.owner ? w.owner.name : (w.owner || 'Unassigned'),
        backup_owner: typeof w.backup_owner === 'object' && w.backup_owner ? w.backup_owner.name : (w.backup_owner || null),
        department: w.department || 'Operations',
        criticality: w.criticality || 'low',
        documented: Boolean(w.documented ?? false),
        steps: Array.isArray(w.steps) ? w.steps : [],
      }));

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
        access_owner: typeof (t.access_owner || t.owner) === 'object' && (t.access_owner || t.owner) ? (t.access_owner || t.owner).name : (t.access_owner || t.owner || 'Unassigned'),
      }));

      setAgents(normalizedAgents);
      setWorkflows(normalizedWorkflows);
      setTools(normalizedTools);
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
  }, []);

  const report = useMemo(() => {
    if (agents.length === 0 && !loading) return computeKnowledgeRisk([], [], []);
    if (loading) return null;
    return computeKnowledgeRisk(agents, workflows, tools);
  }, [agents, workflows, tools, loading]);

  if (loading || !report) {
    return (
      <div className="space-y-8 pb-12 animate-pulse mt-8 px-6">
        <div className="h-48 w-full bg-[var(--border-subtle)] rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-[var(--border-subtle)] rounded-xl" />
          <div className="h-96 bg-[var(--border-subtle)] rounded-xl" />
        </div>
        <div className="h-96 w-full bg-[var(--border-subtle)] rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mt-10 mx-6">
        Failed to load Knowledge Risk Intelligence: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <KnowledgeHeader report={report} />
      <EntitySearchPanel report={report} />
      <KnowledgeConcentrationGauge profiles={report.profiles} totalAssets={report.totalAssets} />
      <ConcentrationRiskPanel profiles={report.profiles} />
      <DepartureSim profiles={report.profiles} />
      <UndocumentedAssetsTable assets={report.undocumentedAssets} />
      <KnowledgeGapsPanel gaps={report.knowledgeGaps} />
    </div>
  );
}
