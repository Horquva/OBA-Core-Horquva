import { Agent, RiskLevel } from '../../types';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { RiskBadge } from '../ui/RiskBadge';

interface AgentTableProps {
  agents: Agent[];
}

import { deriveRisk } from '../../lib/risk';

export function AgentTable({ agents }: AgentTableProps) {
  // Sort by computed risk severity (highest first)
  const sortedAgents = [...agents].sort((a, b) => {
    const w: Record<RiskLevel, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return w[deriveRisk(b)] - w[deriveRisk(a)];
  });

  return (
    <div className="card flex flex-col mt-8 overflow-hidden animate-fade-up delay-500">
      <div className="p-6 border-b border-[#28283a] flex justify-between items-center bg-[#111116]">
        <div>
          <h3 className="text-lg font-semibold text-white">Agent Summary Directory</h3>
          <p className="text-sm text-slate-400 mt-1">Complete registry of all AI agents — criticality is inherent business impact, risk is computed governance score</p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#16161c] text-xs uppercase tracking-wider text-slate-500 border-b border-[#28283a]">
              <th className="px-6 py-4 font-medium">Agent Details</th>
              <th className="px-6 py-4 font-medium">Ownership</th>
              <th className="px-6 py-4 font-medium">Documentation</th>
              <th className="px-6 py-4 font-medium">Criticality</th>
              <th className="px-6 py-4 font-medium">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f1f29]">
            {sortedAgents.map((agent) => {
              const risk = deriveRisk(agent);
              return (
                <tr key={agent.id} className="hover:bg-[#1c1c24] transition-colors group">
                  {/* Agent Details */}
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-white group-hover:text-indigo-300 transition-colors">{agent.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{agent.department}</div>
                    </div>
                  </td>

                  {/* Ownership */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-1 text-sm">
                      <div className="flex items-center">
                        <span className="text-slate-500 w-16 text-xs">Primary:</span>
                        {agent.owner ? (
                          <span className="text-slate-300 font-medium">{agent.owner}</span>
                        ) : (
                          <span className="text-amber-500 flex items-center text-xs font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <AlertCircle className="w-3 h-3 mr-1" /> Orphaned
                          </span>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className="text-slate-500 w-16 text-xs">Backup:</span>
                        {agent.backup_owner ? (
                          <span className="text-slate-400">{agent.backup_owner}</span>
                        ) : (
                          <span className="text-red-400/80 text-xs flex items-center">
                            <XCircle className="w-3 h-3 mr-1" /> None
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Documentation */}
                  <td className="px-6 py-4">
                    {agent.documented ? (
                      <div className="flex items-center text-emerald-400 text-sm">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        <span>Verified</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-amber-500/80 text-sm">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        <span>Missing</span>
                      </div>
                    )}
                  </td>

                  {/* Criticality — inherent business importance */}
                  <td className="px-6 py-4">
                    <div className={clsx(
                      "inline-flex px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase",
                      `risk-${agent.criticality}`
                    )}>
                      {agent.criticality}
                    </div>
                  </td>

                  {/* Risk — computed governance score */}
                  <td className="px-6 py-4">
                    <RiskBadge level={risk} />
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
