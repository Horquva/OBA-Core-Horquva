'use client';

import React, { useMemo, useState } from 'react';
import { ScenarioResult, ScenarioType } from '../../lib/simulation';
import { TruthBadge } from '../dashboard/TruthBadge';
import { Globe, UserMinus, ShieldOff, Cpu, ChevronUp, ChevronDown, ArrowRight } from 'lucide-react';

interface Props {
  scenarios: ScenarioResult[];
}

type SortKey = 'survivability' | 'delta' | 'cascades' | 'name' | 'type';
type FilterType = 'ALL' | ScenarioType;

const TYPE_META: Record<ScenarioType, { label: string; icon: React.ElementType; color: string }> = {
  PERSON_LEAVES:    { label: 'Person Leaves',    icon: UserMinus, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  AGENT_FAILS:      { label: 'Agent Fails',      icon: ShieldOff, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  TOOL_UNAVAILABLE: { label: 'Tool Unavailable', icon: Cpu,       color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
};

function survivabilityScore(s: ScenarioResult) {
  // How well does the org survive? (Higher = safer to lose this entity)
  return s.simulatedHealthScore;
}

function survivabilityLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: 'Resilient',  color: 'text-emerald-400' };
  if (score >= 55) return { label: 'Stable',     color: 'text-sky-400' };
  if (score >= 40) return { label: 'Stressed',   color: 'text-amber-400' };
  if (score >= 25) return { label: 'Critical',   color: 'text-orange-400' };
  return               { label: 'Catastrophic', color: 'text-red-500' };
}

function SortIcon({ col, sortKey, sortAsc }: { col: SortKey; sortKey: SortKey; sortAsc: boolean }) {
  if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-30" />;
  return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
}

export function SimulationUniverseRanking({ scenarios }: Props) {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('survivability');
  const [sortAsc, setSortAsc] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);

  const universe = scenarios;

  const filtered = useMemo(() => {
    const base = filter === 'ALL' ? universe : universe.filter(s => s.type === filter);
    return [...base].sort((a, b) => {
      let diff = 0;
      if (sortKey === 'survivability') diff = survivabilityScore(a) - survivabilityScore(b);
      else if (sortKey === 'delta')    diff = a.healthDelta - b.healthDelta;
      else if (sortKey === 'cascades') diff = a.impactedAgents.length - b.impactedAgents.length;
      else if (sortKey === 'name')     diff = a.targetName.localeCompare(b.targetName);
      else if (sortKey === 'type')     diff = a.type.localeCompare(b.type);
      return sortAsc ? diff : -diff;
    });
  }, [universe, filter, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  const counts = {
    PERSON_LEAVES: universe.filter(s => s.type === 'PERSON_LEAVES').length,
    AGENT_FAILS:   universe.filter(s => s.type === 'AGENT_FAILS').length,
    TOOL_UNAVAILABLE: universe.filter(s => s.type === 'TOOL_UNAVAILABLE').length,
  };

  return (
    <div className="flex flex-col rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-6 relative overflow-hidden">
      {/* BG glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-violet-500/5 rounded-full blur-3xl pointer-events-none translate-x-1/3 -translate-y-1/3" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 z-10">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Simulation Universe Ranking</h2>
          </div>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">
            Every entity ranked by org survivability — sorted by what breaks the most
          </p>
        </div>
        <TruthBadge verified={universe.length > 0} />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6 z-10">
        {([['ALL', 'All Scenarios', universe.length], ['PERSON_LEAVES', 'People', counts.PERSON_LEAVES], ['AGENT_FAILS', 'Agents', counts.AGENT_FAILS], ['TOOL_UNAVAILABLE', 'Tools', counts.TOOL_UNAVAILABLE]] as const).map(([key, label, count]) => {
          const isActive = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key as FilterType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                isActive
                  ? 'text-violet-400 bg-violet-500/10 border-violet-500/30'
                  : 'text-[color:var(--text-secondary)] bg-[color:var(--bg-card)] border-[color:var(--border-subtle)] hover:text-[color:var(--text-primary)]'
              }`}
            >
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-violet-500/20' : 'bg-[color:var(--bg-elevated)]'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="z-10 overflow-x-auto rounded-lg border border-[color:var(--border-subtle)]">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-[color:var(--bg-card)] border-b border-[color:var(--border-subtle)]">
              <th className="p-3 w-8 text-center text-[color:var(--text-tertiary)] text-xs font-medium">#</th>

              <th className="p-3 cursor-pointer select-none hover:text-[color:var(--text-primary)] text-[color:var(--text-tertiary)] font-medium" onClick={() => toggleSort('name')}>
                <div className="flex items-center gap-1">Entity <SortIcon col="name" sortKey={sortKey} sortAsc={sortAsc} /></div>
              </th>

              <th className="p-3 cursor-pointer select-none hover:text-[color:var(--text-primary)] text-[color:var(--text-tertiary)] font-medium" onClick={() => toggleSort('type')}>
                <div className="flex items-center gap-1">Type <SortIcon col="type" sortKey={sortKey} sortAsc={sortAsc} /></div>
              </th>

              <th className="p-3 cursor-pointer select-none hover:text-[color:var(--text-primary)] text-[color:var(--text-tertiary)] font-medium" onClick={() => toggleSort('survivability')}>
                <div className="flex items-center gap-1">Survivability <SortIcon col="survivability" sortKey={sortKey} sortAsc={sortAsc} /></div>
              </th>

              <th className="p-3 cursor-pointer select-none hover:text-[color:var(--text-primary)] text-[color:var(--text-tertiary)] font-medium" onClick={() => toggleSort('delta')}>
                <div className="flex items-center gap-1">Health Δ <SortIcon col="delta" sortKey={sortKey} sortAsc={sortAsc} /></div>
              </th>

              <th className="p-3 cursor-pointer select-none hover:text-[color:var(--text-primary)] text-[color:var(--text-tertiary)] font-medium" onClick={() => toggleSort('cascades')}>
                <div className="flex items-center gap-1">Cascades <SortIcon col="cascades" sortKey={sortKey} sortAsc={sortAsc} /></div>
              </th>

              <th className="p-3 text-[color:var(--text-tertiary)] font-medium">Before <ArrowRight className="w-3 h-3 inline mx-1" /> After</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[color:var(--border-subtle)]">
            {filtered.map((s, idx) => {
              const meta = TYPE_META[s.type];
              const Icon = meta.icon;
              const score = survivabilityScore(s);
              const { label, color } = survivabilityLabel(score);
              const isHovered = hovered === s.id;

              return (
                <tr
                  key={s.id}
                  className={`transition-colors ${isHovered ? 'bg-[color:var(--bg-card)]' : ''}`}
                  onMouseEnter={() => setHovered(s.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Rank */}
                  <td className="p-3 text-center">
                    <span className="text-xs font-mono text-[color:var(--text-tertiary)]">{idx + 1}</span>
                  </td>

                  {/* Name */}
                  <td className="p-3 font-medium text-[color:var(--text-primary)] max-w-48">
                    <span className="truncate block">{s.targetName}</span>
                  </td>

                  {/* Type badge */}
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${meta.color}`}>
                      <Icon className="w-3 h-3" />
                      {meta.label}
                    </span>
                  </td>

                  {/* Survivability bar */}
                  <td className="p-3">
                    <div className="flex flex-col gap-1 min-w-32">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${color}`}>{label}</span>
                        <span className="text-xs text-[color:var(--text-tertiary)]">{score}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[color:var(--bg-card)] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            score >= 75 ? 'bg-emerald-400' :
                            score >= 55 ? 'bg-sky-400' :
                            score >= 40 ? 'bg-amber-400' :
                            score >= 25 ? 'bg-orange-400' : 'bg-red-500'
                          }`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Delta */}
                  <td className="p-3">
                    <span className={`text-sm font-bold ${s.healthDelta > 10 ? 'text-red-400' : s.healthDelta > 5 ? 'text-amber-400' : 'text-[color:var(--text-secondary)]'}`}>
                      {s.healthDelta > 0 ? '-' : s.healthDelta < 0 ? '+' : ''}{Math.abs(s.healthDelta)}
                    </span>
                  </td>

                  {/* Cascade count */}
                  <td className="p-3">
                    <span className={`text-sm font-semibold ${s.impactedAgents.length >= 4 ? 'text-red-400' : s.impactedAgents.length >= 2 ? 'text-amber-400' : 'text-[color:var(--text-secondary)]'}`}>
                      {s.impactedAgents.length}
                    </span>
                    <span className="text-xs text-[color:var(--text-tertiary)] ml-1">agent{s.impactedAgents.length !== 1 ? 's' : ''}</span>
                  </td>

                  {/* Before → After health */}
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 text-xs text-[color:var(--text-secondary)]">
                      <span className="font-mono">{s.baselineHealthScore}</span>
                      <ArrowRight className="w-3 h-3 text-[color:var(--text-tertiary)]" />
                      <span className={`font-mono font-semibold ${score < 40 ? 'text-red-400' : score < 55 ? 'text-amber-400' : 'text-emerald-400'}`}>{s.simulatedHealthScore}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-[color:var(--text-tertiary)] text-sm">
            No scenarios match this filter
          </div>
        )}
      </div>

      <p className="mt-3 text-[10px] text-[color:var(--text-tertiary)] z-10">
        Survivability score = simulated org health score if this entity is removed. Lower = more dangerous to lose. Sortable by any column.
      </p>
    </div>
  );
}
