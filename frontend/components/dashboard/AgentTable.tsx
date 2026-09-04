'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { RiskBadge } from '../ui/RiskBadge';
import { buildPredictiveRiskByAgentName, PredictiveRiskEntry } from '../../lib/predictiveRisk';
import type { Agent, RiskLevel } from '../../types';
import { authHeader } from '../../lib/authFetch';
import { resolveCriticality } from '../../lib/criticality';

export function AgentTable() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [riskByAgentName, setRiskByAgentName] = useState<Map<string, PredictiveRiskEntry>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';
    Promise.all([
      fetch(`${base}/api/agents`, { headers: authHeader() }).then(r => r.json()),
      fetch(`${base}/api/predictive-risk/agents`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
    ])
      .then(([data, predictiveData]) => {
        setRiskByAgentName(buildPredictiveRiskByAgentName(predictiveData));
        if (Array.isArray(data)) {
          setAgents(data.map(a => ({
            ...a,
            department: a.department || (a.owner && a.owner.department) || 'Unassigned',
            criticality: resolveCriticality(a),
            owner: typeof a.owner === 'object' && a.owner ? a.owner.name : a.owner,
            backup_owner: typeof a.backup_owner === 'object' && a.backup_owner ? a.backup_owner.name : a.backup_owner
          })));
        } else {
          setAgents([]);
        }
      })
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, []);

  const riskOf = (agent: Agent): RiskLevel => riskByAgentName.get(agent.name)?.threatLevel ?? 'low';

  const sortedAgents = [...agents].sort((a, b) => {
    const w: Record<RiskLevel, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return w[riskOf(b)] - w[riskOf(a)];
  });

  return (
    <div className="card flex flex-col mt-8 overflow-hidden animate-fade-up delay-500">
      <div className="p-6 border-b border-[var(--border-default)] flex justify-between items-center bg-[var(--bg-surface)]">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Agent Summary Directory</h3>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">Complete registry of all AI agents — criticality is inherent business impact, risk is computed governance score</p>
        </div>
      </div>

      {loading && (
        <div className="p-6 space-y-3 animate-pulse">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-10 rounded bg-[var(--border-subtle)]" />
          ))}
        </div>
      )}

      {!loading && agents.length === 0 && (
        <div className="p-8 text-center text-xs text-[color:var(--text-tertiary)]">
          No agents found — check /api/agents
        </div>
      )}

      {!loading && agents.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-elevated)] text-xs uppercase tracking-wider text-[color:var(--text-tertiary)] border-b border-[var(--border-default)]">
                <th className="px-6 py-4 font-medium">Agent Details</th>
                <th className="px-6 py-4 font-medium">Ownership</th>
                <th className="px-6 py-4 font-medium">Documentation</th>
                <th className="px-6 py-4 font-medium">Criticality</th>
                <th className="px-6 py-4 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {sortedAgents.map((agent) => {
                const risk = riskOf(agent);
                return (
                  <tr key={agent.id} className="hover:bg-[var(--bg-hover)] transition-colors group">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-[color:var(--text-primary)] group-hover:text-indigo-300 transition-colors">{agent.name}</div>
                        <div className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{agent.department}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1 text-sm">
                        <div className="flex items-center">
                          <span className="text-[color:var(--text-tertiary)] w-16 text-xs">Primary:</span>
                          {agent.owner ? (
                            <span className="text-[color:var(--text-primary)] font-medium">{agent.owner}</span>
                          ) : (
                            <span className="text-amber-500 flex items-center text-xs font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              <AlertCircle className="w-3 h-3 mr-1" /> Orphaned
                            </span>
                          )}
                        </div>
                        <div className="flex items-center">
                          <span className="text-[color:var(--text-tertiary)] w-16 text-xs">Backup:</span>
                          {agent.backup_owner ? (
                            <span className="text-[color:var(--text-secondary)]">{agent.backup_owner}</span>
                          ) : (
                            <span className="text-red-400/80 text-xs flex items-center">
                              <XCircle className="w-3 h-3 mr-1" /> None
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
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
                    <td className="px-6 py-4">
                      <div className={clsx(
                        "inline-flex px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase",
                        `risk-${agent.criticality}`
                      )}>
                        {agent.criticality}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RiskBadge level={risk} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
