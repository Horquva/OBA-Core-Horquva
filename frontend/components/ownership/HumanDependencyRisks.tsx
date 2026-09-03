"use client";

import { useMemo } from 'react';
import { Dataset, Agent } from '../../types';
import { PredictiveRiskEntry } from '../../lib/predictiveRisk';
import { AlertTriangle, UserX, FileX, Zap } from 'lucide-react';
import clsx from 'clsx';

/** GET /api/ownership's per-owner dependencyRiskScore/Tier -- see
 *  domain/derived.js's humanDependencyRisk() for the real formula (real
 *  predictedScore average + RISK_FACTORS-scale workflow/tool exposure).
 *  Replaces this component's own previously-invented 12/8/10 point weights. */
export interface DependencyRiskProfile {
  totalRiskScore: number;
  tier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  ownedWorkflowCount: number;
  criticalWorkflowCount: number;
  ownedToolCount: number;
  unbackedToolCount: number;
}

interface HumanDependencyRisksProps {
  dataset: Dataset;
  riskByAgentName: Map<string, PredictiveRiskEntry>;
  dependencyRiskByName: Map<string, DependencyRiskProfile>;
}

type HumanRiskProfile = {
  name: string;
  ownedAgents: Agent[];
  exposedAgents: Agent[];        // no backup_owner
  criticalAgents: Agent[];       // criticality = critical
  undocumentedAgents: Agent[];
  ownedWorkflows: number;
  criticalWorkflows: number;
  unbackedWorkflows: number;
  toolsOwned: number;
  unbackedTools: number;
  totalRiskScore: number;
  tier: 'critical' | 'high' | 'medium' | 'low';
};

