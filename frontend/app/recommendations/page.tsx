'use client';

import { useEffect, useState, useMemo } from 'react';
import { generateRecommendations, RecommendationEngineOutput } from '../../lib/recommendations';
import RecommendationHeader from '../../components/recommendations/RecommendationHeader';
import Top5Urgent from '../../components/recommendations/Top5Urgent';
import RecommendationList from '../../components/recommendations/RecommendationList';
import DemoSummary from '../../components/recommendations/DemoSummary';
import { DecisionSupportQueue } from '../../components/recommendations/DecisionSupportQueue';
import { OpportunityBacklogTab } from '../../components/recommendations/OpportunityBacklogTab';
import { authHeader } from '../../lib/authFetch';
import { VerifiedAdvisorPanel } from '../../components/recommendations/VerifiedAdvisorPanel';
import { Dataset } from '../../types';

export default function RecommendationsPage() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [orgHealthIndex, setOrgHealthIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    Promise.all([
      fetch(`${base}/api/agents`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/dependencies`, { headers: authHeader() }).then(r => r.ok ? r.json() : { dependencies: [] }),
      fetch(`${base}/api/tools`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/workflows/intelligence`, { headers: authHeader() }).then(r => r.ok ? r.json() : { workflows: [] }),
      fetch(`${base}/api/health/summary`, { headers: authHeader() }).then(r => r.ok ? r.json() : { healthIndex: 0 }),
    ])
    .then(([agentsData, depsData, toolsData, wData, healthData]) => {
      setOrgHealthIndex(healthData.healthIndex ?? 0);
      setDataset({
        company: 'Organizational Intelligence',
        agents: Array.isArray(agentsData) ? agentsData.map((a: any) => ({
          ...a,
          id: a.id?.toString() || '',
          owner: typeof a.owner === 'object' && a.owner ? a.owner.name : a.owner,
          backup_owner: typeof a.backup_owner === 'object' && a.backup_owner ? a.backup_owner.name : a.backup_owner,
          criticality: a.risk || a.criticality || 'low',
          department: a.department || 'Operations',
        })) : [],
        dependencies: Array.isArray(depsData.dependencies) ? depsData.dependencies.filter((d: any) => d.source_type === 'agent' && d.target_type === 'agent').map((d: any) => ({
          from: d.source_id?.toString() || '',
          to: d.target_id?.toString() || '',
          type: d.dependency_type || 'sequential',
        })) : [],
        ai_tools: Array.isArray(toolsData) ? toolsData.map((t: any) => ({
          ...t,
          access_owner: t.owner || t.access_owner || 'Unassigned',
          backup_tool: t.backupAssigned ? 'Yes' : null,
          users: [],
        })) : [],
        workflows: Array.isArray(wData.workflows) ? wData.workflows.map((w: any) => ({
          ...w,
          department: w.department || 'Operations',
        })) : [],
        employees: 156,
      });
    })
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
  }, []);

  const output: RecommendationEngineOutput | null = useMemo(() => {
    if (!dataset) return null;
    return generateRecommendations(dataset, orgHealthIndex);
  }, [dataset, orgHealthIndex]);

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mt-10 max-w-7xl mx-auto">
        Failed to load recommendations environment: {error}
      </div>
    );
  }

  if (loading || !output) {
    return (
      <div className="flex flex-col gap-5 pb-12 animate-pulse mt-8 px-6 md:px-10 max-w-7xl w-full mx-auto">
        <div className="h-48 w-full bg-[var(--border-subtle)] rounded-xl"></div>
        <div className="h-64 w-full bg-[var(--border-subtle)] rounded-xl"></div>
        <div className="h-[400px] w-full bg-[var(--border-subtle)] rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-6 md:px-10 max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <RecommendationHeader output={output} />
      <Top5Urgent top5={output.top5} />
      <DecisionSupportQueue recommendations={output.prioritized} />
      <OpportunityBacklogTab recommendations={output.prioritized} />
      <VerifiedAdvisorPanel recommendations={output.prioritized} />
      <RecommendationList recommendations={output.prioritized} />
      <DemoSummary
        output={output}
        company={dataset!.company}
        agentCount={dataset!.agents.length}
      />
    </div>
  );
}
