'use client';

import { useEffect, useState } from 'react';
import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import { request } from '../../lib/api';

/**
 * Phase 3.3 — Longitudinal Volatility card (the Weekly Executive Dependency
 * Briefing's dashboard face). Reads GET /api/briefing/volatility: churn
 * velocity (EWMA over the change log), the CUSUM drift alert, net exposure
 * change, and the worst event of the window with its mitigation. Renders
 * only; computes nothing locally.
 */

interface WindowBriefing {
  windowDays: number;
  status: 'computed' | 'insufficient_evidence';
  materialChanges: number;
  outOfBand?: number;
  velocity?: number;
  velocityBand?: 'LOW' | 'MODERATE' | 'HIGH';
  drift?: { alert: boolean; maxC: number };
  risk?: {
    netExposureChange: number;
    damagingEvents: number;
    improvingEvents: number;
    worstEvent?: {
      mutationType: string;
      targetType: string;
      healthDelta: number;
      mitigation?: { recommendations?: { action: string; detail: string }[] } | null;
    } | null;
  };
}

interface VolatilityResponse {
  week: WindowBriefing;
  month: WindowBriefing;
}

const BAND_COLORS: Record<string, string> = {
  LOW: 'text-emerald-400',
  MODERATE: 'text-amber-400',
  HIGH: 'text-red-400',
};

export function VolatilityCard() {
  const [data, setData] = useState<VolatilityResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    request<VolatilityResponse>('/api/briefing/volatility')
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <div className="card p-6">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
          <Activity size={16} className="text-[var(--accent)]" />
          Dependency Volatility
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] italic">
          Volatility intelligence is unavailable right now.
        </p>
      </div>
    );
  }

  if (!data) {
    return <div className="card p-6 h-56 animate-pulse bg-[var(--border-subtle)] rounded-xl" />;
  }

  const { week, month } = data;
  if (week.status === 'insufficient_evidence' && month.status === 'insufficient_evidence') {
    return (
      <div className="card p-6">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
          <Activity size={16} className="text-[var(--accent)]" />
          Dependency Volatility
        </h3>
        <p className="text-xs text-[var(--text-secondary)]">
          No structural changes recorded yet — volatility reads the change log the mutation layer
          writes; the first mutations start the trend lines.
        </p>
      </div>
    );
  }

  const net = month.risk?.netExposureChange ?? null;
  const NetIcon = net != null && net > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
          <Activity size={16} className="text-[var(--accent)]" />
          Dependency Volatility
        </h3>
        <p className="text-xs text-[var(--text-secondary)]">
          {month.materialChanges} structural change{month.materialChanges === 1 ? '' : 's'} in 30 days
          {month.outOfBand ? ` (${month.outOfBand} outside the API — recorded by triggers)` : ''}.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">7-day velocity</div>
          <div className={`text-lg font-bold ${BAND_COLORS[week.velocityBand ?? ''] ?? ''}`}>{week.velocity ?? '—'}</div>
          <div className="text-[10px] text-[var(--text-tertiary)]">{(week.velocityBand ?? '').toLowerCase()} churn</div>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Net exposure (30d)</div>
          <div className={`text-lg font-bold inline-flex items-center gap-1 ${net != null && net > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            <NetIcon size={14} />
            {net != null ? (net > 0 ? `+${net}` : net) : '—'}
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)]">OHI points</div>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Drift (CUSUM)</div>
          <div className={`text-lg font-bold ${month.drift?.alert ? 'text-red-400' : 'text-emerald-400'}`}>
            {month.drift?.alert ? 'ALERT' : 'stable'}
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)]">sustained-shift watch</div>
        </div>
      </div>

      {week.risk?.worstEvent && (
        <div className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-3">
          <div className="text-xs font-semibold text-[var(--text-primary)] mb-1">
            Worst event this week: {week.risk.worstEvent.mutationType.replace(/_/g, ' ').toLowerCase()} on{' '}
            {week.risk.worstEvent.targetType} ({week.risk.worstEvent.healthDelta > 0 ? '+' : ''}
            {week.risk.worstEvent.healthDelta} OHI)
          </div>
          {week.risk.worstEvent.mitigation?.recommendations?.slice(0, 1).map((r, i) => (
            <p key={i} className="text-xs text-[var(--text-secondary)]">
              {r.detail}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
