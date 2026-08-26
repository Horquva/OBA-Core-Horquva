import { Agent } from '../../types';
import { PredictiveRiskEntry } from '../../lib/predictiveRisk';
import { RiskBadge } from '../ui/RiskBadge';
import { AlertCircle, CheckCircle2, ShieldAlert, XCircle, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface OwnershipListProps {
  agents: Agent[];
  riskByAgentName: Map<string, PredictiveRiskEntry>;
  /** Owner names flagged by the backend's isHumanSpof (>=3 unbacked agents,
   *  GET /api/ownership) -- replaces this component's own independently-coded
   *  `coverageScore === 0 && totalAgents >= 3` check. */
  humanSpofOwners: Set<string>;
}

type OwnerGroup = {
  ownerName: string;
  isOrphaned: boolean;
  agents: Agent[];
  coveredAgents: number;
  totalAgents: number;
  coverageScore: number;
};

export function OwnershipList({ agents, riskByAgentName, humanSpofOwners }: OwnershipListProps) {
  // Group agents by owner
  const groupsRecord: Record<string, OwnerGroup> = {};

  agents.forEach(agent => {
    const key = agent.owner || 'ORPHANED';
    if (!groupsRecord[key]) {
      groupsRecord[key] = {
        ownerName: agent.owner || 'No Owner Assigned (Orphaned)',
        isOrphaned: !agent.owner,
        agents: [],
        coveredAgents: 0,
        totalAgents: 0,
        coverageScore: 0,
      };
    }
    groupsRecord[key].agents.push(agent);
    groupsRecord[key].totalAgents += 1;
    if (agent.backup_owner) {
      groupsRecord[key].coveredAgents += 1;
    }
  });

  // Calculate scores and sort
  const groups = Object.values(groupsRecord).map(g => {
    g.coverageScore = Math.round((g.coveredAgents / g.totalAgents) * 100);
    return g;
  }).sort((a, b) => {
    if (a.isOrphaned && !b.isOrphaned) return -1;
    if (!a.isOrphaned && b.isOrphaned) return 1;
    if (b.totalAgents !== a.totalAgents) return b.totalAgents - a.totalAgents;
    return a.coverageScore - b.coverageScore;
  });

  return (
    <div className="flex flex-col space-y-8 animate-fade-up delay-500 mt-10">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Detailed Owner Registries</h3>
        <p className="text-sm text-[color:var(--text-secondary)] mt-1">Granular breakdown of agent assignments, backup status, and specific risk vectors per owner.</p>
      </div>

      {groups.map((group) => (
        <div 
          key={group.ownerName} 
          className={clsx(
            "card overflow-hidden transition-all duration-300 relative",
            group.isOrphaned && "border-amber-500/30",
            !group.isOrphaned && group.coverageScore === 0 && "border-red-500/20"
          )}
        >
          {group.isOrphaned && (
             <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent pointer-events-none" />
          )}

          {/* Header */}
          <div className="px-6 py-5 border-b border-[var(--border-default)] flex flex-col md:flex-row md:justify-between md:items-center bg-[var(--bg-surface)]/80 backdrop-blur-sm relative z-10">
            <div className="flex items-center mb-4 md:mb-0">
              {group.isOrphaned ? (
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mr-5 border border-amber-500/20 text-amber-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                  <AlertCircle className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[var(--bg-hover)] flex items-center justify-center mr-5 border border-[var(--border-default)] text-[color:var(--text-primary)] font-bold text-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  {group.ownerName.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold text-[color:var(--text-primary)] flex items-center">
                  {group.ownerName}
                  {!group.isOrphaned && humanSpofOwners.has(group.ownerName) && (
                    <span className="ml-4 flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse"></span>
                      Human SPOF
                    </span>
                  )}
                </h3>
                <p className="text-sm text-[color:var(--text-secondary)] mt-0.5">
                  <span className="text-[color:var(--text-primary)] font-medium">{group.totalAgents}</span> Agent{group.totalAgents !== 1 ? 's' : ''} in portfolio
                </p>
              </div>
            </div>

            {/* Coverage Score Block */}
            {!group.isOrphaned && (
              <div className="flex items-center space-x-5 bg-[var(--bg-elevated)] px-5 py-3 rounded-xl border border-[var(--border-default)] shadow-inner">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-widest font-semibold mb-0.5">Coverage Score</span>
                  <div className="w-32 h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                    <div 
                      className={clsx(
                        "h-full rounded-full transition-all duration-1000",
                        group.coverageScore === 100 ? "bg-emerald-500" :
                        group.coverageScore >= 50 ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{ width: `${group.coverageScore}%` }}
                    />
                  </div>
                </div>
                <div className={clsx(
                  "text-2xl font-light tracking-tight",
                  group.coverageScore === 100 ? "text-emerald-400" :
                  group.coverageScore >= 50 ? "text-yellow-400" : "text-red-400"
                )}>
                  {group.coverageScore}%
                </div>
              </div>
            )}
            {group.isOrphaned && (
              <div className="flex items-center space-x-3 bg-amber-500/10 px-5 py-3 rounded-xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-amber-500">Action Required</span>
                  <span className="text-[10px] text-amber-500/70 uppercase tracking-wider">Assign owners immediately</span>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)] border-b border-[var(--border-default)]">
                  <th className="px-6 py-4 font-medium">Agent Name</th>
                  <th className="px-6 py-4 font-medium">Department</th>
                  <th className="px-6 py-4 font-medium">Backup Status</th>
                  <th className="px-6 py-4 font-medium">Computed Risk</th>
                  <th className="px-6 py-4 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {group.agents.map((agent) => {
                  const risk = riskByAgentName.get(agent.name)?.threatLevel ?? 'low';
                  return (
                    <tr key={agent.id} className="hover:bg-[var(--bg-hover)] transition-colors group/row">
                      <td className="px-6 py-4">
                        <div className="font-medium text-[color:var(--text-primary)] text-sm group-hover/row:text-indigo-300 transition-colors">{agent.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center px-2 py-1 rounded bg-[var(--bg-hover)] border border-[var(--border-default)] text-xs text-[color:var(--text-primary)]">
                          {agent.department}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {agent.backup_owner ? (
                          <div className="flex items-center text-[color:var(--text-primary)] text-sm">
                            <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mr-2.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            </div>
                            {agent.backup_owner}
                          </div>
                        ) : (
                          <div className="flex items-center text-red-400/90 text-sm">
                            <div className="w-5 h-5 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center mr-2.5">
                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                            </div>
                            <span className="text-xs font-semibold uppercase tracking-wider opacity-90">Exposed</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <RiskBadge level={risk} />
                      </td>
                      <td className="px-6 py-4 text-right">
                         <button className="text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors opacity-0 group-hover/row:opacity-100">
                           <ChevronRight className="w-4 h-4" />
                         </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
