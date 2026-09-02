'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { healthApi, HealthSummary } from '../../lib/api';
import { TruthBadge } from './TruthBadge';

function scoreColor(score: number) {
  if (score >= 60) return '#4ade80';
  if (score >= 40) return '#facc15';
  return '#f87171';
}

function DimensionChip({ label, score, title }: { label: string; score: number; title?: string }) {
  const color = scoreColor(score);
  const pulse = score < 40;
  return (
    <div title={title} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${pulse ? 'animate-pulse-soft' : ''}`}
      style={{
        background: score < 40 ? 'rgba(220 38 38 / 0.08)' : score < 60 ? 'rgba(202 138 4 / 0.08)' : 'rgba(22 163 74 / 0.08)',
        border: `1px solid ${score < 40 ? 'rgba(220 38 38 / 0.2)' : score < 60 ? 'rgba(202 138 4 / 0.2)' : 'rgba(22 163 74 / 0.2)'}`,
      }}>
      <span className="font-medium text-[color:var(--text-secondary)]">{label}</span>
      <span className="font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'IMPROVING') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (trend === 'DECLINING') return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-amber-400" />;
}

export function EarlyWarningStrip() {
  const [data, setData] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    healthApi.summary()
      .then(setData)
      .catch(() => {
        // Leave data as null — component renders a graceful zeroed strip
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-4 w-40 rounded bg-[var(--border-default)] mb-3" />
        <div className="flex gap-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-10 w-28 rounded bg-[var(--border-subtle)]" />)}
        </div>
      </div>
    );
  }

  const score  = data?.healthIndex ?? 0;
  const trend  = data?.trend ?? 'STABLE';
  const status = data?.healthStatus ?? (data ? data.healthStatus : 'Unavailable');
  const dims   = data?.dimensions;

  const statusColor  = score >= 60 ? '#4ade80' : score >= 40 ? '#facc15' : '#f87171';
  const trendLabel   = trend === 'IMPROVING' ? '↑ Improving' : trend === 'DECLINING' ? '↓ Declining' : '→ Stable';

  return (
    <div className="card p-4 relative overflow-hidden animate-fade-up delay-75">
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${statusColor}80, transparent)` }} />

      <div className="flex flex-wrap items-center gap-4">
        {/* Icon + label */}
        <div className="flex items-center gap-2 shrink-0">
          <Activity className="w-4 h-4" style={{ color: statusColor }} />
          <span className="text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wider">
            Early Warning
          </span>
        </div>

        {/* Stability score gauge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-10 h-10">
            <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border-subtle)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke={statusColor} strokeWidth="3"
                strokeDasharray={`${(score / 100) * 94.25} 94.25`}
                strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
              style={{ color: statusColor }}>{score}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-[color:var(--text-primary)]">
              {data ? status : 'No Data'}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-[color:var(--text-tertiary)]">
              <TrendIcon trend={trend} />
              <span>{data ? trendLabel : '— health data unavailable'}</span>
            </div>
          </div>
        </div>

        {/* Dimension chips */}
        {dims && (
          <div className="flex flex-wrap gap-2 flex-1">
            <DimensionChip label="Critical Safety"  score={dims.criticalSafety.score} />
            <DimensionChip label="Continuity (Coverage)" score={dims.continuity.score}
              title="Runbook documentation + backup-owner coverage. A different, differently-scaled number from the SPOF-based 'Org Continuity Score (M18)' shown on /continuity — both are real, they answer different questions." />
            <DimensionChip label="Documentation"    score={dims.documentation.score} />
            <DimensionChip label="Ownership Spread" score={dims.ownershipSpread.score} />
            <DimensionChip label="Incident Load"    score={dims.incidentLoad.score} />
          </div>
        )}

        <div className="shrink-0">
          <TruthBadge confidence={score} />
        </div>
      </div>
    </div>
  );
}
