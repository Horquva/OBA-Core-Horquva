'use client';

import { useEffect, useState } from 'react';
import { SimulationDashboard } from '../../components/simulation/SimulationDashboard';
import { SimulationUniverseRanking } from '../../components/simulation/SimulationUniverseRanking';
import { TwinHealthIndex } from '../../components/simulation/TwinHealthIndex';
import { TwinSyncStatus } from '../../components/simulation/TwinSyncStatus';
import { ScenarioSandbox } from '../../components/simulation/ScenarioSandbox';
import { Agent, AITool } from '../../types';
import { request, predictiveApi, healthApi, ApiError } from '../../lib/api';
import { ScenarioResult, mapScenario, RawScenario } from '../../lib/simulation';
import { normalizeAgent, RawAgent } from '../../lib/normalize';
import { buildPredictiveRiskByAgentName, PredictiveRiskEntry } from '../../lib/predictiveRisk';
import { UnavailableBanner } from '../../components/ui/UnavailableBanner';

interface AgentSpofsResponse {
  spofs: { agentId: number; name: string; victimsCount: number }[];
  spofCount: number;
  maxCascadeRisk: number;
}

export default function SimulationPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tools, setTools] = useState<AITool[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioResult[]>([]);
  const [healthIndex, setHealthIndex] = useState<number>(0);
  const [riskByAgentName, setRiskByAgentName] = useState<Map<string, PredictiveRiskEntry>>(new Map());
  const [spofIds, setSpofIds] = useState<Set<string>>(new Set());
  const [predictiveRiskUnavailable, setPredictiveRiskUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      request<RawAgent[]>('/api/agents'),
      // Server-computed — same SPOF definition (sole owner, no backup,
      // criticality >= high) used everywhere else, not reimplemented here.
      request<AgentSpofsResponse>('/api/dependencies/agent-spofs'),
      request<Record<string, unknown>[]>('/api/tools'),
      request<{ scenarios: RawScenario[] }>('/api/simulations/rank'),
      healthApi.summary(),
      // Soft fallback: agents/spofs/tools/scenarios/health are this page's
      // own dataset (an outage there fails the page, below), predictive
      // risk is a supplementary overlay -- losing it means every agent's
      // risk badge falls back to its own 'low' default (F-11) rather than
      // blanking the page. predictiveRiskUnavailable makes that visible (F-12).
      predictiveApi.agents().catch(() => {
        setPredictiveRiskUnavailable(true);
        return [];
      }),
    ])
    .then(([agentsData, spofsData, toolsData, rankData, healthData, predictiveData]) => {
      setHealthIndex(healthData.healthIndex ?? 0);
      setRiskByAgentName(buildPredictiveRiskByAgentName(predictiveData));
      const mappedAgents: Agent[] = Array.isArray(agentsData) ? agentsData.map(normalizeAgent) : [];

      const mappedTools: AITool[] = Array.isArray(toolsData) ? toolsData.map((t: Record<string, unknown>) => ({
        ...t,
        access_owner: t.owner || t.access_owner || 'Unassigned',
        backup_tool: t.backupAssigned ? 'Yes' : null,
        users: [],
      } as unknown as AITool)) : [];

      setAgents(mappedAgents);
      setTools(mappedTools);
      setSpofIds(new Set((spofsData?.spofs ?? []).map(s => String(s.agentId))));
      setScenarios(Array.isArray(rankData.scenarios) ? rankData.scenarios.map(mapScenario) : []);
    })
    .catch((err: unknown) => {
      setError(err instanceof ApiError ? `${err.status} — ${err.message}` : 'Failed to load simulation data');
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

      {predictiveRiskUnavailable && (
        <div className="px-6 md:px-10 max-w-7xl w-full mx-auto">
          <UnavailableBanner label="Predictive risk scores" />
        </div>
      )}

      {/* Twin Controls */}
      <div className="px-6 md:px-10 max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <TwinHealthIndex agents={agents} healthIndex={healthIndex} />
        <TwinSyncStatus agents={agents} tools={tools} />
        <ScenarioSandbox agents={agents} tools={tools} riskByAgentName={riskByAgentName} spofIds={spofIds} />
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
