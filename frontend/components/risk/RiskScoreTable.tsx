'use client';

import React, { useState } from 'react';
import { AgentRiskProfile, RiskTier } from '../../lib/riskIntelligence';
import { RiskBadge } from '../ui/RiskBadge';
import { CheckCircle2, XCircle, Zap, Users, BarChart3, ChevronDown, ChevronRight, Activity, ShieldAlert, Cpu, Sparkles, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface RiskScoreTableProps {
  agents: AgentRiskProfile[];
  title: string;
  subtitle?: string;
  tier: RiskTier;
}

const TIER_META: Record<RiskTier, { headerBg: string; border: string; countBg: string; countText: string }> = {
  CRITICAL: {
    headerBg: 'bg-transparent',
    border: 'border-[var(--border-subtle)]',
    countBg: 'bg-[var(--bg-hover)] border-[var(--border-default)]',
    countText: 'text-red-400',
  },
  HIGH: {
    headerBg: 'bg-transparent',
    border: 'border-[var(--border-subtle)]',
    countBg: 'bg-[var(--bg-hover)] border-[var(--border-default)]',
    countText: 'text-orange-400',
  },
  MEDIUM: {
    headerBg: 'bg-transparent',
    border: 'border-[var(--border-subtle)]',
    countBg: 'bg-[var(--bg-hover)] border-[var(--border-default)]',
    countText: 'text-yellow-400',
  },
  LOW: {
    headerBg: 'bg-transparent',
    border: 'border-[var(--border-subtle)]',
    countBg: 'bg-[var(--bg-hover)] border-[var(--border-default)]',
    countText: 'text-emerald-400',
  },
};

const LEVEL_MAP: Record<RiskTier, 'critical' | 'high' | 'medium' | 'low'> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export function RiskScoreTable({ agents, title, subtitle, tier }: RiskScoreTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const meta = TIER_META[tier];
  const level = LEVEL_MAP[tier];

  if (agents.length === 0) return null;

  return (
    <div className={clsx('card overflow-hidden border', meta.border, 'animate-fade-up delay-400')}>
      {/* Header */}
      <div className={clsx('px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between', meta.headerBg)}>
        <div>
          <div className="flex items-center gap-2.5">
            <BarChart3 className={clsx('w-4 h-4', meta.countText)} />
            <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h3>
          </div>
          {subtitle && <p className="text-[11px] text-[color:var(--text-tertiary)] mt-0.5 pl-6">{subtitle}</p>}
        </div>
        <span className={clsx(
          'inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border',
          meta.countBg, meta.countText
        )}>
          {agents.length} Agents
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--bg-surface)] text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)] border-b border-[var(--border-subtle)]">
              <th className="w-10 px-3 py-3.5"></th>
              <th className="px-5 py-3.5 font-medium">Agent</th>
              <th className="px-5 py-3.5 font-medium">Department</th>
              <th className="px-5 py-3.5 font-medium">Owner</th>
              <th className="px-5 py-3.5 font-medium">Backup</th>
              <th className="px-5 py-3.5 font-medium">Docs</th>
              <th className="px-5 py-3.5 font-medium">Cascade</th>
              <th className="px-5 py-3.5 font-medium text-right">Score</th>
              <th className="px-5 py-3.5 font-medium text-center">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {agents.map((profile, idx) => {
              const isExpanded = expandedId === profile.agent.id;
              const ev = profile.evidence;
              const factors = profile.contributingFactors || {};

              return (
                <React.Fragment key={profile.agent.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : profile.agent.id)}
                    className={clsx(
                      'hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group/row',
                      isExpanded && 'bg-[var(--bg-hover)]'
                    )}
                    style={{ animationDelay: `${400 + idx * 40}ms` }}
                  >
                    {/* Expand Toggle */}
                    <td className="px-3 py-4 text-center text-[color:var(--text-tertiary)] group-hover/row:text-[color:var(--text-primary)]">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 inline-block transition-transform" />
                      ) : (
                        <ChevronRight className="w-4 h-4 inline-block transition-transform" />
                      )}
                    </td>

                    {/* Agent Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[color:var(--text-primary)] text-sm group-hover/row:text-indigo-300 transition-colors">
                          {profile.agent.name}
                        </span>
                        {profile.isSPOF && (
                          <span title="Single Point of Failure">
                            <Zap className="w-3 h-3 text-rose-400 flex-shrink-0" />
                          </span>
                        )}
                        {profile.isOrphaned && (
                          <span title="No Owner — Orphaned">
                            <Users className="w-3 h-3 text-amber-400 flex-shrink-0" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[var(--bg-hover)] border border-[var(--border-default)] text-xs text-[color:var(--text-primary)]">
                        {profile.agent.department}
                      </span>
                    </td>

                    {/* Owner */}
                    <td className="px-5 py-4">
                      {profile.agent.owner ? (
                        <span className="text-sm text-[color:var(--text-primary)]">{profile.agent.owner}</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> None
                        </span>
                      )}
                    </td>

                    {/* Backup */}
                    <td className="px-5 py-4">
                      {profile.agent.backup_owner ? (
                        <span className="flex items-center gap-1.5 text-[color:var(--text-primary)] text-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          {profile.agent.backup_owner}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-400/80 text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Exposed
                        </span>
                      )}
                    </td>

                    {/* Docs */}
                    <td className="px-5 py-4">
                      {profile.agent.documented ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400/70" />
                      )}
                    </td>

                    {/* Cascade (Downstream Reach + eIRWR Blast Radius) */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        {profile.downstreamCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-semibold">
                            {profile.downstreamCount} agents
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                        {profile.blastRadius > 0 && (
                          <span className="text-[10px] text-amber-400/90 font-mono tracking-tight" title="eIRWR Network Failure Mass (arXiv:2608.08073)">
                            {profile.blastRadius}% blast
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Score */}
                    <td className="px-5 py-4 text-right">
                      <span className={clsx(
                        'text-sm font-bold tabular-nums',
                        level === 'critical' ? 'text-red-400' :
                        level === 'high'     ? 'text-orange-400' :
                        level === 'medium'   ? 'text-yellow-400' : 'text-emerald-400'
                      )}>
                        {profile.compositeScore}
                      </span>
                    </td>

                    {/* Risk Badge */}
                    <td className="px-5 py-4 text-center">
                      <RiskBadge level={level} />
                    </td>
                  </tr>

                  {/* Expanded BBN & eIRWR Diagnostics Row */}
                  {isExpanded && (() => {
                    const ownershipState = ev?.ownership ?? (!profile.agent.owner ? 0 : profile.agent.backup_owner ? 2 : 1);
                    const docState = ev?.documentation ?? (profile.agent.documented ? 2 : 0);
                    const runtimeState = ev?.runtime_state ?? 2;
                    const cascadeState = ev?.cascade_exposure ?? ((factors.cascade_exposure ?? 0) > 0 ? 1 : 2);

                    return (
                    <tr className="bg-[var(--bg-elevated)]/40 border-b border-[var(--border-subtle)]">
                      <td colSpan={9} className="px-6 py-5">
                        <div className="rounded-xl border border-[var(--border-subtle)] bg-[color:var(--bg-card)] p-5 space-y-4 shadow-xl">
                          {/* Top Subheader */}
                          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                            <div className="flex items-center gap-2">
                              <Cpu className="w-4 h-4 text-indigo-400" />
                              <h4 className="text-xs font-semibold text-[color:var(--text-primary)] uppercase tracking-wider">
                                Scientific Risk Diagnostics & Causal Attribution
                              </h4>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                BBN (arXiv:0906.3968) + eIRWR (arXiv:2608.08073)
                              </span>
                            </div>
                            <span className="text-xs text-[color:var(--text-tertiary)] font-mono">
                              Evidence Tuple: (O:{ownershipState}, D:{docState}, S:{runtimeState}, U:{cascadeState})
                            </span>
                          </div>

                          {/* 4 Discrete Evidence Factors */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {/* Ownership State */}
                            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)] block mb-1">
                                Ownership State (O)
                              </span>
                              <div className="text-xs font-medium text-[color:var(--text-primary)] flex items-center gap-1.5">
                                {ownershipState === 2 ? (
                                  <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Covered (Owner+Backup)</>
                                ) : ownershipState === 1 ? (
                                  <><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Single Owner (Exposed)</>
                                ) : (
                                  <><XCircle className="w-3.5 h-3.5 text-rose-400" /> Unowned (Orphaned)</>
                                )}
                              </div>
                            </div>

                            {/* Documentation State */}
                            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)] block mb-1">
                                Documentation State (D)
                              </span>
                              <div className="text-xs font-medium text-[color:var(--text-primary)] flex items-center gap-1.5">
                                {docState === 2 ? (
                                  <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Complete Documentation</>
                                ) : docState === 1 ? (
                                  <><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Partial Documentation</>
                                ) : (
                                  <><XCircle className="w-3.5 h-3.5 text-rose-400" /> Undocumented (0% Assets)</>
                                )}
                              </div>
                            </div>

                            {/* Runtime State */}
                            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)] block mb-1">
                                Runtime State (S)
                              </span>
                              <div className="text-xs font-medium text-[color:var(--text-primary)] flex items-center gap-1.5">
                                {runtimeState === 2 ? (
                                  <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Operational / Healthy</>
                                ) : runtimeState === 1 ? (
                                  <><AlertTriangle className="w-3.5 h-3.5 text-yellow-400" /> Inactive / Warning</>
                                ) : (
                                  <><XCircle className="w-3.5 h-3.5 text-rose-400" /> Failed State</>
                                )}
                              </div>
                            </div>

                            {/* Cascade Exposure */}
                            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)] block mb-1">
                                Cascade Exposure (U)
                              </span>
                              <div className="text-xs font-medium text-[color:var(--text-primary)] flex items-center gap-1.5">
                                {cascadeState === 2 ? (
                                  <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Protected (r &le; 0.15)</>
                                ) : cascadeState === 1 ? (
                                  <><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Moderate Pressure (r &gt; 0.15)</>
                                ) : (
                                  <><ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> High Pressure (r &gt; 0.40)</>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Causal Counterfactual Remediation */}
                          <div className="pt-2">
                            <span className="text-[11px] font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider block mb-2">
                              Counterfactual Risk Remediation (Score Points Shed if Fixed)
                            </span>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="p-2.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
                                <span className="text-xs text-[color:var(--text-secondary)]">Assign Backup Owner</span>
                                <span className={clsx(
                                  'text-xs font-bold font-mono px-2 py-0.5 rounded',
                                  (factors.ownership ?? 0) > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-500'
                                )}>
                                  {(factors.ownership ?? 0) > 0 ? `-${factors.ownership} pts` : '0 pts'}
                                </span>
                              </div>

                              <div className="p-2.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
                                <span className="text-xs text-[color:var(--text-secondary)]">Complete Documentation</span>
                                <span className={clsx(
                                  'text-xs font-bold font-mono px-2 py-0.5 rounded',
                                  (factors.documentation ?? 0) > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-500'
                                )}>
                                  {(factors.documentation ?? 0) > 0 ? `-${factors.documentation} pts` : '0 pts'}
                                </span>
                              </div>

                              <div className="p-2.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
                                <span className="text-xs text-[color:var(--text-secondary)]">Stabilize Runtime Health</span>
                                <span className={clsx(
                                  'text-xs font-bold font-mono px-2 py-0.5 rounded',
                                  (factors.runtime_state ?? 0) > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-500'
                                )}>
                                  {(factors.runtime_state ?? 0) > 0 ? `-${factors.runtime_state} pts` : '0 pts'}
                                </span>
                              </div>

                              <div className="p-2.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
                                <span className="text-xs text-[color:var(--text-secondary)]">Hedge Cascade Dependencies</span>
                                <span className={clsx(
                                  'text-xs font-bold font-mono px-2 py-0.5 rounded',
                                  (factors.cascade_exposure ?? 0) > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-500'
                                )}>
                                  {(factors.cascade_exposure ?? 0) > 0 ? `-${factors.cascade_exposure} pts` : '0 pts'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Plain-English Actionable Diagnosis */}
                          {profile.reasons && profile.reasons.length > 0 && (
                            <div className="pt-2">
                              <span className="text-[11px] font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider block mb-2">
                                Actionable Risk Drivers
                              </span>
                              <div className="space-y-1.5">
                                {profile.reasons.map((reason, rIdx) => (
                                  <div key={rIdx} className="flex items-start gap-2 text-xs text-[color:var(--text-secondary)]">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <span>{reason}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ); })()}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

