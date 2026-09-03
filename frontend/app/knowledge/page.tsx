'use client';

import { useEffect, useState, useMemo } from 'react';
import { computeKnowledgeRisk, ConcentrationEntry } from '../../lib/knowledgeRisk';
import { Agent, Workflow, AITool, RiskLevel } from '../../types';
import { KnowledgeHeader } from '../../components/knowledge/KnowledgeHeader';
import { ConcentrationRiskPanel } from '../../components/knowledge/ConcentrationRiskPanel';
import { UndocumentedAssetsTable } from '../../components/knowledge/UndocumentedAssetsTable';
import { DepartureSim } from '../../components/knowledge/DepartureSim';
import { KnowledgeGapsPanel } from '../../components/knowledge/KnowledgeGapsPanel';
import { authHeader } from '../../lib/authFetch';
import { normalizeAgent, normalizeWorkflow } from '../../lib/normalize';
import { KnowledgeConcentrationGauge } from '../../components/knowledge/KnowledgeConcentrationGauge';
import { EntitySearchPanel } from '../../components/knowledge/EntitySearchPanel';

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
  access_owner?: string | { name?: string };
  owner?: string | { name?: string };
}

interface RawConcentrationEntry {
  name?: string;
  concentrationScore?: number;
  tier?: string;
}

export default function KnowledgePage() {
  const [agents, setAgents]     = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [tools, setTools]       = useState<AITool[]>([]);
  const [concentrationByName, setConcentrationByName] = useState<Map<string, ConcentrationEntry>>(new Map());
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    Promise.all([
      fetch(`${base}/api/agents`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/workflows`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/tools`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/knowledge/intelligence`, { headers: authHeader() }).then(r => r.ok ? r.json() : { concentration: [] }),
    ])
    .then(([agentsData, wData, toolsData, knowledgeIntel]) => {
      setConcentrationByName(new Map(
        (Array.isArray(knowledgeIntel.concentration) ? knowledgeIntel.concentration : [])
          .filter((p: RawConcentrationEntry) => p.name)
          .map((p: RawConcentrationEntry) => [p.name, { concentrationScore: p.concentrationScore, tier: p.tier }])
      ));
      const normalizedAgents: Agent[] = (Array.isArray(agentsData) ? agentsData : []).map(normalizeAgent);
      const normalizedWorkflows: Workflow[] = (Array.isArray(wData) ? wData : []).map(normalizeWorkflow);

      const normalizedTools: AITool[] = (Array.isArray(toolsData) ? toolsData : []).map((t: RawTool) => ({
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
        access_owner: (() => {
          const raw = t.access_owner || t.owner;
          return (typeof raw === 'object' && raw ? raw.name : raw) || 'Unassigned';
        })(),
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
    return computeKnowledgeRisk(agents, workflows, tools, concentrationByName);
  }, [agents, workflows, tools, loading, concentrationByName]);

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
