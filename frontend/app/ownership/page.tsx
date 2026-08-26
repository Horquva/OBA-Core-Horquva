'use client';

import { useState, useEffect } from 'react';
import { OwnershipOverview } from '../../components/ownership/OwnershipOverview';
import { ConcentrationBar } from '../../components/ownership/ConcentrationBar';
import { OwnershipList } from '../../components/ownership/OwnershipList';
import { DependencyPipeline } from '../../components/ownership/DependencyPipeline';
import { HumanDependencyRisks } from '../../components/ownership/HumanDependencyRisks';
import { OrgRelationshipMap } from '../../components/ownership/OrgRelationshipMap';
import { AccountabilityChainTable } from '../../components/dashboard/AccountabilityChainTable';
import { authHeader } from '../../lib/authFetch';
import { resolveCriticality } from '../../lib/criticality';
import { Dataset } from '../../types';

export default function OwnershipPage() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [predictedScoreByAgentName, setPredictedScoreByAgentName] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    Promise.all([
      fetch(`${base}/api/agents`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/tools`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/workflows/intelligence`, { headers: authHeader() }).then(r => r.ok ? r.json() : { workflows: [] }),
      fetch(`${base}/api/predictive-risk/agents`, { headers: authHeader() }).then(r => r.ok ? r.json() : [])
    ])
    .then(([agentsData, toolsData, wfsData, predictiveData]) => {
      setPredictedScoreByAgentName(new Map(
        (Array.isArray(predictiveData) ? predictiveData : []).map((p: any) => [p.agentName, p.predictedScore])
      ));
      const agents = Array.isArray(agentsData) ? agentsData.map((a: any) => ({
        ...a,
        owner: typeof a.owner === 'object' && a.owner ? a.owner.name : a.owner,
        backup_owner: typeof a.backup_owner === 'object' && a.backup_owner ? a.backup_owner.name : a.backup_owner,
        criticality: resolveCriticality(a),
        department: a.department || (a.owner?.department) || 'Unassigned',
        documented: Boolean(a.documented ?? false),
      })) : [];

      const ai_tools = Array.isArray(toolsData) ? toolsData.map((t: any) => ({
        ...t,
        access_owner: t.owner || t.access_owner || 'Unassigned',
        backup_tool: t.backupAssigned ? 'Yes' : null,
        users: [], 
      })) : [];

      const workflows = Array.isArray(wfsData.workflows) ? wfsData.workflows.map((w: any) => ({
        name: w.workflow,
        owner: w.owner?.name || null,
        backup_owner: w.totalTools > 1 ? 'Yes' : null, // Fallback heuristic
        department: 'Operations', // Fallback
        criticality: w.riskScore > 50 ? 'critical' : 'medium',
      })) : [];

      setDataset({
        company: 'Horquva',
        employees: 0,
        agents,
        dependencies: [],
        ai_tools,
        workflows,
      });
    })
    .catch((err) => {
      setError(err.message);
    })
    .finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse pb-10">
        <div className="h-8 w-64 bg-[var(--border-subtle)] rounded mb-2"></div>
        <div className="h-4 w-96 bg-[var(--border-subtle)] rounded mb-8"></div>
        
        <div className="grid grid-cols-4 gap-5">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-[var(--border-subtle)] rounded-xl border border-[var(--border-default)]"></div>)}
        </div>
        
        <div className="h-64 w-full bg-[var(--border-subtle)] rounded-xl border border-[var(--border-default)]"></div>
        <div className="h-96 w-full bg-[var(--border-subtle)] rounded-xl border border-[var(--border-default)]"></div>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mt-10">
        Failed to load ownership dataset: {error || 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)] tracking-tight">Ownership Intelligence</h1>
        <p className="text-[color:var(--text-secondary)] mt-1">Human-agent dependency map identifying single points of failure and coverage gaps.</p>
      </div>

      <OwnershipOverview agents={dataset.agents} />

      <div className="mt-8">
        <AccountabilityChainTable />
      </div>

      <ConcentrationBar agents={dataset.agents} />
      <DependencyPipeline dataset={dataset} />
      <HumanDependencyRisks dataset={dataset} predictedScoreByAgentName={predictedScoreByAgentName} />
      <OrgRelationshipMap dataset={dataset} />
      <OwnershipList agents={dataset.agents} />
    </div>
  );
}
