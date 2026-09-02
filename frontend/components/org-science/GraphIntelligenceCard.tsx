'use client';

import { useState, useEffect } from 'react';
import { ApiError, type IntelligenceResponse } from '../../lib/api';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

/**
 * Shared card shell for the 2026-09-02 graph wire-ups (M01/M02/M03/M07/M20/
 * M28/M29/M31/M32/M34/M35/M49). Twelve near-identical cards (fetch -> loading/
 * error/success -> big number + metric rows + insight banner) would otherwise
 * duplicate the same ~130 lines twelve times — the exact pattern already
 * hand-rolled per-card in OwnershipCoverageCard.tsx / PatternRegularityCard.tsx
 * etc. Each new card is a ~20-line config (title, icon, fetcher, toView)
 * instead. The existing 10 org-science cards are untouched.
 */

export type BadgeTone = 'good' | 'warn' | 'bad' | 'neutral';

export interface IntelligenceCardRow {
  label: string;
  value: string | number;
  tone?: BadgeTone;
}

export interface IntelligenceCardView {
  headline: string | number;
  headlineLabel: string;
  badge?: { text: string; tone: BadgeTone };
  rows: IntelligenceCardRow[];
  emptyMessage?: string;
}

const TONE_TEXT: Record<BadgeTone, string> = {
  good: 'text-emerald-400',
  warn: 'text-yellow-400',
  bad: 'text-red-400',
  neutral: 'text-[color:var(--text-primary)]',
};

const TONE_BADGE: Record<BadgeTone, string> = {
  good: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warn: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  bad: 'bg-red-500/10 text-red-400 border-red-500/20',
  neutral: 'bg-[var(--border-subtle)] text-[color:var(--text-secondary)] border-[var(--border-default)]',
};

type FetchState = 'loading' | 'success' | 'error';

interface Props<T> {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  fetcher: () => Promise<IntelligenceResponse<T>>;
  toView: (payload: T) => IntelligenceCardView;
  errorLabel: string;
}

export function GraphIntelligenceCard<T>({
  title,
  icon: Icon,
  iconColor = 'text-emerald-400',
  fetcher,
  toView,
  errorLabel,
}: Props<T>) {
  const [res, setRes] = useState<IntelligenceResponse<T> | null>(null);
  const [state, setState] = useState<FetchState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetcher();
        if (cancelled) return;
        setRes(response);
        setState('success');
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMsg(err instanceof ApiError ? `${err.status} — ${err.message}` : errorLabel);
        setState('error');
      }
    }
    load();
    return () => { cancelled = true; };
    // Card config (fetcher/toView/errorLabel) is fixed per mount — each
    // wrapper component below renders one GraphIntelligenceCard with stable
    // props, so re-running on identity change would only ever refire once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const view = res ? toView(res.payload) : null;

  return (
    <div className="card border-[var(--border-subtle)] flex flex-col h-full min-h-[280px]">
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Icon className={clsx('w-4 h-4', iconColor)} />
          <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h3>
        </div>
        {state === 'success' && view?.badge && (
          <span
            className={clsx(
              'px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border',
              TONE_BADGE[view.badge.tone],
            )}
          >
            {view.badge.text}
          </span>
        )}
      </div>

      <div className="p-6 flex-1 flex flex-col justify-center">
        {state === 'loading' && (
          <div className="space-y-4">
            <div className="h-10 w-24 mx-auto rounded bg-[var(--border-subtle)] animate-pulse-soft" />
            <div className="space-y-2">
              <div className="h-6 w-full rounded bg-[var(--border-subtle)] animate-pulse-soft" />
              <div className="h-6 w-full rounded bg-[var(--border-subtle)] animate-pulse-soft" />
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[color:var(--text-primary)] font-medium mb-1">{errorLabel}</p>
              <p className="text-xs text-[color:var(--text-tertiary)]">{errorMsg}</p>
            </div>
          </div>
        )}

        {state === 'success' && view && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="text-4xl font-bold text-[color:var(--text-primary)] tabular-nums tracking-tight mb-1">
                {view.headline}
              </div>
              <p className="text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-widest font-medium">
                {view.headlineLabel}
              </p>
            </div>

            {view.rows.length > 0 && (
              <div>
                {view.rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <span className="text-[color:var(--text-secondary)]">{row.label}</span>
                    <span className={clsx('font-bold tabular-nums', row.tone ? TONE_TEXT[row.tone] : 'text-[color:var(--text-primary)]')}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {view.emptyMessage && view.rows.length === 0 && (
              <p className="text-sm text-[color:var(--text-secondary)] text-center">{view.emptyMessage}</p>
            )}

            {res?.recommendations && res.recommendations.length > 0 && (
              <div className="px-3 py-2 rounded-lg bg-[var(--border-subtle)] border border-[var(--border-default)]">
                <p className="text-[10px] text-[color:var(--text-secondary)] uppercase tracking-widest font-bold mb-1">Insights</p>
                <p className="text-xs text-[color:var(--text-primary)] truncate">{res.recommendations[0]}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
