'use client';

import React from 'react';
import { TruthBadge } from '../dashboard/TruthBadge';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Recommendation } from '../../lib/recommendations';

interface Props {
  recommendations: Recommendation[];
}

export function VerifiedAdvisorPanel({ recommendations }: Props) {
  // Was previously procedurally generating a fake "confidence score" (99 - i,
  // decreasing per index with no relationship to anything real) and marking
  // every item verified: true unconditionally, under a header claiming
  // "sourced only from Truth-verified data" -- none of which was true. There
  // is no per-recommendation Truth-layer verdict to show. What's real: these
  // are the CRITICAL/HIGH-priority items from brain module M04 (D-62),
  // which is itself now driven by the backend's canonical predictiveRisk()
  // tier (see lib/recommendations.ts), not a local heuristic -- so the
  // ranking is real, the fabricated per-item confidence number was not.
  const topItems = recommendations
    .filter(r => r.priority === 'CRITICAL' || r.priority === 'HIGH')
    .map(r => ({
      id: r.id,
      title: r.title,
      rationale: r.description,
      dataSource: r.targetType === 'agent' ? 'Ownership Registry + Dep Graph' : 'Tool Intelligence Report',
      action: r.action,
      urgency: (r.priority === 'CRITICAL' ? 'IMMEDIATE' : r.effort === 'Quick' ? 'THIS_WEEK' : 'THIS_MONTH') as 'IMMEDIATE' | 'THIS_WEEK' | 'THIS_MONTH'
    }))
    .slice(0, 4); // Limit to top 4

  const URGENCY_META = {
    IMMEDIATE:  { label: 'Immediate',   color: 'text-red-400 border-red-500/30 bg-red-500/5' },
    THIS_WEEK:  { label: 'This Week',   color: 'text-amber-400 border-amber-500/30 bg-amber-500/5' },
    THIS_MONTH: { label: 'This Month',  color: 'text-sky-400 border-sky-500/30 bg-sky-500/5' },
  };

  return (
    <div className="flex flex-col rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-6 relative overflow-hidden mt-4">
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />

      <div className="flex items-center justify-between mb-6 z-10">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Priority Advisor Panel</h2>
          </div>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">Top CRITICAL/HIGH recommendations, ranked from live risk and ownership data</p>
        </div>
        <TruthBadge verified={topItems.length > 0} />
      </div>

      <div className="space-y-4 z-10">
        {topItems.map((rec) => {
          const urgMeta = URGENCY_META[rec.urgency];
          return (
            <div key={rec.id} className="flex flex-col gap-3 p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] hover:border-emerald-500/20 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg bg-emerald-500/10 shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[color:var(--text-primary)] text-sm">{rec.title}</h3>
                  </div>
                  <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">{rec.rationale}</p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded border ${urgMeta.color}`}>{urgMeta.label}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[color:var(--border-subtle)]">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <AlertCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-[color:var(--text-secondary)]"><strong className="text-[color:var(--text-primary)]">Action:</strong> {rec.action}</span>
                </div>
                <span className="text-[10px] text-[color:var(--text-tertiary)] shrink-0">Source: {rec.dataSource}</span>
              </div>
            </div>
          );
        })}
        {topItems.length === 0 && (
            <div className="p-8 text-center text-[var(--text-tertiary)] border border-dashed border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--bg-card)]">
                No CRITICAL or HIGH priority recommendations currently flagged.
            </div>
        )}
      </div>
    </div>
  );
}
