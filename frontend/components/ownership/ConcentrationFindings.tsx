'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Users, Bot, GitFork, ShieldAlert, ShieldCheck, RefreshCw } from 'lucide-react';
import { concentrationApi, type ConcentrationFinding } from '../../lib/api';

interface Props {
  initialFindings?: ConcentrationFinding[];
}

const SEVERITY_COLORS: Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW', { badge: string; border: string; bg: string }> = {
  CRITICAL: {
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    border: 'border-red-500/25',
    bg: 'bg-red-950/10',
  },
  HIGH: {
    badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    border: 'border-orange-500/25',
    bg: 'bg-orange-950/10',
  },
  MEDIUM: {
    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    border: 'border-yellow-500/25',
    bg: 'bg-yellow-950/10',
  },
  LOW: {
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    border: 'border-blue-500/25',
    bg: 'bg-blue-950/10',
  },
};

export function ConcentrationFindings({ initialFindings }: Props) {
  const [findings, setFindings] = useState<ConcentrationFinding[]>(initialFindings || []);
  const [loading, setLoading] = useState<boolean>(!initialFindings);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadFindings() {
      try {
        setLoading(true);
        const data = await concentrationApi.findings();
        if (cancelled) return;
        setFindings(data.findings || []);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load concentration findings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (!initialFindings) {
      loadFindings();
    }
    return () => {
      cancelled = true;
    };
  }, [initialFindings]);

  const unbackedCount = findings.filter((f) => !f.hasBackup).length;

  return (
    <div className="card p-7 flex flex-col w-full animate-fade-up delay-300 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-tr from-red-500/[0.02] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[color:var(--text-primary)] tracking-tight">
                Concentration Risk Findings
              </h3>
              <p className="text-sm text-[color:var(--text-secondary)] mt-0.5">
                Explicit named ownership statements identifying silent dependencies without backups (FE-5).
              </p>
            </div>
          </div>
        </div>

        {unbackedCount > 0 && (
          <span className="self-start sm:self-auto text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/25 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {unbackedCount} Unbacked Portfolio{unbackedCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-center animate-pulse">
          <RefreshCw className="w-6 h-6 text-[color:var(--text-tertiary)] animate-spin mb-3" />
          <p className="text-xs text-[color:var(--text-secondary)]">Analyzing owner concentration findings...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-400 bg-red-500/5 rounded-xl border border-red-500/20 text-xs">
          {error}
        </div>
      ) : findings.length === 0 ? (
        <div className="p-8 text-center bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] text-[color:var(--text-secondary)] text-sm">
          No concentration risks detected. All owners have balanced portfolios or designated backups.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 relative z-10">
          {findings.map((finding, idx) => {
            const style = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.MEDIUM;

            return (
              <div
                key={`${finding.ownerName}-${idx}`}
                className={`p-5 rounded-xl border ${style.border} ${style.bg} hover:border-[var(--border-default)] transition-all`}
              >
                {/* Top Row: Owner Info + Severity Badge */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-default)] text-[color:var(--text-primary)] font-bold text-sm">
                      <Users className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[color:var(--text-primary)]">
                          {finding.ownerName}
                        </span>
                        {finding.role && (
                          <span className="text-xs text-[color:var(--text-tertiary)] hidden sm:inline">
                            · {finding.role}
                          </span>
                        )}
                        {finding.department && (
                          <span className="text-xs text-[color:var(--text-tertiary)] hidden md:inline">
                            ({finding.department})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {finding.hasBackup ? (
                          <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                            <ShieldCheck className="w-3 h-3" /> Backup: {finding.backupOwner}
                          </span>
                        ) : (
                          <span className="text-[11px] text-red-400 flex items-center gap-1 font-medium">
                            <AlertTriangle className="w-3 h-3" /> No designated backup owner
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0 ${style.badge}`}>
                    {finding.severity}
                  </span>
                </div>

                {/* Specific Named Finding String */}
                <div className="mb-4 p-3 rounded-lg bg-[var(--bg-surface)]/80 border border-[var(--border-subtle)]">
                  <p className="text-xs sm:text-sm font-medium text-[color:var(--text-primary)] leading-relaxed italic">
                    &ldquo;{finding.finding}&rdquo;
                  </p>
                </div>

                {/* Explicit Dependent Workflows & Agents */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-[var(--border-subtle)]">
                  {/* Dependent Workflows */}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[color:var(--text-tertiary)] flex items-center gap-1 mb-1.5">
                      <GitFork className="w-3 h-3 text-sky-400" />
                      Dependent Workflows ({finding.workflowCount})
                    </span>
                    {finding.workflows.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {finding.workflows.map((wf, wIdx) => (
                          <span
                            key={wIdx}
                            className="text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20"
                          >
                            {wf}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[color:var(--text-tertiary)]">None</span>
                    )}
                  </div>

                  {/* Dependent AI Agents */}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[color:var(--text-tertiary)] flex items-center gap-1 mb-1.5">
                      <Bot className="w-3 h-3 text-indigo-400" />
                      Dependent AI Agents ({finding.agentCount})
                    </span>
                    {finding.agents.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {finding.agents.map((ag, aIdx) => (
                          <span
                            key={aIdx}
                            className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                          >
                            {ag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[color:var(--text-tertiary)]">None</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
