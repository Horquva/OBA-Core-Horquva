'use client';

import React from 'react';
import { TruthBadge } from '../dashboard/TruthBadge';
import { ShieldCheck, Scale, FileWarning } from 'lucide-react';
import { ContinuityReport } from '../../lib/continuityRisk';
import { ModuleResult } from '../../lib/moduleResult';

export interface GovernancePayload {
  governanceCoverage: number; // 0-1
  governedEntities: string[];
  ungovernedAssets: string[];
}

interface Props {
  report: ContinuityReport;
  /** Real M19 (Governance Intelligence) output -- null while loading or if
   *  the graph isn't ready. The KPI below is the only thing on this tab
   *  actually sourced from a verified backend module; everything else
   *  (heatmap, worst-offenders list) is continuityRisk.ts's local per-asset
   *  heuristic and is labeled as such, not claimed as verified. */
  module: ModuleResult<GovernancePayload> | null;
}

export function GovernanceTab({ report, module }: Props) {
  const healthy = report.assets.filter(a => a.governanceScore >= 80).length;
  const atRisk = report.assets.filter(a => a.governanceScore < 60).length;
  const m19Coverage = module ? Math.round(module.payload.governanceCoverage * 100) : null;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 flex flex-col p-6 rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2" />
          <div className="flex items-center justify-between z-10 mb-2">
            <span className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wider">Governance Coverage (M19)</span>
            <TruthBadge confidence={module ? module.confidence * 100 : null} />
          </div>
          {m19Coverage != null ? (
            <div className="flex items-end gap-3 z-10">
              <span className={`text-4xl font-bold ${m19Coverage >= 80 ? 'text-sky-400' : m19Coverage >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                {m19Coverage}
              </span>
              <span className="text-sm text-[color:var(--text-tertiary)] mb-1">% of assets under policy</span>
            </div>
          ) : (
            <span className="text-sm text-[color:var(--text-tertiary)] z-10">Unavailable — brain graph not ready</span>
          )}
        </div>

        <div className="flex flex-col p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <span className="text-xs text-emerald-400/80 uppercase tracking-wider mb-2 flex items-center gap-2"><ShieldCheck size={14}/> Healthy Assets</span>
          <span className="text-2xl font-bold text-emerald-400">{healthy}</span>
          <span className="text-[10px] text-emerald-400/60 mt-1">fully compliant & verified</span>
        </div>

        <div className="flex flex-col p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
          <span className="text-xs text-orange-400/80 uppercase tracking-wider mb-2 flex items-center gap-2"><FileWarning size={14}/> At-Risk Assets</span>
          <span className="text-2xl font-bold text-orange-400">{atRisk}</span>
          <span className="text-[10px] text-orange-400/60 mt-1">score &lt; 60, audit needed</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Governance Heatmap */}
        <div className="flex flex-col rounded-xl bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] p-6">
          <h3 className="text-sm font-semibold text-[color:var(--text-primary)] mb-1">Governance Heatmap</h3>
          <p className="text-[10px] text-[color:var(--text-tertiary)] mb-4 uppercase tracking-wide">Estimated — per-asset governance heuristic, not M19</p>
          <div className="flex flex-col gap-3">
            {Object.entries(report.deptGovernance).sort((a,b) => a[1].score - b[1].score).map(([dept, stats]) => (
              <div key={dept} className="flex flex-col gap-1.5 p-3 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-base)]">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-[color:var(--text-primary)]">{dept}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${stats.score >= 80 ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : stats.score >= 50 ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10'}`}>
                    Score: {stats.score}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-[color:var(--text-secondary)] mt-1">
                  <span>{stats.total} total assets</span>
                  <span className="text-orange-400">{stats.atRisk} at risk</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worst Offenders */}
        <div className="flex flex-col rounded-xl bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] p-6">
          <h3 className="text-sm font-semibold text-orange-400 mb-1 flex items-center gap-2">
            <Scale size={16} />
            Worst Offenders (Gap List)
          </h3>
          <p className="text-xs text-[color:var(--text-tertiary)] mb-4">Assets with severe compliance gaps and lowest governance scores</p>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[400px] pr-2">
            {report.worstOffenders.map((a, i) => (
              <div key={a.id || a.name || i} className="flex justify-between items-center p-3 rounded border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors">
                <div>
                  <p className="text-xs font-semibold text-[color:var(--text-primary)] leading-tight mb-1">{a.name}</p>
                  <p className="text-[10px] text-[color:var(--text-tertiary)] capitalize">{a.type} · {a.owner}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={`text-[11px] font-bold ${a.governanceScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {a.governanceScore} / 100
                  </span>
                  <span className="text-[10px] text-orange-400/80">
                    {a.complianceViolations} violations
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
