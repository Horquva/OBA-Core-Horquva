'use client';

import React, { useState } from 'react';
import { TruthBadge } from '../dashboard/TruthBadge';
import { ListOrdered, Flame } from 'lucide-react';
import { Recommendation, RecPriority } from '../../lib/recommendations';

const PRIORITY_META: Record<RecPriority, { color: string }> = {
  CRITICAL: { color: 'text-red-400' },
  HIGH:     { color: 'text-amber-400' },
  MEDIUM:   { color: 'text-sky-400' },
};

const EFFORT_META: Record<Recommendation['effort'], string> = {
  Quick:     'text-emerald-400 bg-emerald-500/5 border-emerald-500/20',
  Medium:    'text-amber-400 bg-amber-500/5 border-amber-500/20',
  Strategic: 'text-violet-400 bg-violet-500/5 border-violet-500/20',
};

const DRIVER_META: Record<string, { color: string; label: string }> = {
  spof:                    { color: 'text-red-400 bg-red-500/5 border-red-500/20', label: 'SPOF' },
  active_incident:         { color: 'text-orange-400 bg-orange-500/5 border-orange-500/20', label: 'Active Incident' },
  undocumented_knowledge:  { color: 'text-amber-400 bg-amber-500/5 border-amber-500/20', label: 'Undocumented' },
  tool_dependency:         { color: 'text-violet-400 bg-violet-500/5 border-violet-500/20', label: 'Tool Risk' },
  other:                   { color: 'text-sky-400 bg-sky-500/5 border-sky-500/20', label: 'Other' },
};

const DRIVER_ORDER = ['spof', 'active_incident', 'undocumented_knowledge', 'tool_dependency', 'other'];
const PRIORITY_ORDER: RecPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM'];
const EFFORT_ORDER: Record<Recommendation['effort'], number> = { Quick: 0, Medium: 1, Strategic: 2 };

function byPriorityThenEffort(a: { priority: RecPriority; effort: Recommendation['effort'] }, b: { priority: RecPriority; effort: Recommendation['effort'] }) {
  const pd = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
  if (pd !== 0) return pd;
  return EFFORT_ORDER[a.effort] - EFFORT_ORDER[b.effort];
}

interface Props {
  recommendations: Recommendation[];
}

export function DecisionSupportQueue({ recommendations }: Props) {
  const [filter, setFilter] = useState<string>('ALL');

  // driverKey is a genuine grouping of rec.category (real, brain module M04-derived, D-62).
  // Previously this component also fabricated per-item impactScore/urgencyScore/effortScore/
  // blastRadius numbers from rec.priority/effort/targetType via arithmetic with no real basis,
  // then re-derived a "priorityScore" from those fabricated numbers -- displaying manufactured
  // precision on top of a genuine 3-tier signal. Now it just groups and sorts by the real
  // `priority`/`effort` fields brain module M04 already computed (D-62).
  const mappedItems = recommendations.map(rec => {
    let driverKey = 'other';
    if (rec.category === 'OWNERSHIP' || rec.category === 'CONCENTRATION') driverKey = 'spof';
    if (rec.category === 'DOCUMENTATION') driverKey = 'undocumented_knowledge';
    if (rec.category === 'TOOL_GOVERNANCE') driverKey = 'tool_dependency';

    return {
      id: rec.id,
      title: rec.title,
      description: rec.description,
      driverKey,
      priority: rec.priority,
      effort: rec.effort,
      targetType: rec.targetType,
      entityName: rec.targetName,
    };
  });

  const grouped = DRIVER_ORDER.reduce<Record<string, typeof mappedItems>>((acc, key) => {
    const items = mappedItems.filter(q => q.driverKey === key).sort(byPriorityThenEffort);
    if (items.length > 0) acc[key] = items;
    return acc;
  }, {});

  const allItems = mappedItems
    .filter(q => filter === 'ALL' || q.driverKey === filter)
    .sort(byPriorityThenEffort);

  return (
    <div className="flex flex-col rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-6 relative overflow-hidden mt-4">
      <div className="absolute top-0 right-0 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl pointer-events-none translate-x-1/3 -translate-y-1/3" />

      <div className="flex items-center justify-between mb-6 z-10">
        <div>
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Decision Support Queue</h2>
          </div>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">Ranked by priority and effort, grouped by driver</p>
        </div>
        <TruthBadge verified={recommendations.length > 0} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6 z-10">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${filter === 'ALL' ? 'text-orange-400 bg-orange-500/10 border-orange-500/30' : 'text-[color:var(--text-secondary)] bg-[color:var(--bg-card)] border-[color:var(--border-subtle)] hover:text-[color:var(--text-primary)]'}`}
        >
          All <span className="ml-1 text-xs opacity-70">{mappedItems.length}</span>
        </button>
        {Object.entries(grouped).map(([key, items]) => {
          const meta = DRIVER_META[key] ?? DRIVER_META.other;
          const isActive = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${isActive ? `${meta.color}` : 'text-[color:var(--text-secondary)] bg-[color:var(--bg-card)] border-[color:var(--border-subtle)] hover:text-[color:var(--text-primary)]'}`}
            >
              {meta.label} <span className="ml-1 text-xs opacity-70">{items.length}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 z-10">
        {allItems.map((item, i) => {
          const driverMeta = DRIVER_META[item.driverKey] ?? DRIVER_META.other;
          const isTopPriority = i === 0 && filter === 'ALL';
          return (
            <div
              key={item.id}
              className={`flex flex-col gap-4 p-4 rounded-lg border transition-colors ${isTopPriority ? 'border-orange-500/30 bg-orange-500/5' : 'bg-[color:var(--bg-card)] border-[color:var(--border-subtle)] hover:border-orange-500/10'}`}
            >
              <div className="flex items-start gap-3">
                {isTopPriority && (
                  <div className="p-1.5 rounded-lg bg-orange-500/10 shrink-0 mt-0.5">
                    <Flame className="w-4 h-4 text-orange-400" />
                  </div>
                )}
                {!isTopPriority && (
                  <span className="text-xs font-mono text-[color:var(--text-tertiary)] mt-1 w-5 shrink-0">#{i + 1}</span>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[color:var(--text-primary)] text-sm">{item.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${driverMeta.color}`}>{driverMeta.label}</span>
                  </div>
                  <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">{item.description}</p>
                  {item.entityName && (
                    <div className="mt-1 text-[10px] text-[color:var(--text-tertiary)]">
                      Entity: <span className="text-[color:var(--text-secondary)]">{item.entityName}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className={`text-sm font-bold uppercase tracking-wider ${PRIORITY_META[item.priority].color}`}>{item.priority}</span>
                  <span className="text-[9px] text-[color:var(--text-tertiary)] uppercase tracking-wider">priority</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[color:var(--border-subtle)]">
                <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${EFFORT_META[item.effort]}`}>{item.effort} effort</span>
                <span className="text-[10px] px-2 py-0.5 rounded border font-semibold text-[color:var(--text-secondary)] bg-[color:var(--bg-elevated)] border-[color:var(--border-subtle)] capitalize">{item.targetType}</span>
              </div>
            </div>
          );
        })}
        {allItems.length === 0 && (
            <div className="p-8 text-center text-[var(--text-tertiary)] border border-dashed border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--bg-card)]">
                No items match this queue segment.
            </div>
        )}
      </div>
    </div>
  );
}
