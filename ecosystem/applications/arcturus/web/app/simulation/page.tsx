'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '../../services/api';
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
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    let socket: WebSocket | null = null;

    Promise.all([
      fetchApi<any[]>('/api/agents'),
      fetchApi<{ dependencies: any[] }>('/api/dependencies'),
      fetchApi<any[]>('/api/tools')
    ])
    .then(([agentsData, depsData, toolsData]) => {
      const mappedAgents: Agent[] = Array.isArray(agentsData)
        ? agentsData.map((a: any) => ({
            ...a,
            id: a?.id?.toString() || '',
            owner: typeof a?.owner === 'object' && a?.owner ? a.owner.name || '' : a?.owner || '',
            backup_owner: typeof a?.backup_owner === 'object' && a?.backup_owner ? a.backup_owner.name || '' : a?.backup_owner || '',
          }))
        : [];

      setAgents(mappedAgents);
      setDependencies(Array.isArray(depsData?.dependencies) ? depsData.dependencies : []);
      setTools(Array.isArray(toolsData) ? toolsData : []);
      setLoading(false);
    })
    .catch((err) => {
      console.error('Failed to fetch initial simulation data:', err);
      setError('Simulation initial data load karne me error aya.');
      setLoading(false);
    });

    if (typeof window !== 'undefined') {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsBase = process.env.NEXT_PUBLIC_WS_URL || `${wsProtocol}//${window.location.host}`;
      const wsUrl = wsBase.startsWith('ws://') || wsBase.startsWith('wss://')
        ? `${wsBase.replace(/\/$/, '')}/api/websocket/simulation_stream`
        : `${wsProtocol}//${wsBase.replace(/\/$/, '')}/api/websocket/simulation_stream`;

      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          setWsStatus('connected');
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload?.type === 'agent_update' && payload?.data) {
              setAgents((prev) =>
                prev.map((agent) => (agent.id === payload.data.id ? { ...agent, ...payload.data } : agent))
              );
            }
          } catch (e) {
            console.error('WebSocket stream parse error:', e);
          }
        };

        socket.onerror = (err) => {
          console.error('WebSocket Error:', err);
          setWsStatus('disconnected');
        };

        socket.onclose = () => {
          setWsStatus('disconnected');
        };
      } catch (err) {
        console.error('Failed to construct WebSocket:', err);
        setWsStatus('disconnected');
      }
    }

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  if (loading) {
    return <div className="p-6 text-gray-400">Simulation data loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">What-If Scenario & Live Simulation</h1>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400">Stream Status:</span>
          <span
            className={`px-2 py-0.5 rounded-full font-medium ${
              wsStatus === 'connected'
                ? 'bg-green-500/20 text-green-400'
                : wsStatus === 'connecting'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {wsStatus.toUpperCase()}
          </span>
        </div>
      </div>

      <SimulationDashboard agents={agents} dependencies={dependencies} tools={tools} />
      <TwinHealthIndex agents={agents} />
      <TwinSyncStatus agents={agents} />
      <ScenarioSandbox agents={agents} dependencies={dependencies} />
      <SimulationUniverseRanking agents={agents} />
    </div>
  );
}
