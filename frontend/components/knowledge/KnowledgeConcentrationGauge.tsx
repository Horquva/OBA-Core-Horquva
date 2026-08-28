'use client';

import React from 'react';
import { PersonProfile } from '../../lib/knowledgeRisk';
import { TruthBadge } from '../dashboard/TruthBadge';
import { Users, AlertTriangle } from 'lucide-react';

interface Props {
  profiles: PersonProfile[];
  totalAssets: number;
}

export function KnowledgeConcentrationGauge({ profiles, totalAssets }: Props) {
  // Bus Factor = how many people have to leave for >50% of critical knowledge to be lost?
  // We'll approximate this by sorting by totalOwned and finding how many sum to >50%.
  
  const sorted = [...profiles].sort((a, b) => b.totalOwned - a.totalOwned);
  let busFactor = 0;
  let accum = 0;
  for (const p of sorted) {
    busFactor++;
    accum += p.totalOwned;
    if (totalAssets > 0 && accum / totalAssets > 0.5) break;
  }

  // HHI (Herfindahl-Hirschman Index) to measure concentration.
  // Sum of squares of market shares. Max is 10,000 (one person owns 100%).
  const hhi = profiles.reduce((sum, p) => {
    const share = totalAssets > 0 ? (p.totalOwned / totalAssets) * 100 : 0;
    return sum + (share * share);
  }, 0);

  let hhiRisk: 'HEALTHY' | 'MODERATE' | 'HIGH' | 'SEVERE';
  let hhiColor: string;
  let barColor: string;
  
  if (hhi > 4000) {
    hhiRisk = 'SEVERE';
    hhiColor = 'text-red-400 border-red-500/20 bg-red-500/10';
    barColor = 'bg-red-400';
  } else if (hhi > 2500) {
    hhiRisk = 'HIGH';
    hhiColor = 'text-amber-400 border-amber-500/20 bg-amber-500/10';
    barColor = 'bg-amber-400';
  } else if (hhi > 1500) {
    hhiRisk = 'MODERATE';
    hhiColor = 'text-sky-400 border-sky-500/20 bg-sky-500/10';
    barColor = 'bg-sky-400';
  } else {
    hhiRisk = 'HEALTHY';
    hhiColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
    barColor = 'bg-emerald-400';
  }

  const singleHolders = profiles.filter(p => p.isSoleHolder).length;

  return (
    <div className="flex flex-col rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2" />

      <div className="flex items-center justify-between mb-6 z-10">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-fuchsia-400" />
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Knowledge Concentration Gauge</h2>
          </div>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">Bus factor, HHI distribution, and single-holder counts</p>
        </div>
        {/* Bus factor / HHI below are local heuristics over computeKnowledgeRisk()'s
            output, not a backend-verified score -- not something to badge as verified. */}
        <TruthBadge verified={false} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 z-10">
        {/* Bus Factor */}
        <div className="flex flex-col p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] text-center justify-center items-center">
          <span className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wider mb-2">Bus Factor</span>
          <span className={`text-4xl font-bold ${busFactor <= 2 ? 'text-red-400' : busFactor <= 4 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {busFactor}
          </span>
          <span className="text-xs text-[color:var(--text-secondary)] mt-3 text-balance">
            people departing would wipe out &gt;50% of organizational knowledge
          </span>
        </div>

        {/* HHI Gauge */}
        <div className="flex flex-col p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)]">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wider">HHI Score</span>
            <span className={`text-[10px] px-2 py-1 rounded font-bold border ${hhiColor}`}>{hhiRisk}</span>
          </div>
          
          <div className="mt-auto">
            <div className="flex justify-between items-end mb-2">
              <span className={`text-2xl font-bold ${hhiColor.split(' ')[0]}`}>{Math.round(hhi).toLocaleString()}</span>
              <span className="text-xs text-[color:var(--text-tertiary)]">/ 10,000</span>
            </div>
            <div className="h-2 rounded-full bg-[color:var(--bg-elevated)] overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, (hhi / 10000) * 100)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-[color:var(--text-tertiary)] mt-1.5">
              <span>Healthy (&lt;1500)</span>
              <span>Severe (&gt;4000)</span>
            </div>
          </div>
        </div>

        {/* Single Holders */}
        <div className="flex flex-col p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] text-center justify-center items-center relative overflow-hidden">
          {singleHolders > 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2 pointer-events-none" />}
          
          <span className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            Single Holders {singleHolders > 0 && <AlertTriangle className="w-3 h-3 text-amber-400" />}
          </span>
          <span className={`text-4xl font-bold ${singleHolders > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {singleHolders}
          </span>
          <span className="text-xs text-[color:var(--text-secondary)] mt-3 text-balance">
            people hold exclusive knowledge with no backup owners assigned
          </span>
        </div>
      </div>
    </div>
  );
}
