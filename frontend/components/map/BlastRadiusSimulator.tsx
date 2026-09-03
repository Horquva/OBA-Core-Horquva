'use client';

import React, { useState } from 'react';
import { Agent, Dependency, RiskLevel } from '../../types';
import { TruthBadge } from '../dashboard/TruthBadge';
import { PredictiveRiskEntry } from '../../lib/predictiveRisk';
import { Zap, ChevronDown } from 'lucide-react';

interface Props {
  agents: Agent[];
  dependencies: Dependency[];
  riskByAgentName: Map<string, PredictiveRiskEntry>;
}

/**
 * BFS with hop tracking only -- graph traversal, not a judgment (same class
 * as lib/graph.ts's getDownstream/getUpstream). A Dependency edge means
 * `from` depends_on `to`, so what breaks when `startId` fails is whatever
 * points AT it -- walk backward (dependentsOf), same direction fix as
 * getDownstream(). Impact severity previously came from a decay formula
 * (0.65^hop * 100) with no real basis -- "impact fades with distance" is a
 * narrative assumption, not a measured fact. It's now the real predictedScore
 * (domain/derived.js's predictiveRisk(), the same score shown everywhere
 * else in the app) for whichever agent is actually hit at each hop, not a
 * distance-derived guess.
 */
function computeBlastRadius(
  startId: string,
  agents: Agent[],
  dependencies: Dependency[],
  maxHops: number
) {
  const dependentsOf: Record<string, string[]> = {};
  dependencies.forEach(d => {
    if (!dependentsOf[d.to]) dependentsOf[d.to] = [];
    dependentsOf[d.to].push(d.from);
  });

  const result: { agentId: string; agentName: string; hop: number }[] = [];
  const visited = new Set<string>();
  const q: { id: string; hop: number }[] = [{ id: startId, hop: 0 }];

  while (q.length > 0) {
    const { id: curr, hop } = q.shift()!;
    if (hop >= maxHops || visited.has(curr)) continue;
    visited.add(curr);

    const neighbors = dependentsOf[curr] || [];
    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        const hopNum = hop + 1;
        const agent = agents.find(a => a.id === neighborId);
        if (agent) {
          result.push({ agentId: neighborId, agentName: agent.name, hop: hopNum });
        }
        q.push({ id: neighborId, hop: hopNum });
      }
    });
  }

  return result;
}

const RISK_COLOR: Record<RiskLevel, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  high:     'text-orange-400 bg-orange-500/10 border-orange-500/20',
  medium:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  low:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

export function BlastRadiusSimulator({ agents, dependencies, riskByAgentName }: Props) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [maxHops, setMaxHops] = useState(3);

  const selected = selectedId ? agents.find(a => a.id === selectedId) : null;
  const cascade = selectedId ? computeBlastRadius(selectedId, agents, dependencies, maxHops) : [];

  return (
    <div className="flex flex-col rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/2 -translate-y-1/2" />

      <div className="flex items-center justify-between mb-6 z-10">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Blast Radius Simulator</h2>
          </div>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">Select any agent to see its dependency cascade, ranked by each victim&apos;s real risk score</p>
        </div>
        <TruthBadge verified={agents.length > 0 && dependencies.length > 0} />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6 z-10">
        <div className="flex-1 min-w-48 relative">
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="w-full appearance-none px-4 py-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-orange-500/50 cursor-pointer pr-8"
          >
            <option value="" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">— Select a node to simulate —</option>
            {agents.map(a => (
              <option key={a.id} value={a.id} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">{a.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--text-tertiary)] pointer-events-none" />
        </div>

        <div className="flex flex-col gap-1 min-w-48">
          <div className="flex items-center justify-between text-xs text-[color:var(--text-tertiary)]">
            <span>Hop Depth</span>
            <span className="font-semibold text-[color:var(--text-secondary)]">{maxHops} hops</span>
          </div>
          <input
            type="range"
            min={1}
            max={6}
            value={maxHops}
            onChange={e => setMaxHops(Number(e.target.value))}
            className="w-full accent-orange-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Results */}
      {!selectedId && (
        <div className="flex items-center justify-center h-28 rounded-lg border border-dashed border-[color:var(--border-subtle)] z-10">
          <p className="text-sm text-[color:var(--text-tertiary)]">Select an agent above to simulate blast radius</p>
        </div>
      )}

      {selectedId && cascade.length === 0 && (
        <div className="flex items-center justify-center h-28 rounded-lg border border-dashed border-emerald-500/20 bg-emerald-500/5 z-10">
          <p className="text-sm text-emerald-400">✓ No downstream dependencies — this agent is isolated</p>
        </div>
      )}

      {selectedId && cascade.length > 0 && (
        <div className="z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-[color:var(--text-secondary)]">
              If <strong className="text-[color:var(--text-primary)]">{selected?.name}</strong> fails,{' '}
              <strong className="text-orange-400">{cascade.length} agent{cascade.length > 1 ? 's' : ''}</strong> will be affected:
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cascade.map((node, i) => {
              const risk = riskByAgentName.get(node.agentName);
              const tier = risk?.threatLevel ?? 'low';
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg border ${RISK_COLOR[tier]}`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-[color:var(--text-primary)]">{node.agentName}</span>
                    <span className="text-xs text-[color:var(--text-tertiary)] mt-0.5">Hop {node.hop}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-bold">{risk?.predictedScore ?? 0}</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-70">risk score</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
