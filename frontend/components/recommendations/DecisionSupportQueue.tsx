'use client';

import React, { useState } from 'react';
import { TruthBadge } from '../dashboard/TruthBadge';
import { ListOrdered, Flame } from 'lucide-react';
import { Recommendation } from '../../lib/recommendations';

function ScoreGauge({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'bg-red-400' : value >= 60 ? 'bg-amber-400' : 'bg-sky-400';
  return (
    <div className="flex flex-col gap-1 min-w-20">
      <div className="flex justify-between text-[10px]">
        <span className="text-[color:var(--text-tertiary)]">{label}</span>
        <span className="text-[color:var(--text-secondary)] font-medium">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-[color:var(--bg-card)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const DRIVER_META: Record<string, { color: string; label: string }> = {
  spof:                    { color: 'text-red-400 bg-red-500/5 border-red-500/20', label: 'SPOF' },
  active_incident:         { color: 'text-orange-400 bg-orange-500/5 border-orange-500/20', label: 'Active Incident' },
  undocumented_knowledge:  { color: 'text-amber-400 bg-amber-500/5 border-amber-500/20', label: 'Undocumented' },
  tool_dependency:         { color: 'text-violet-400 bg-violet-500/5 border-violet-500/20', label: 'Tool Risk' },
  other:                   { color: 'text-sky-400 bg-sky-500/5 border-sky-500/20', label: 'Other' },
};

const DRIVER_ORDER = ['spof', 'active_incident', 'undocumented_knowledge', 'tool_dependency', 'other'];

interface Props {
  recommendations: Recommendation[];
}

export function DecisionSupportQueue({ recommendations }: Props) {
  const [filter, setFilter] = useState<string>('ALL');

  const mappedItems = recommendations.map(rec => {
    let driverKey = 'other';
    if (rec.category === 'OWNERSHIP' || rec.category === 'CONCENTRATION') driverKey = 'spof';
    if (rec.category === 'DOCUMENTATION') driverKey = 'undocumented_knowledge';
    if (rec.category === 'TOOL_GOVERNANCE') driverKey = 'tool_dependency';
    
    // Derived numeric mockups based on priority for matrix display
    let impactScore = rec.priority === 'CRITICAL' ? 95 : rec.priority === 'HIGH' ? 75 : 50;
    let urgencyScore = rec.priority === 'CRITICAL' ? 90 : rec.effort === 'Quick' ? 70 : 40;
    let effortScore = rec.effort === 'Quick' ? 15 : rec.effort === 'Medium' ? 45 : 85;
    let blastRadius = rec.targetType === 'tool' ? 7 : rec.targetType === 'person' ? 5 : 2;

    const priorityScore = Math.min(100, Math.round((impactScore * 0.6) + (urgencyScore * 0.4)));

    return {
      id: rec.id,
      title: rec.title,
      description: rec.description,
      driverKey,
      impactScore,
      urgencyScore,
      effortScore,
      blastRadius,
      priorityScore,
      entityName: rec.targetName,
    };
  });

  const grouped = DRIVER_ORDER.reduce<Record<string, typeof mappedItems>>((acc, key) => {
    const items = mappedItems.filter(q => q.driverKey === key).sort((a, b) => b.priorityScore - a.priorityScore);
    if (items.length > 0) acc[key] = items;
    return acc;
  }, {});

  const allItems = mappedItems
    .filter(q => filter === 'ALL' || q.driverKey === filter)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  return (
    <div className="flex flex-col rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-6 relative overflow-hidden mt-4">
      <div className="absolute top-0 right-0 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl pointer-events-none translate-x-1/3 -translate-y-1/3" />

      <div className="flex items-center justify-between mb-6 z-10">
        <div>
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Decision Support Queue</h2>
          </div>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">Impact × urgency ranked, grouped by driver</p>
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
                  <span className={`text-xl font-bold ${item.priorityScore >= 80 ? 'text-red-400' : item.priorityScore >= 65 ? 'text-amber-400' : 'text-sky-400'}`}>{item.priorityScore}</span>
                  <span className="text-[9px] text-[color:var(--text-tertiary)] uppercase tracking-wider">priority</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[color:var(--border-subtle)]">
                <ScoreGauge label="Impact" value={item.impactScore} />
                <ScoreGauge label="Urgency" value={item.urgencyScore} />
                <ScoreGauge label="Blast ×" value={Math.min(item.blastRadius * 15, 100)} />
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
