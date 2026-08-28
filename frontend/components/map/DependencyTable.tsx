import React, { useMemo } from 'react';
import { Agent, Dependency } from '../../types';
import { getDownstream } from '../../lib/graph';
import { ShieldAlert, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';

interface DependencyTableProps {
  agents: Agent[];
  dependencies: Dependency[];
  /** Server-computed SPOF agent ids (backend/routes/dependencies.js
   *  GET /agent-spofs) — one definition of "SPOF", not reimplemented here. */
  spofIds: Set<string>;
}

export function DependencyTable({ agents, dependencies, spofIds }: DependencyTableProps) {
  const agentMap = new Map(agents.map(a => [a.id, a]));

  // Pre-calculate immediate edges
  const immediateUpstream = useMemo(() => {
    const map = new Map<string, string[]>();
    dependencies.forEach(d => {
      if (!map.has(d.to)) map.set(d.to, []);
      map.get(d.to)!.push(d.from);
    });
    return map;
  }, [dependencies]);

  const immediateDownstream = useMemo(() => {
    const map = new Map<string, string[]>();
    dependencies.forEach(d => {
      if (!map.has(d.from)) map.set(d.from, []);
      map.get(d.from)!.push(d.to);
    });
    return map;
  }, [dependencies]);

  return (
    <div className="card overflow-hidden mt-8">
      <div className="p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Agent Continuity Matrix</h3>
          <p className="text-sm text-[var(--text-secondary)]">Agent-centric view of upstream reliances and downstream cascade risks.</p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--bg-base)] text-[var(--text-secondary)] text-sm border-b border-[var(--border-subtle)]">
              <th className="px-6 py-4 font-medium w-1/4">Agent</th>
              <th className="px-6 py-4 font-medium w-1/4">Upstream (Relies On)</th>
              <th className="px-6 py-4 font-medium w-1/4">Downstream (Feeds Into)</th>
              <th className="px-6 py-4 font-medium text-center">Cascade Impact</th>
              <th className="px-6 py-4 font-medium text-center">Continuity Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {agents.map((agent) => {
              const isSpof = spofIds.has(agent.id);
              const upstreams = immediateUpstream.get(agent.id) || [];
              const downstreams = immediateDownstream.get(agent.id) || [];
              const cascadeVictims = getDownstream(agent.id, dependencies).size;

              return (
                <tr key={agent.id} className="hover:bg-[var(--bg-surface)] transition-colors">
                  {/* Agent Details */}
                  <td className="px-6 py-4 align-top">
                    <div className="font-medium text-[var(--text-primary)] flex items-center" title={isSpof ? "SPOF Detected" : undefined}>
                      {agent.name}
                      {isSpof && <ShieldAlert size={14} className="ml-2 text-red-500" />}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-1">{agent.department} • Owner: {agent.owner || 'None'}</div>
                  </td>
                  
                  {/* Upstream */}
                  <td className="px-6 py-4 align-top">
                    {upstreams.length > 0 ? (
                      <ul className="space-y-2">
                        {upstreams.map(upId => (
                          <li key={upId} className="flex items-start text-xs text-[var(--text-secondary)]">
                            <ArrowUpRight size={12} className="mr-1.5 mt-0.5 text-[var(--text-tertiary)] shrink-0" />
                            <span>{agentMap.get(upId)?.name || upId}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-[var(--text-tertiary)] italic">Standalone (No upstream)</span>
                    )}
                  </td>

                  {/* Downstream */}
                  <td className="px-6 py-4 align-top">
                    {downstreams.length > 0 ? (
                      <ul className="space-y-2">
                        {downstreams.map(downId => (
                          <li key={downId} className="flex items-start text-xs text-[var(--text-secondary)]">
                            <ArrowDownRight size={12} className="mr-1.5 mt-0.5 text-[var(--accent)] shrink-0" />
                            <span>{agentMap.get(downId)?.name || downId}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-[var(--text-tertiary)] italic">Endpoint (No downstream)</span>
                    )}
                  </td>

                  {/* Cascade Impact */}
                  <td className="px-6 py-4 align-top text-center">
                    {cascadeVictims > 0 ? (
                      <div className="inline-flex flex-col items-center">
                        <span className={clsx(
                          "text-lg font-bold",
                          cascadeVictims >= 3 ? "text-orange-400" : "text-[var(--text-primary)]"
                        )}>
                          {cascadeVictims}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Victims</span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-[var(--text-tertiary)]">0</span>
                    )}
                  </td>

                  {/* Continuity Risk */}
                  <td className="px-6 py-4 align-top text-center">
                    {isSpof ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                        SPOF RISK
                      </span>
                    ) : cascadeVictims >= 3 ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        HIGH IMPACT
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        STABLE
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
