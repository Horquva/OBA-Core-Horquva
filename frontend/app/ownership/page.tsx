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
import { normalizeAgent, normalizeWorkflow } from '../../lib/normalize';
import { AITool, Dataset } from '../../types';
import { buildPredictiveRiskByAgentName, PredictiveRiskEntry } from '../../lib/predictiveRisk';
import { DependencyRiskProfile } from '../../components/ownership/HumanDependencyRisks';

interface RawOwnerRow {
  name?: string;
  isHumanSpof?: boolean;
  dependencyRiskScore?: number;
  dependencyRiskTier?: string;
  ownedWorkflowCount?: number;
  criticalWorkflowCount?: number;
  ownedToolCount?: number;
  unbackedToolCount?: number;
}

export default function OwnershipPage() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [riskByAgentName, setRiskByAgentName] = useState<Map<string, PredictiveRiskEntry>>(new Map());
  const [humanSpofOwners, setHumanSpofOwners] = useState<Set<string>>(new Set());
  const [dependencyRiskByName, setDependencyRiskByName] = useState<Map<string, DependencyRiskProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    Promise.all([
      fetch(`${base}/api/agents`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/tools`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/workflows`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/predictive-risk/agents`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/ownership`, { headers: authHeader() }).then(r => r.ok ? r.json() : { owners: [] })
    ])
    .then(([agentsData, toolsData, wfsData, predictiveData, ownershipData]) => {
      setRiskByAgentName(buildPredictiveRiskByAgentName(predictiveData));
      const ownerRows = Array.isArray(ownershipData.owners) ? ownershipData.owners : [];
      setHumanSpofOwners(new Set(ownerRows.filter((o: RawOwnerRow) => o.isHumanSpof).map((o: RawOwnerRow) => o.name)));
      setDependencyRiskByName(new Map(
        ownerRows
          .filter((o: RawOwnerRow) => o.name && o.dependencyRiskScore != null)
          .map((o: RawOwnerRow) => [o.name, {
            totalRiskScore: o.dependencyRiskScore,
            tier: o.dependencyRiskTier,
            ownedWorkflowCount: o.ownedWorkflowCount,
            criticalWorkflowCount: o.criticalWorkflowCount,
            ownedToolCount: o.ownedToolCount,
            unbackedToolCount: o.unbackedToolCount,
          }])
      ));
      const agents = Array.isArray(agentsData) ? agentsData.map(normalizeAgent) : [];

      const ai_tools = Array.isArray(toolsData) ? toolsData.map((t: Record<string, unknown>) => ({
        ...t,
        access_owner: t.owner || t.access_owner || 'Unassigned',
        backup_tool: t.backupAssigned ? 'Yes' : null,
        users: [],
      } as unknown as AITool)) : [];

      const workflows = Array.isArray(wfsData) ? wfsData.map(normalizeWorkflow) : [];

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

      <OwnershipOverview agents={dataset.agents} humanSpofOwners={humanSpofOwners} />

      <div className="mt-8">
        <AccountabilityChainTable />
      </div>

      <ConcentrationBar agents={dataset.agents} />
      <DependencyPipeline dataset={dataset} riskByAgentName={riskByAgentName} humanSpofOwners={humanSpofOwners} />
      <HumanDependencyRisks dataset={dataset} riskByAgentName={riskByAgentName} dependencyRiskByName={dependencyRiskByName} />
      <OrgRelationshipMap dataset={dataset} />
      <OwnershipList agents={dataset.agents} riskByAgentName={riskByAgentName} humanSpofOwners={humanSpofOwners} />
    </div>
  );
}
