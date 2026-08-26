'use client';

import React, { useState } from 'react';
import { TruthBadge } from '../dashboard/TruthBadge';
import { Layers, Zap, TrendingUp, ChevronRight } from 'lucide-react';
import { Recommendation, RecPriority } from '../../lib/recommendations';

interface Props {
  recommendations: Recommendation[];
}

const PRIORITY_COLOR: Record<RecPriority, string> = {
  CRITICAL: 'text-red-400',
  HIGH: 'text-amber-400',
  MEDIUM: 'text-sky-400',
};

export function OpportunityBacklogTab({ recommendations }: Props) {
  const [tab, setTab] = useState<'quick-win' | 'strategic-bet'>('quick-win');

  // Transform standard recommendations into Backlog items. Previously computed
  // a fabricated "leverageScore" (start at 50, +30/+15/+15/+5 point arithmetic
  // with no real basis) used for both the displayed number and sort order --
  // same anti-pattern already fixed in DecisionSupportQueue.tsx. `recommendations`
  // arrives already sorted CRITICAL->HIGH->MEDIUM then by effort
  // (brain module M04's own priority/effort sort, D-62), and filtering preserves that
  // order, so no re-sort is needed once the fake score is gone.
  const items = recommendations.map(rec => {
    // Quick if effort is quick/medium, strategic if strategic
    const category = rec.effort === 'Quick' ? 'quick-win' : 'strategic-bet';

    return {
      id: rec.id,
      title: rec.title,
      description: rec.description,
      category,
      priority: rec.priority,
      effort: rec.effort === 'Quick' ? 'LOW' : rec.effort === 'Medium' ? 'MED' : 'HIGH',
      impact: rec.priority === 'CRITICAL' ? 'HIGH' : rec.priority === 'HIGH' ? 'MED' : 'LOW',
      owner: rec.targetType === 'person' ? rec.targetName : undefined,
      tag: rec.category
    };
  }).filter(i => i.category === tab);

  const EFFORT_COLOR: Record<string, string> = {
    LOW:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    MED:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
    HIGH: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  const IMPACT_COLOR: Record<string, string> = {
    HIGH: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    MED:  'text-sky-400 bg-sky-500/10 border-sky-500/20',
    LOW:  'text-[color:var(--text-tertiary)] bg-[color:var(--bg-card)] border-[color:var(--border-subtle)]',
  };

  return (
    <div className="flex flex-col rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-6 relative overflow-hidden mt-4">
      <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -translate-x-1/3 -translate-y-1/3" />

      <div className="flex items-center justify-between mb-6 z-10">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Opportunity Backlog</h2>
          </div>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">Priority-ranked quick wins vs. strategic bets</p>
        </div>
        <TruthBadge verified={items.length > 0} />
      </div>

      <div className="flex gap-2 mb-6 z-10">
        <button
          onClick={() => setTab('quick-win')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${tab === 'quick-win' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-[color:var(--text-secondary)] bg-[color:var(--bg-card)] border-[color:var(--border-subtle)] hover:text-[color:var(--text-primary)]'}`}
        >
          <Zap className="w-4 h-4" />
          Quick Wins <span className="text-xs">{recommendations.filter(r => r.effort === 'Quick').length}</span>
        </button>
        <button
          onClick={() => setTab('strategic-bet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${tab === 'strategic-bet' ? 'text-violet-400 bg-violet-500/10 border-violet-500/30' : 'text-[color:var(--text-secondary)] bg-[color:var(--bg-card)] border-[color:var(--border-subtle)] hover:text-[color:var(--text-primary)]'}`}
        >
          <TrendingUp className="w-4 h-4" />
          Strategic Bets <span className="text-xs">{recommendations.filter(r => r.effort !== 'Quick').length}</span>
        </button>
      </div>

      <div className="space-y-3 z-10">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] hover:border-indigo-500/20 transition-colors">
            <div className="flex flex-col items-center justify-start pt-1 shrink-0">
              <span className="text-xs font-mono text-[color:var(--text-tertiary)] w-6 text-center">#{i + 1}</span>
              <div className="mt-2 text-center">
                <span className={`text-sm font-bold uppercase tracking-wider ${PRIORITY_COLOR[item.priority]}`}>{item.priority}</span>
                <span className="block text-[9px] text-[color:var(--text-tertiary)] uppercase tracking-wider leading-tight">priority</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h3 className="font-semibold text-[color:var(--text-primary)] text-sm">{item.title}</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] text-[color:var(--text-tertiary)]">{item.tag}</span>
              </div>
              <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed mb-3">{item.description}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded border font-medium ${EFFORT_COLOR[item.effort]}`}>Effort: {item.effort}</span>
                <span className={`text-xs px-2 py-0.5 rounded border font-medium ${IMPACT_COLOR[item.impact]}`}>Impact: {item.impact}</span>
                {item.owner && <span className="text-xs text-[color:var(--text-tertiary)]">Owner: {item.owner}</span>}
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-[color:var(--text-tertiary)] shrink-0 mt-1" />
          </div>
        ))}
        {items.length === 0 && (
            <div className="p-8 text-center text-[var(--text-tertiary)] border border-dashed border-[var(--border-subtle)] rounded-lg text-sm">
                No items match this filter category.
            </div>
        )}
      </div>
    </div>
  );
}
