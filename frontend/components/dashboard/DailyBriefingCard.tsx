'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Clock, ServerCrash } from 'lucide-react';
import { briefingApi, BriefingLatest } from '../../lib/api';
import { TruthBadge } from './TruthBadge';

export function DailyBriefingCard() {
  const [data, setData] = useState<BriefingLatest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    briefingApi.latest()
      .then(setData)
      .catch((e) => setError(e?.message ?? 'Briefing unavailable'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card p-5 relative overflow-hidden animate-fade-up delay-150 h-full flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, rgba(99 102 241 / 0.5), transparent)' }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" style={{ color: '#818cf8' }} />
          <span className="text-sm font-semibold text-[color:var(--text-primary)]">Daily Briefing</span>
        </div>
        <TruthBadge verified={data !== null && !error} />
      </div>

      {loading && (
        <div className="space-y-3 animate-pulse">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-4 rounded bg-[var(--border-subtle)]" style={{ width: `${70 + i * 4}%` }} />
          ))}
        </div>
      )}

      {!loading && (error || !data) && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <ServerCrash className="w-6 h-6 text-[color:var(--text-tertiary)]" />
          <p className="text-xs text-[color:var(--text-tertiary)]">
            {error ?? 'Briefing not yet generated — check /api/briefing/today'}
          </p>
        </div>
      )}

      {!loading && data && (() => {
        const lines = data.summary_points ?? [];

        return (
          <>
            {/* Org health snapshot */}
            <div className="mb-4 p-3 rounded-lg text-xs"
              style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
              <p className="text-[color:var(--text-secondary)]">
                <span className="font-medium text-[color:var(--text-primary)]">Doc Trend: </span>
                {data.doc_trend_status ?? 'STABLE'}
              </p>
            </div>

            {/* Numbered list */}
            <ol className="space-y-3">
              {lines.slice(0, 5).map((line, i) => (
                <li key={i} className="flex gap-3 text-sm text-[color:var(--text-secondary)]">
                  <span className="text-xs font-bold tabular-nums mt-0.5 shrink-0"
                    style={{ color: '#818cf8', minWidth: '1.1rem' }}>{i + 1}.</span>
                  <span className="leading-snug">{line.replace(/^[A-Z\s]+:\s*/, '')}</span>
                </li>
              ))}
            </ol>

            <div className="mt-4 flex items-center gap-1.5 text-[10px] text-[color:var(--text-tertiary)]">
              <Clock className="w-3 h-3" />
              Auto-generated {new Date(data.briefing_date).toLocaleDateString()}
            </div>
          </>
        );
      })()}
    </div>
  );
}
