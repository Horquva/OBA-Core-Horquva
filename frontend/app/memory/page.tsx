'use client';

import { useEffect, useState, useMemo } from 'react';
import { computeOrgMemory, OrgMemoryReport } from '../../lib/orgMemory';
import { Agent, Workflow, AITool } from '../../types';
import { MemoryHeader } from '../../components/memory/MemoryHeader';
import { MemoryCarriersPanel } from '../../components/memory/MemoryCarriersPanel';
import { LostAssetsPanel } from '../../components/memory/LostAssetsPanel';
import { authHeader } from '../../lib/authFetch';
import { normalizeAgent, normalizeWorkflow } from '../../lib/normalize';

export default function MemoryPage() {
  const [agents, setAgents]     = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [tools, setTools]       = useState<AITool[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    Promise.all([
      fetch(`${base}/api/agents`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/workflows`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/tools`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
    ])
    .then(([agentsData, wData, toolsData]) => {
      const normalizedAgents: Agent[] = (Array.isArray(agentsData) ? agentsData : []).map(normalizeAgent);
      const normalizedWorkflows: Workflow[] = (Array.isArray(wData) ? wData : []).map(normalizeWorkflow);

      // Normalize tools
      const normalizedTools: AITool[] = (Array.isArray(toolsData) ? toolsData : []).map((t: any) => ({
        id: t.id?.toString() || t.tool_id?.toString() || crypto.randomUUID(),
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
    if (loading) return null;
    return computeOrgMemory(agents, workflows, tools);
  }, [agents, workflows, tools, loading]);

  if (loading || !report) {
    return (
      <div className="space-y-8 pb-12 animate-pulse mt-8 px-6">
        <div className="h-48 w-full bg-[var(--border-subtle)] rounded-xl" />
        <div className="h-96 w-full bg-[var(--border-subtle)] rounded-xl" />
        <div className="h-64 w-full bg-[var(--border-subtle)] rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mt-10 mx-6">
        Failed to load Org Memory pipeline: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Module header + KPI strip + IMHS meter */}
      <MemoryHeader report={report} />

      {/* Critical memory carriers — per-person scorecards */}
      <MemoryCarriersPanel carriers={report.carriers} />

      {/* LOST assets — no owner, no docs, no recovery */}
      <LostAssetsPanel lost={report.lost} />
    </div>
  );
}
