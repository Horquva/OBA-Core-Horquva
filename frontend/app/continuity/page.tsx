'use client';

import { useEffect, useState, useMemo } from 'react';
import { computeContinuityRisk } from '../../lib/continuityRisk';
import { Agent, Workflow, AITool } from '../../types';
import { AutomationStatusStrip } from '../../components/continuity/AutomationStatusStrip';
import { ContinuityTab, ContinuityPayload } from '../../components/continuity/ContinuityTab';
import { GovernanceTab, GovernancePayload } from '../../components/continuity/GovernanceTab';
import { authHeader } from '../../lib/authFetch';
import { resolveCriticality } from '../../lib/criticality';
import { ModuleResult } from '../../lib/moduleResult';

export default function ContinuityPage() {
  const [agents, setAgents]     = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [tools, setTools]       = useState<AITool[]>([]);
  const [continuityModule, setContinuityModule] = useState<ModuleResult<ContinuityPayload> | null>(null);
  const [governanceModule, setGovernanceModule] = useState<ModuleResult<GovernancePayload> | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    Promise.all([
      fetch(`${base}/api/agents`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/workflows/intelligence`, { headers: authHeader() }).then(r => r.ok ? r.json() : { workflows: [] }),
      fetch(`${base}/api/tools`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      // M18/M19 -- real brain modules that were computed all along but never
      // exposed via a route; the page badged its sections "M18"/"M19" for a
      // locally-computed heuristic that was neither of those modules' output.
      fetch(`${base}/api/intelligence/continuity`, { headers: authHeader() }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${base}/api/intelligence/governance`, { headers: authHeader() }).then(r => r.ok ? r.json() : null).catch(() => null),
    ])
    .then(([agentsData, wData, toolsData, continuityData, governanceData]) => {
      setContinuityModule(continuityData);
      setGovernanceModule(governanceData);
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
        owner: typeof w.owner === 'object' && w.owner ? w.owner.name : (w.owner || 'Unassigned'),
        backup_owner: typeof w.backup_owner === 'object' && w.backup_owner ? w.backup_owner.name : (w.backup_owner || null),
        department: w.department || 'Operations',
        criticality: w.criticality || 'low',
        documented: Boolean(w.documented ?? false),
        steps: Array.isArray(w.steps) ? w.steps : [],
      }));

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
    return computeContinuityRisk({
      company: 'Organization',
      employees: 0,
      dependencies: [],
      agents,
      workflows,
      ai_tools: tools,
    });
  }, [agents, workflows, tools, loading]);

  if (loading || !report) {
    return (
      <div className="space-y-8 pb-12 animate-pulse mt-8 px-6 max-w-7xl mx-auto">
        <div className="h-64 w-full bg-[var(--border-subtle)] rounded-xl" />
        <div className="flex flex-col xl:flex-row gap-8">
           <div className="flex-1 h-96 bg-[var(--border-subtle)] rounded-xl" />
           <div className="flex-1 h-96 bg-[var(--border-subtle)] rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mt-10 max-w-7xl mx-auto">
        Failed to load Continuity Intelligence pipeline: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Continuity & Governance</h1>
        <p className="text-sm text-[color:var(--text-secondary)] mt-1">Disruption survival modeling and compliance auditing across all assets.</p>
      </div>

      {/* Advisory mode strip (M52 & M53) */}
      <AutomationStatusStrip />
      
      {/* Layout split: Continuity on left, Governance on right (or stacked on mobile) */}
      <div className="flex flex-col xl:flex-row gap-8">
        
        {/* Continuity (M18) */}
        <section className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4 px-1">
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Disruption Continuity</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">M18</span>
          </div>
          <ContinuityTab report={report} module={continuityModule} />
        </section>

        <div className="hidden xl:block w-px bg-[color:var(--border-subtle)]" />

        {/* Governance (M19) */}
        <section className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4 px-1">
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Compliance Governance</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-sky-500/30 text-sky-400 bg-sky-500/10">M19</span>
          </div>
          <GovernanceTab report={report} module={governanceModule} />
        </section>

      </div>
    </div>
  );
}
