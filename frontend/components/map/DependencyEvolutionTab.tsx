'use client';

import React from 'react';
import { Agent, Dependency } from '../../types';
import { TruthBadge } from '../dashboard/TruthBadge';
import { GitCompare } from 'lucide-react';

interface Props {
  agents: Agent[];
  dependencies: Dependency[];
}

const TYPE_ORDER: Dependency['type'][] = ['critical', 'high', 'normal', 'low'];
const TYPE_COLOR: Record<Dependency['type'], string> = {
  critical: 'text-red-400',
  high: 'text-amber-400',
  normal: 'text-[color:var(--text-secondary)]',
  low: 'text-emerald-400',
};

// There is no persisted history of past dependency snapshots anywhere in the
// schema — this used to fabricate four fictional past periods (invented agent
// names, made-up fragility scores) and label them "Verified". What follows is
// the one honest thing derivable from real data: the current structure, with
// no invented trend. See constitutional module M33 (Dependency Evolution
// Intelligence) for the real trend classification this could grow into once
// it has a route and a way to persist snapshots over time.
export function DependencyEvolutionTab({ dependencies }: Props) {
  const total = dependencies.length;
  const byType = dependencies.reduce<Record<string, number>>((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {});
  const criticalCount = byType.critical || 0;
  const highShare = total ? Math.round((100 * ((byType.critical || 0) + (byType.high || 0))) / total) : 0;

  return (
    <div className="flex flex-col rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Dependency Evolution</h2>
          </div>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">
            Current dependency structure. Historical trend tracking is not available yet — there is
            no persisted snapshot history to compare against.
          </p>
        </div>
        <TruthBadge verified={dependencies.length > 0} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] flex flex-col">
          <span className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wider">Total Dependencies</span>
          <span className="text-2xl font-bold text-[color:var(--text-primary)] mt-2">{total}</span>
        </div>

        <div className="p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] flex flex-col">
          <span className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wider">Critical Dependencies</span>
          <span className={`text-2xl font-bold mt-2 ${criticalCount > 0 ? 'text-red-400' : 'text-[color:var(--text-primary)]'}`}>{criticalCount}</span>
        </div>

        <div className="p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] flex flex-col">
          <span className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wider">Critical + High Share</span>
          <span className={`text-2xl font-bold mt-2 ${highShare > 40 ? 'text-amber-400' : 'text-[color:var(--text-primary)]'}`}>{highShare}%</span>
        </div>
      </div>

      <div className="space-y-2">
        {total === 0 ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)]">
            <span className="text-sm text-[color:var(--text-tertiary)]">No dependencies recorded.</span>
          </div>
        ) : (
          TYPE_ORDER.filter((t) => byType[t]).map((t) => (
            <div key={t} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)]">
              <span className={`text-xs font-bold uppercase tracking-wider ${TYPE_COLOR[t]}`}>{t}</span>
              <span className="text-sm text-[color:var(--text-secondary)]">{byType[t]} dependenc{byType[t] === 1 ? 'y' : 'ies'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
