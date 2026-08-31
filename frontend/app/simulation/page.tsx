'use client';

import { useEffect, useState } from 'react';
import { SimulationDashboard } from '../../components/simulation/SimulationDashboard';
import { SimulationUniverseRanking } from '../../components/simulation/SimulationUniverseRanking';
import { TwinHealthIndex } from '../../components/simulation/TwinHealthIndex';
import { TwinSyncStatus } from '../../components/simulation/TwinSyncStatus';
import { ScenarioSandbox } from '../../components/simulation/ScenarioSandbox';
import { Agent, Dependency, AITool } from '../../types';

export default function SimulationPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [tools, setTools] = useState<AITool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';
    
    Promise.all([
      fetch(`${base}/api/agents`).then(r => {
        if (!r.ok) throw new Error('Failed to load agents');
        return r.json();
      }),
      fetch(`${base}/api/dependencies`).then(r => {
        if (!r.ok) throw new Error('Failed to load dependencies');
        return r.json();
      }),
      fetch(`${base}/api/tools`).then(r => {
        if (!r.ok) throw new Error('Failed to load tools');
        return r.json();
      })
    ])
    .then(([agentsData, depsData, toolsData]) => {
      const mappedAgents: Agent[] = Array.isArray(agentsData) ? agentsData.map((a: any) => ({
        ...a,
        id: a.id?.toString() || '',
        owner: typeof a.owner === 'object' && a.owner ? a.owner.name : a.owner,
        backup_owner: typeof a.backup_owner === 'object' && a.backup_owner ? a.backup_owner.name : a.backup_owner,
        criticality: a.risk || a.criticality || 'low',
        department: a.department || (a.owner?.department) || 'Unassigned',
        documented: true,
      })) : [];

      const mappedDeps: Dependency[] = Array.isArray(depsData.dependencies) 
        ? depsData.dependencies
          .filter((d: any) => d.source_type === 'agent' && d.target_type === 'agent')
          .map((d: any) => ({
            from: d.source_id?.toString() || '',
            to: d.target_id?.toString() || '',
            type: d.dependency_type || 'sequential',
          })) 
        : [];

      const mappedTools: AITool[] = Array.isArray(toolsData) ? toolsData.map((t: any) => ({
        ...t,
        access_owner: t.owner || t.access_owner || 'Unassigned',
        backup_tool: t.backupAssigned ? 'Yes' : null,
        users: [], 
      })) : [];

      setAgents(mappedAgents);
      setDependencies(mappedDeps);
      setTools(mappedTools);
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
      <div className="flex flex-col gap-8 pb-12 animate-pulse mt-8 px-6 md:px-10 max-w-7xl w-full mx-auto">
        <div className="h-[600px] w-full bg-[var(--border-subtle)] rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-48 bg-[var(--border-subtle)] rounded-xl"></div>
          <div className="h-48 bg-[var(--border-subtle)] rounded-xl"></div>
          <div className="h-48 bg-[var(--border-subtle)] rounded-xl"></div>
        </div>
        <div className="h-[400px] w-full bg-[var(--border-subtle)] rounded-xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mt-10 max-w-7xl mx-auto">
        Failed to load simulation environment: {error || 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <div style={{ height: 'calc(100vh - 2rem)' }}>
        <SimulationDashboard
          agents={agents}
          dependencies={dependencies}
          tools={tools}
        />
      </div>

      {/* Twin Controls */}
      <div className="px-6 md:px-10 max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <TwinHealthIndex agents={agents} />
        <TwinSyncStatus agents={agents} tools={tools} />
        <ScenarioSandbox agents={agents} dependencies={dependencies} tools={tools} />
      </div>

      {/* Full universe ranking — every entity ranked by survivability */}
      <div className="px-6 md:px-10 max-w-7xl w-full mx-auto">
        <SimulationUniverseRanking
          agents={agents}
          dependencies={dependencies}
          tools={tools}
        />
      </div>
    </div>
  );
}
