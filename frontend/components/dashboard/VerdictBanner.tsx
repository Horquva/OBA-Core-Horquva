'use client';

import { useEffect, useState } from 'react';
import { Brain, TrendingUp, AlertCircle, ShieldOff } from 'lucide-react';
import { orchestratorApi, OrchestratorSummary } from '../../lib/api';
import { TruthBadge } from './TruthBadge';
import { EvidenceBadge } from '../ui/EvidenceBadge';

function PostureChip({ posture }: { posture: string | null }) {
  if (!posture) return null;

  const map: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    STABLE:   { bg: 'rgba(22 163 74 / 0.12)',  text: '#4ade80', border: 'rgba(22 163 74 / 0.28)',  icon: <TrendingUp className="w-3 h-3" /> },
    STRAINED: { bg: 'rgba(202 138 4 / 0.12)',  text: '#facc15', border: 'rgba(202 138 4 / 0.28)',  icon: <AlertCircle className="w-3 h-3" /> },
    CRITICAL: { bg: 'rgba(220 38 38 / 0.12)',  text: '#f87171', border: 'rgba(220 38 38 / 0.28)',  icon: <ShieldOff className="w-3 h-3" /> },
  };
  const style = map[posture] ?? map['STRAINED'];

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide"
      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
      {style.icon}
      {posture}
    </span>
  );
}

function RatingBadge({ rating }: { rating: string }) {
  const colors: Record<string, string> = {
    'HIGHLY INTELLIGENT':    '#4ade80',
    'MODERATELY INTELLIGENT':'#818cf8',
    'DEVELOPING':            '#facc15',
    'AT RISK':               '#f87171',
  };
  return (
    <span className="text-sm font-semibold tracking-widest uppercase"
      style={{ color: colors[rating] ?? '#8b8b9e', letterSpacing: '0.1em' }}>
      {rating}
    </span>
  );
}

export function VerdictBanner() {
  const [data, setData] = useState<OrchestratorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    orchestratorApi.summary()
      .then(setData)
      .catch((e) => setError(e?.message ?? 'Orchestrator unavailable'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 w-48 rounded bg-[var(--border-default)] mb-4" />
        <div className="h-16 w-32 rounded bg-[var(--border-subtle)] mb-4" />
        <div className="h-4 w-full rounded bg-[var(--border-subtle)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card p-6 border-red-900/30">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-red-400" />
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Orchestrator Unavailable</p>
        </div>
        <p className="text-xs text-[color:var(--text-tertiary)]">{error ?? 'No data returned from /api/intelligence/orchestrator/summary'}</p>
      </div>
    );
  }

  const scoreColor = (data.organizationalIntelligenceScore ?? 0) >= 80 ? '#4ade80' // Green
    : (data.organizationalIntelligenceScore ?? 0) >= 60 ? '#facc15' // Yellow (Strained)
    : (data.organizationalIntelligenceScore ?? 0) >= 40 ? '#fb923c' // Orange (At risk)
    : '#f87171'; // Red (Critical)

  return (
    <div className="card p-6 relative overflow-hidden animate-fade-up">
      {/* Top gradient accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.4), transparent)' }} />

      {/* Ambient glow from top-left */}
      <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)' }} />

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(99 102 241 / 0.12)', border: '1px solid rgba(99 102 241 / 0.2)' }}>
              <Brain className="w-5 h-5" style={{ color: '#818cf8' }} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[color:var(--text-primary)]">
                Organizational Intelligence Assessment
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PostureChip posture={data.brainPosture} />
            <TruthBadge confidence={data.trustScore} />
          </div>
        </div>

        {/* Score row */}
        {data.evidence?.status === 'insufficient_evidence' ? (
          <div className="mb-6">
            <EvidenceBadge evidence={data.evidence} />
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-6 mb-6">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-7xl font-bold tabular-nums leading-none text-white">
                  {data.organizationalIntelligenceScore}
                </span>
                <span className="text-2xl text-[color:var(--text-tertiary)]">/100</span>
              </div>
              <div className="mt-2">
                <RatingBadge rating={data.rating ?? ''} />
              </div>
            </div>

            {/* Score bar */}
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-xs text-[color:var(--text-tertiary)] mb-1.5">
                <span>Org Intelligence Score</span>
                <span>Trust: {data.trustScore}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: 'var(--border-subtle)' }}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${data.organizationalIntelligenceScore}%`, background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}80)` }} />
              </div>
            </div>
          </div>
        )}

        {/* Verdict text */}
        <div className="p-4 rounded-lg text-sm leading-relaxed text-[color:var(--text-secondary)]"
          style={{ background: 'rgba(255 255 255 / 0.02)', border: '1px solid var(--border-subtle)' }}>
          {data.finalVerdict}
        </div>

        {/* Top recommendations */}
        {data.topRecommendations?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {data.topRecommendations.slice(0, 3).map((rec, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs text-[color:var(--text-secondary)]"
                style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
                <span className="text-[color:var(--accent)] font-bold mt-0.5">{i + 1}.</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-[10px] text-[color:var(--text-tertiary)]">
          Generated {new Date(data.generatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
