'use client';

import React from 'react';
import { PersonProfile } from '../../lib/knowledgeRisk';
import { TruthBadge } from '../dashboard/TruthBadge';
import { Users, AlertTriangle } from 'lucide-react';

interface OrgConcentration {
  busFactor: number;
  hhi: number;
  hhiTier: 'HEALTHY' | 'MODERATE' | 'HIGH' | 'SEVERE';
}

interface Props {
  profiles: PersonProfile[];
  /** GET /api/knowledge/intelligence's orgConcentration -- bus factor + HHI
   *  computed backend-side over the same criticality-weighted shares
   *  domain/derived.js's knowledgeConcentration() already produces (the same
   *  numbers behind each profile's own concentrationScore/riskTier), not a
   *  second, unweighted formula over raw asset counts. Null means the
   *  overlay fetch failed or hasn't resolved yet. */
  orgConcentration: OrgConcentration | null;
}

const HHI_STYLE: Record<OrgConcentration['hhiTier'], { color: string; bar: string }> = {
  SEVERE:   { color: 'text-red-400 border-red-500/20 bg-red-500/10',       bar: 'bg-red-400' },
  HIGH:     { color: 'text-amber-400 border-amber-500/20 bg-amber-500/10', bar: 'bg-amber-400' },
  MODERATE: { color: 'text-sky-400 border-sky-500/20 bg-sky-500/10',       bar: 'bg-sky-400' },
  HEALTHY:  { color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10', bar: 'bg-emerald-400' },
};

export function KnowledgeConcentrationGauge({ profiles, orgConcentration }: Props) {
  const busFactor = orgConcentration?.busFactor ?? null;
  const hhi = orgConcentration?.hhi ?? null;
  const hhiTier = orgConcentration?.hhiTier ?? null;
  const { color: hhiColor, bar: barColor } = HHI_STYLE[hhiTier ?? 'HEALTHY'];

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
        <TruthBadge verified={orgConcentration != null} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 z-10">
        {/* Bus Factor */}
        <div className="flex flex-col p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] text-center justify-center items-center">
          <span className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wider mb-2">Bus Factor</span>
          <span className={`text-4xl font-bold ${busFactor == null ? 'text-[color:var(--text-tertiary)]' : busFactor <= 2 ? 'text-red-400' : busFactor <= 4 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {busFactor ?? '—'}
          </span>
          <span className="text-xs text-[color:var(--text-secondary)] mt-3 text-balance">
            people departing would wipe out &gt;50% of organizational knowledge
          </span>
        </div>

        {/* HHI Gauge */}
        <div className="flex flex-col p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)]">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wider">HHI Score</span>
            {hhiTier && <span className={`text-[10px] px-2 py-1 rounded font-bold border ${hhiColor}`}>{hhiTier}</span>}
          </div>

          <div className="mt-auto">
            <div className="flex justify-between items-end mb-2">
              <span className={`text-2xl font-bold ${hhi == null ? 'text-[color:var(--text-tertiary)]' : hhiColor.split(' ')[0]}`}>{hhi != null ? hhi.toLocaleString() : '—'}</span>
              <span className="text-xs text-[color:var(--text-tertiary)]">/ 10,000</span>
            </div>
            <div className="h-2 rounded-full bg-[color:var(--bg-elevated)] overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${hhi != null ? Math.min(100, (hhi / 10000) * 100) : 0}%` }} />
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
