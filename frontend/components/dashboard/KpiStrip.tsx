'use client';

import { useEffect, useState } from 'react';
import { Activity, Users, AlertTriangle, Link2 } from 'lucide-react';
import { healthApi } from '../../lib/api';
import { authHeader } from '../../lib/authFetch';

interface KpiData {
  riskScore: number;
  totalAgents: number;
  orphanedAgents: number;
  criticalCount: number;
}

export function KpiStrip() {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    Promise.all([
      // Same counts the rest of the app uses (agents.js risk-summary), instead
      // of re-deriving "orphaned"/"critical" client-side from the raw list —
      // one definition of those counts, not two that can quietly drift apart.
      fetch(`${base}/api/agents/risk-summary`, { headers: authHeader() }).then(r => r.json()).catch(() => null),
      healthApi.summary().catch(() => null),
    ]).then(([riskSummary, health]) => {
      const totalAgents    = riskSummary?.total ?? 0;
      const orphanedAgents = riskSummary?.orphaned ?? 0;
      const criticalCount  = riskSummary?.breakdown?.critical ?? 0;
      const riskScore      = health?.healthIndex ?? 0;

      setData({ riskScore, totalAgents, orphanedAgents, criticalCount });
    }).finally(() => setLoading(false));
  }, []);

  const skeleton = (
    <div className="h-12 rounded-lg bg-[var(--border-subtle)] animate-pulse" />
  );

  const score        = data?.riskScore ?? 0;
  const totalAgents  = data?.totalAgents ?? 0;
  const orphaned     = data?.orphanedAgents ?? 0;
  const critical     = data?.criticalCount ?? 0;

  const riskColor = score >= 60 ? 'from-emerald-600 to-emerald-400'
    : score >= 40 ? 'from-amber-500 to-amber-400'
    : 'from-red-600 to-red-400';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

      {/* Card 1 — Health / Risk Score */}
      <div className="card p-5 flex flex-col justify-between relative overflow-hidden group animate-fade-up delay-75">
        <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r ${riskColor}`} />
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="flex justify-between items-center mb-4 relative z-10">
          <span className="text-sm font-medium text-[color:var(--text-secondary)]">Org Health Index</span>
          <Activity className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform duration-200" />
        </div>
        {loading ? skeleton : (
          <>
            <div className="flex items-baseline space-x-2 relative z-10">
              <h3 className="text-3xl font-semibold text-[color:var(--text-primary)]">{score}</h3>
              <span className="text-sm text-[color:var(--text-tertiary)]">/ 100</span>
            </div>
            <div className="mt-4 w-full bg-[var(--border-subtle)] rounded-full h-1.5 relative z-10 overflow-hidden">
              <div className={`bg-gradient-to-r ${riskColor} h-1.5 rounded-full transition-all duration-700`}
                style={{ width: `${score}%` }} />
            </div>
          </>
        )}
      </div>

      {/* Card 2 — Total Agents */}
      <div className="card p-5 flex flex-col justify-between relative overflow-hidden group animate-fade-up delay-150">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-indigo-500 to-indigo-600/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="flex justify-between items-center mb-4 relative z-10">
          <span className="text-sm font-medium text-[color:var(--text-secondary)]">Agents Found</span>
          <Users className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform duration-200" />
        </div>
        {loading ? skeleton : (
          <>
            <div className="flex items-baseline space-x-2 relative z-10">
              <h3 className="text-3xl font-semibold text-[color:var(--text-primary)]">{totalAgents}</h3>
            </div>
            <p className="mt-4 text-xs text-[color:var(--text-tertiary)] flex items-center relative z-10">
              <span className="text-emerald-400 mr-1">{critical}</span> critical agents tracked
            </p>
          </>
        )}
      </div>

      {/* Card 3 — Orphaned Agents */}
      <div className="card p-5 flex flex-col justify-between relative overflow-hidden group animate-fade-up delay-225">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-amber-400 to-amber-500/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-amber-400/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="flex justify-between items-center mb-4 relative z-10">
          <span className="text-sm font-medium text-[color:var(--text-secondary)]">Orphaned Agents</span>
          <AlertTriangle className={`w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform duration-200 ${orphaned > 0 ? 'animate-pulse-soft' : ''}`} />
        </div>
        {loading ? skeleton : (
          <>
            <div className="flex items-baseline space-x-2 relative z-10">
              <h3 className="text-3xl font-semibold text-[color:var(--text-primary)]">{orphaned}</h3>
            </div>
            <p className="mt-4 text-xs text-amber-500/70 flex items-center relative z-10">
              {orphaned > 0 ? 'Requires immediate assignment' : 'All agents have owners ✓'}
            </p>
          </>
        )}
      </div>

      {/* Card 4 — Critical Agents */}
      <div className="card p-5 flex flex-col justify-between relative overflow-hidden group animate-fade-up delay-300">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-rose-500 to-rose-500/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="flex justify-between items-center mb-4 relative z-10">
          <span className="text-sm font-medium text-[color:var(--text-secondary)]">Critical Agents</span>
          <Link2 className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform duration-200" />
        </div>
        {loading ? skeleton : (
          <>
            <div className="flex items-baseline space-x-2 relative z-10">
              <h3 className="text-3xl font-semibold text-[color:var(--text-primary)]">{critical}</h3>
            </div>
            <p className="mt-4 text-xs text-[color:var(--text-tertiary)] flex items-center relative z-10">
              High impact — require backup owners
            </p>
          </>
        )}
      </div>

    </div>
  );
}
