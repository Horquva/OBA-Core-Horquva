'use client';

import { useEffect, useState } from 'react';
import { DependencyKPIs } from '../../components/map/DependencyKPIs';
import { FlowCanvas } from '../../components/map/FlowCanvas';
import { DependencyTable } from '../../components/map/DependencyTable';
import { BlastRadiusSimulator } from '../../components/map/BlastRadiusSimulator';
import { DependencyEvolutionTab } from '../../components/map/DependencyEvolutionTab';
import { HiddenDependencyOverlay } from '../../components/map/HiddenDependencyOverlay';
import { getSPOFs, getDownstream } from '../../lib/graph';
import { authHeader } from '../../lib/authFetch';
import { Agent, Dependency } from '../../types';

export default function DependencyMapPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';
    
    Promise.all([
      fetch(`${base}/api/agents`, { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load agents');
        return r.json();
      }),
      fetch(`${base}/api/dependencies`, { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load dependencies');
        return r.json();
      })
    ])
    .then(([agentsData, depsData]) => {
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

      setAgents(mappedAgents);
      setDependencies(mappedDeps);
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
      <div className="p-6 md:p-10 max-w-7xl mx-auto h-full flex flex-col space-y-8 animate-pulse">
        <div className="mb-4">
          <div className="h-8 w-64 bg-[var(--border-subtle)] rounded mb-2"></div>
          <div className="h-4 w-96 bg-[var(--border-subtle)] rounded"></div>
        </div>
        <div className="grid grid-cols-4 gap-5">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-[var(--border-subtle)] rounded-xl"></div>)}
        </div>
        <div className="h-[600px] w-full bg-[var(--border-subtle)] rounded-xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mt-10 max-w-7xl mx-auto">
        Failed to load dependency map dataset: {error || 'Unknown error'}
      </div>
    );
  }

  const spofs = getSPOFs(agents, dependencies);
  
  let maxCascadeRisk = 0;
  agents.forEach(agent => {
    const victims = getDownstream(agent.id, dependencies);
    if (victims.size > maxCascadeRisk) {
      maxCascadeRisk = victims.size;
    }
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto h-full flex flex-col animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Dependency Intelligence</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Map how agents depend on each other, detect single points of failure, and simulate cascading risks.
        </p>
      </div>

      <DependencyKPIs 
        totalAgents={agents.length}
        totalDependencies={dependencies.length}
        spofCount={spofs.length}
        maxCascadeRisk={maxCascadeRisk}
      />

      <div className="animate-fade-up delay-300 mb-8">
        <FlowCanvas agents={agents} dependencies={dependencies} />
      </div>

      {/* Blast Radius Simulator — click any agent, see impact cascade */}
      <div className="mb-8">
        <BlastRadiusSimulator agents={agents} dependencies={dependencies} />
      </div>

      {/* Hidden Dependency Overlay — transitive / shared-resource / shared-owner edges */}
      <div className="mb-8">
        <HiddenDependencyOverlay agents={agents} dependencies={dependencies} />
      </div>

      {/* Dependency Evolution — snapshot diffs and fragility trend */}
      <div className="mb-8">
        <DependencyEvolutionTab agents={agents} dependencies={dependencies} />
      </div>

      <div className="animate-fade-up delay-400">
        <DependencyTable agents={agents} dependencies={dependencies} />
      </div>
    </div>
  );
}
