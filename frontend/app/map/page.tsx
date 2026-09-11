'use client';

import { useEffect, useState } from 'react';
import { DependencyKPIs } from '../../components/map/DependencyKPIs';
import { FlowCanvas } from '../../components/map/FlowCanvas';
import { DependencyTable } from '../../components/map/DependencyTable';
import { BlastRadiusSimulator } from '../../components/map/BlastRadiusSimulator';
import { DependencyEvolutionTab } from '../../components/map/DependencyEvolutionTab';
import { HiddenDependencyOverlay } from '../../components/map/HiddenDependencyOverlay';
import { request, predictiveApi, ApiError } from '../../lib/api';
import { normalizeAgent, RawAgent } from '../../lib/normalize';
import { buildPredictiveRiskByAgentName, PredictiveRiskEntry } from '../../lib/predictiveRisk';
import { Agent, Dependency } from '../../types';
import { UnavailableBanner } from '../../components/ui/UnavailableBanner';

interface AgentSpofsResponse {
  spofs: { agentId: number; name: string; victimsCount: number }[];
  spofCount: number;
  maxCascadeRisk: number;
}

interface RawDependency {
  source_type?: string;
  target_type?: string;
  source_id?: string | number;
  target_id?: string | number;
  dependency_type?: string;
}

export default function DependencyMapPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [spofData, setSpofData] = useState<AgentSpofsResponse | null>(null);
  const [riskByAgentName, setRiskByAgentName] = useState<Map<string, PredictiveRiskEntry>>(new Map());
  const [predictiveRiskUnavailable, setPredictiveRiskUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      request<RawAgent[]>('/api/agents'),
      request<{ dependencies: RawDependency[] }>('/api/dependencies'),
      // Server-computed — the canonical SPOF definition (sole owner, no
      // backup, criticality >= high; see domain/definitions.js's
      // spofVerdict()) lives in backend/routes/dependencies.js instead of
      // being reimplemented here and in every component that needs to know
      // which agents are SPOFs.
      request<AgentSpofsResponse>('/api/dependencies/agent-spofs'),
      // Soft fallback: agents/dependencies/SPOFs are this page's own
      // dataset (an outage there fails the page, below), predictive risk is
      // a supplementary overlay -- losing it means every agent's risk badge
      // falls back to its own 'low' default (F-11) rather than blanking the
      // map. predictiveRiskUnavailable makes that degrade visible (F-12).
      predictiveApi.agents().catch(() => {
        setPredictiveRiskUnavailable(true);
        return [];
      }),
    ])
    .then(([agentsData, depsData, spofsData, predictiveData]) => {
      setRiskByAgentName(buildPredictiveRiskByAgentName(predictiveData));
      const mappedAgents: Agent[] = Array.isArray(agentsData) ? agentsData.map(normalizeAgent) : [];

      const mappedDeps: Dependency[] = Array.isArray(depsData.dependencies)
        ? depsData.dependencies
          .filter((d: RawDependency) => d.source_type === 'agent' && d.target_type === 'agent')
          .map((d: RawDependency) => ({
            from: d.source_id?.toString() || '',
            to: d.target_id?.toString() || '',
            // 'sequential' was a leftover from the old sunrise_care.json
            // vocabulary (types/index.ts's own comment) and isn't a valid
            // Dependency['type'] value -- 'normal' is company.json's actual
            // low-severity default.
            type: (d.dependency_type || 'normal') as Dependency['type'],
          }))
        : [];

      setAgents(mappedAgents);
      setDependencies(mappedDeps);
      setSpofData(spofsData);
    })
    .catch((err: unknown) => {
      setError(err instanceof ApiError ? `${err.status} — ${err.message}` : 'Failed to load dependency map data');
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

  const spofCount = spofData?.spofCount ?? 0;
  const maxCascadeRisk = spofData?.maxCascadeRisk ?? 0;
  const spofIds = new Set((spofData?.spofs ?? []).map(s => String(s.agentId)));

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto h-full flex flex-col animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Dependency Intelligence</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Map how agents depend on each other, detect single points of failure, and simulate cascading risks.
        </p>
      </div>

      {predictiveRiskUnavailable && (
        <div className="mb-8">
          <UnavailableBanner label="Predictive risk scores" />
        </div>
      )}

      <DependencyKPIs
        totalAgents={agents.length}
        totalDependencies={dependencies.length}
        spofCount={spofCount}
        maxCascadeRisk={maxCascadeRisk}
      />

      <div className="animate-fade-up delay-300 mb-8">
        <FlowCanvas agents={agents} dependencies={dependencies} spofIds={spofIds} />
      </div>

      {/* Blast Radius Simulator — click any agent, see impact cascade */}
      <div className="mb-8">
        <BlastRadiusSimulator agents={agents} dependencies={dependencies} riskByAgentName={riskByAgentName} />
      </div>

      {/* Hidden Dependency Overlay — transitive / same-department / shared-owner edges */}
      <div className="mb-8">
        <HiddenDependencyOverlay agents={agents} dependencies={dependencies} />
      </div>

      {/* Dependency Evolution — snapshot diffs and fragility trend */}
      <div className="mb-8">
        <DependencyEvolutionTab agents={agents} dependencies={dependencies} />
      </div>

      <div className="animate-fade-up delay-400">
        <DependencyTable agents={agents} dependencies={dependencies} spofIds={spofIds} />
      </div>
    </div>
  );
}