const tierConfig = {
  critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/25', barColor: 'bg-red-500', topBorder: 'border-t-red-500/40' },
  high:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25', barColor: 'bg-orange-500', topBorder: 'border-t-orange-500/30' },
  medium:   { label: 'Medium',   color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', barColor: 'bg-yellow-500', topBorder: 'border-t-yellow-500/25' },
  low:      { label: 'Low',      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', barColor: 'bg-emerald-500', topBorder: 'border-t-[var(--border-strong)]' },
};

const TIER_MAP: Record<DependencyRiskProfile['tier'], HumanRiskProfile['tier']> = {
  CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low',
};

export function HumanDependencyRisks({ dataset, riskByAgentName, dependencyRiskByName }: HumanDependencyRisksProps) {
  const { agents, ai_tools, workflows } = dataset;

  const profiles = useMemo<HumanRiskProfile[]>(() => {
    const names = new Set<string>();
    agents.forEach(a => { if (a.owner) names.add(a.owner); });
    workflows.forEach(w => { if (w.owner) names.add(w.owner); });

    return Array.from(names).map(name => {
      const ownedAgents = agents.filter(a => a.owner === name);
      const exposedAgents = ownedAgents.filter(a => !a.backup_owner);
      const criticalAgents = ownedAgents.filter(a => a.criticality === 'critical');
      const undocumentedAgents = ownedAgents.filter(a => !a.documented);
      const ownedWfs = workflows.filter(w => w.owner === name);
      const criticalWorkflows = ownedWfs.filter(w => w.criticality === 'critical' || w.criticality === 'high').length;
      const unbackedWorkflows = ownedWfs.filter(w => !w.backup_owner).length;
      const toolsOwned = ai_tools.filter(t => t.access_owner === name);
      const unbackedTools = toolsOwned.filter(t => !t.backup_tool).length;

      // Real backend score (domain/derived.js's humanDependencyRisk()) --
      // replaces this component's own previously-invented point weights.
      const dep = dependencyRiskByName.get(name);
      const totalRiskScore = dep?.totalRiskScore ?? 0;
      const tier = dep ? TIER_MAP[dep.tier] : 'low';

      return {
        name,
        ownedAgents,
        exposedAgents,
        criticalAgents,
        undocumentedAgents,
        ownedWorkflows: ownedWfs.length,
        criticalWorkflows,
        unbackedWorkflows,
        toolsOwned: toolsOwned.length,
        unbackedTools,
        totalRiskScore,
        tier,
      };
    }).sort((a, b) => b.totalRiskScore - a.totalRiskScore);
  }, [agents, ai_tools, workflows, dependencyRiskByName]);

  const maxScore = Math.max(...profiles.map(p => p.totalRiskScore), 1);

  return (
    <div className="card p-7 animate-fade-up delay-300 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.015] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="mb-8 relative z-10">
        <h3 className="text-xl font-semibold text-[color:var(--text-primary)] tracking-tight">Human Dependency Risks</h3>
        <p className="text-sm text-[color:var(--text-secondary)] mt-1.5">
          Per-person exposure analysis — agent load, undocumented ownership, and workflow concentration risks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10">
        {profiles.map((profile) => {
          const cfg = tierConfig[profile.tier];
          const barPct = (profile.totalRiskScore / maxScore) * 100;

          return (
            <div
              key={profile.name}
              className={clsx(
                'card p-5 border-t-2 relative overflow-hidden transition-all duration-300',
                cfg.topBorder,
                cfg.border
              )}
            >
              {/* Subtle gradient glow */}
              <div className={clsx('absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none opacity-40', cfg.bg)} />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-base',
                      cfg.bg, cfg.border,
                      profile.tier === 'critical' ? 'text-red-300' : 'text-[color:var(--text-primary)]'
                    )}>
                      {profile.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[color:var(--text-primary)]">{profile.name}</div>
                      <div className="text-[10px] uppercase tracking-widest font-bold mt-0.5" style={{ color: 'inherit' }}>
                        <span className={cfg.color}>{cfg.label} Risk</span>
                      </div>
                    </div>
                  </div>
                  {/* Score */}
                  <div className={clsx('text-2xl font-light tracking-tight', cfg.color)}>
                    {profile.totalRiskScore}
                    <span className="text-[10px] text-[color:var(--text-tertiary)] ml-1 font-normal">pts</span>
                  </div>
                </div>

                {/* Risk bar */}
                <div className="w-full h-1 bg-[var(--border-subtle)] rounded-full overflow-hidden mb-5">
                  <div
                    className={clsx('h-full rounded-full transition-all duration-1000', cfg.barColor)}
                    style={{ width: `${barPct}%` }}
                  />
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3">
                  <StatCell
                    label="Exposed Agents"
                    value={profile.exposedAgents.length}
                    total={profile.ownedAgents.length}
                    icon={UserX}
                    urgent={profile.exposedAgents.length > 0}
                  />
                  <StatCell
                    label="Unbacked Workflows"
                    value={profile.unbackedWorkflows}
                    total={profile.ownedWorkflows}
                    icon={AlertTriangle}
                    urgent={profile.unbackedWorkflows > 0}
                  />
                  <StatCell
                    label="Undocumented"
                    value={profile.undocumentedAgents.length}
                    total={profile.ownedAgents.length}
                    icon={FileX}
                    urgent={profile.undocumentedAgents.length > 0}
                  />
                </div>

                {/* Exposed agent list */}
                {profile.exposedAgents.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                    <div className="text-[9px] uppercase tracking-widest text-[color:var(--text-tertiary)] font-bold mb-2">Exposed Agents (No Backup)</div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.exposedAgents.map(a => {
                        const risk = riskByAgentName.get(a.name)?.threatLevel ?? 'low';
                        return (
                          <span
                            key={a.id}
                            className={clsx(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border",
                              risk === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              risk === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                              'bg-[var(--bg-hover)] text-[color:var(--text-secondary)] border-[var(--border-default)]'
                            )}
                          >
                            <Zap className="w-2.5 h-2.5" />
                            {a.name.replace(' Agent', '')}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCell({ label, value, total, icon: Icon, urgent }: {
  label: string; value: number; total: number; icon: React.ElementType; urgent: boolean;
}) {
  return (
    <div className={clsx(
      "p-4 rounded-xl border flex flex-col transition-colors",
      urgent ? 'bg-[var(--bg-elevated)] border-[var(--border-strong)]' : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
    )}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={clsx('w-3 h-3', urgent ? 'text-red-400/70' : 'text-slate-600')} />
        <span className="text-[9px] uppercase tracking-widest text-[color:var(--text-tertiary)] font-semibold">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={clsx('text-xl font-light', urgent ? 'text-[color:var(--text-primary)]' : 'text-[color:var(--text-tertiary)]')}>{value}</span>
        <span className="text-xs text-slate-600">/ {total}</span>
      </div>
    </div>
  );
}
