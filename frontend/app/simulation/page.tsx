'use client';

import { useEffect, useState } from 'react';
import { SimulationDashboard } from '../../components/simulation/SimulationDashboard';
import { SimulationUniverseRanking } from '../../components/simulation/SimulationUniverseRanking';
import { TwinHealthIndex } from '../../components/simulation/TwinHealthIndex';
import { TwinSyncStatus } from '../../components/simulation/TwinSyncStatus';
import { ScenarioSandbox } from '../../components/simulation/ScenarioSandbox';
import { Agent, Dependency, AITool } from '../../types';
import { authHeader } from '../../lib/authFetch';
import { ScenarioResult, mapScenario } from '../../lib/simulation';
import { normalizeAgent } from '../../lib/normalize';
import { buildPredictiveRiskByAgentName, PredictiveRiskEntry } from '../../lib/predictiveRisk';

interface RawDependency {
  source_type?: string;
  target_type?: string;
  source_id?: string | number;
  target_id?: string | number;
  dependency_type?: string;
}

export default function SimulationPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [tools, setTools] = useState<AITool[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioResult[]>([]);
  const [healthIndex, setHealthIndex] = useState<number>(0);
  const [riskByAgentName, setRiskByAgentName] = useState<Map<string, PredictiveRiskEntry>>(new Map());
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
      }),
      fetch(`${base}/api/tools`, { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load tools');
        return r.json();
      }),
      fetch(`${base}/api/simulations/rank`, { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load simulations');
        return r.json();
      }),
      fetch(`${base}/api/health/summary`, { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load org health');
        return r.json();
      }),
      fetch(`${base}/api/predictive-risk/agents`, { headers: authHeader() }).then(r => r.ok ? r.json() : [])
    ])
    .then(([agentsData, depsData, toolsData, rankData, healthData, predictiveData]) => {
      setHealthIndex(healthData.healthIndex ?? 0);
      setRiskByAgentName(buildPredictiveRiskByAgentName(predictiveData));
      const mappedAgents: Agent[] = Array.isArray(agentsData) ? agentsData.map(normalizeAgent) : [];

      const mappedDeps: Dependency[] = Array.isArray(depsData.dependencies) 
        ? depsData.dependencies
          .filter((d: RawDependency) => d.source_type === 'agent' && d.target_type === 'agent')
          .map((d: RawDependency) => ({
            from: d.source_id?.toString() || '',
            to: d.target_id?.toString() || '',
            type: d.dependency_type || 'sequential',
          })) 
        : [];

      const mappedTools: AITool[] = Array.isArray(toolsData) ? toolsData.map((t: Record<string, unknown>) => ({
        ...t,
        access_owner: t.owner || t.access_owner || 'Unassigned',
        backup_tool: t.backupAssigned ? 'Yes' : null,
        users: [],
      } as unknown as AITool)) : [];

      setAgents(mappedAgents);
      setDependencies(mappedDeps);
      setTools(mappedTools);
      setScenarios(Array.isArray(rankData.scenarios) ? rankData.scenarios.map(mapScenario) : []);
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
          scenarios={scenarios}
        />
      </div>

      {/* Twin Controls */}
      <div className="px-6 md:px-10 max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <TwinHealthIndex agents={agents} healthIndex={healthIndex} />
        <TwinSyncStatus agents={agents} tools={tools} />
        <ScenarioSandbox agents={agents} dependencies={dependencies} tools={tools} riskByAgentName={riskByAgentName} />
      </div>

      {/* Full universe ranking — every entity ranked by survivability */}
      <div className="px-6 md:px-10 max-w-7xl w-full mx-auto">
        <SimulationUniverseRanking
          scenarios={scenarios}
        />
      </div>
    </div>
  );
}
