'use client';

import React from 'react';
import { TruthBadge } from '../dashboard/TruthBadge';
import { ShieldCheck, ShieldAlert, HeartPulse, Activity } from 'lucide-react';
import { ContinuityReport } from '../../lib/continuityRisk';
import { ModuleResult } from '../../lib/moduleResult';

export interface ContinuityPayload {
  continuityScore: number; // 0-1
  survivability: 'resilient' | 'fragile' | 'critical';
  threats: string[];
}

interface Props {
  report: ContinuityReport;
  /** Real M18 (Organizational Continuity Intelligence) output -- null while
   *  loading or if the graph isn't ready. The KPI below is the only thing on
   *  this tab actually sourced from a verified backend module; everything
   *  else (department map, must-protect list) is continuityRisk.ts's local
   *  per-asset heuristic and is labeled as such, not claimed as verified. */
  module: ModuleResult<ContinuityPayload> | null;
}

const SURVIVAL_COLORS = {
  SURVIVES: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  DEGRADED: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  FAILS:    'text-orange-400 bg-orange-500/10 border-orange-500/20',
  LOST:     'text-red-400 bg-red-500/10 border-red-500/20',
};

export function ContinuityTab({ report, module }: Props) {
  const survives = report.assets.filter(a => a.survivalStatus === 'SURVIVES').length;
  const fails = report.assets.filter(a => a.survivalStatus === 'FAILS' || a.survivalStatus === 'LOST').length;
  const m18Score = module ? Math.round(module.payload.continuityScore * 100) : null;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 flex flex-col p-6 rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2" />
          <div className="flex items-center justify-between z-10 mb-2">
            <span className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wider">Org Continuity Score (M18)</span>
            <TruthBadge confidence={module ? module.confidence * 100 : null} />
          </div>
          {m18Score != null ? (
            <div className="flex items-end gap-3 z-10">
              <span className={`text-4xl font-bold ${m18Score >= 80 ? 'text-emerald-400' : m18Score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                {m18Score}
              </span>
              <span className="text-sm text-[color:var(--text-tertiary)] mb-1">/ 100 · {module!.payload.survivability}</span>
            </div>
          ) : (
            <span className="text-sm text-[color:var(--text-tertiary)] z-10">Unavailable — brain graph not ready</span>
          )}
        </div>

        <div className="flex flex-col p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <span className="text-xs text-emerald-400/80 uppercase tracking-wider mb-2 flex items-center gap-2"><HeartPulse size={14}/> Survives Disruption</span>
          <span className="text-2xl font-bold text-emerald-400">{survives}</span>
          <span className="text-[10px] text-emerald-400/60 mt-1">assets retain full function</span>
        </div>

        <div className="flex flex-col p-4 rounded-xl bg-red-500/5 border border-red-500/10">
          <span className="text-xs text-red-400/80 uppercase tracking-wider mb-2 flex items-center gap-2"><Activity size={14}/> Fails / Lost</span>
          <span className="text-2xl font-bold text-red-400">{fails}</span>
          <span className="text-[10px] text-red-400/60 mt-1">critical unrecoverable failure</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Department Map */}
        <div className="flex flex-col rounded-xl bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] p-6">
          <h3 className="text-sm font-semibold text-[color:var(--text-primary)] mb-1">Department Disruption Map</h3>
          <p className="text-[10px] text-[color:var(--text-tertiary)] mb-4 uppercase tracking-wide">Estimated — per-asset owner/backup/documentation model, not M18</p>
          <div className="flex flex-col gap-3">
            {Object.entries(report.deptContinuity).sort((a,b) => b[1].fails - a[1].fails).map(([dept, stats]) => (
              <div key={dept} className="flex flex-col gap-1.5 p-3 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-base)]">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-[color:var(--text-primary)]">{dept}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${stats.score >= 70 ? SURVIVAL_COLORS.SURVIVES : stats.score >= 40 ? SURVIVAL_COLORS.DEGRADED : SURVIVAL_COLORS.FAILS}`}>
                    Score: {stats.score}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-[color:var(--text-secondary)]">
                  <span>{stats.total} assets</span>
                  <span className="text-red-400">{stats.fails} at risk</span>
                </div>
                {/* Bar */}
                <div className="flex h-1.5 rounded-full overflow-hidden mt-1 bg-[color:var(--bg-elevated)] w-full">
                  <div className="bg-emerald-400 h-full" style={{ width: `${(stats.survives / stats.total) * 100}%` }} />
                  <div className="bg-red-400 h-full" style={{ width: `${(stats.fails / stats.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Must-Protect List */}
        <div className="flex flex-col rounded-xl bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] p-6">
          <h3 className="text-sm font-semibold text-red-400 mb-1 flex items-center gap-2">
            <ShieldAlert size={16} />
            Must-Protect Assets
          </h3>
          <p className="text-xs text-[color:var(--text-tertiary)] mb-4">Critical or High importance assets that fail during disruption</p>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[400px] pr-2">
            {report.mustProtect.map(a => (
              <div key={a.id} className="flex justify-between items-center p-3 rounded border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors">
                <div>
                  <p className="text-xs font-semibold text-[color:var(--text-primary)] leading-tight mb-1">{a.name}</p>
                  <p className="text-[10px] text-[color:var(--text-tertiary)] capitalize">{a.type} · {a.department}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${SURVIVAL_COLORS[a.survivalStatus]}`}>
                    {a.survivalStatus}
                  </span>
                  <span className="text-[10px] text-red-400 uppercase font-semibold">
                    {a.criticality}
                  </span>
                </div>
              </div>
            ))}
            {report.mustProtect.length === 0 && (
              <div className="p-8 text-center text-emerald-400/80 text-sm border rounded border-emerald-500/20 bg-emerald-500/5">
                <ShieldCheck className="mx-auto w-6 h-6 mb-2" />
                No critical must-protect assets identify as failing!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
