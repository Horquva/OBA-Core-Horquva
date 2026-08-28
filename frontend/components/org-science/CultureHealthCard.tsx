'use client';

import { useState, useEffect } from 'react';
import { orgScience, ApiError, type IntelligenceResponse, type CulturePayload } from '../../lib/api';
import { Heart, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

type FetchState = 'loading' | 'success' | 'error' | 'empty';

function MetricRow({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--border-subtle)] last:border-0">
      <span className="text-[color:var(--text-secondary)]">{label}</span>
      <span className={clsx("font-bold tabular-nums", color)}>{value}</span>
    </div>
  );
}

export function CultureHealthCard() {
  const [res, setRes] = useState<IntelligenceResponse<CulturePayload> | null>(null);
  const [state, setState] = useState<FetchState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await orgScience.culture();
        if (cancelled) return;
        setRes(response);
        setState('success');
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMsg(
          err instanceof ApiError
            ? `${err.status} — ${err.message}`
            : 'Failed to fetch culture data',
        );
        setState('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const data = res?.payload;

  return (
    <div className="card border-[var(--border-subtle)] flex flex-col h-full min-h-[280px]">
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Heart className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">Culture Health</h3>
        </div>
        {/*
          The badge colour must follow the signal. It was previously hardcoded
          emerald, so "SILOED" rendered as healthy green — the worst possible
          pairing. `no_signal` is deliberately neutral, not red: it means we
          have no collaboration data, not that the news is bad.
        */}
        {state === 'success' && data && (
          <span className={clsx(
            "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
            data.cultureSignal === 'collaborative'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : data.cultureSignal === 'transitional'
                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                : 'bg-[var(--border-subtle)] text-[color:var(--text-tertiary)] border-[var(--border-default)]',
          )}>
            {data.cultureSignal === 'no_signal' ? 'No Signal' : data.cultureSignal}
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
              <p className="text-sm text-[color:var(--text-primary)] font-medium mb-1">Failed to load culture health</p>
              <p className="text-xs text-[color:var(--text-tertiary)]">{errorMsg}</p>
            </div>
          </div>
        )}

        {state === 'empty' && (
          <div className="flex flex-col items-center text-center">
            <Heart className="w-8 h-8 text-[color:var(--text-tertiary)] mb-2" />
            <p className="text-sm text-[color:var(--text-secondary)]">No culture data available.</p>
          </div>
        )}

        {state === 'success' && data && (
          <div className="space-y-5">
            {/*
              NOT a percentage. M42 computes density as collaborationLinks /
              people — collaboration edges per person, which is unbounded (51
              links across 40 people = 1.27). Rendering it as `× 100 + '%'`
              read as a plausible 0% only while the graph carried no
              collaborates_with edges at all; with them loaded the same
              expression produced "127%".
            */}
            <div className="text-center">
              {data.cultureSignal === 'no_signal' ? (
                <>
                  <div className="text-4xl font-bold text-[color:var(--text-tertiary)] tabular-nums tracking-tight mb-1">
                    —
                  </div>
                  <p className="text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-widest font-medium">
                    No Collaboration Recorded
                  </p>
                </>
              ) : (
                <>
                  <div className="text-4xl font-bold text-[color:var(--text-primary)] tabular-nums tracking-tight mb-1">
                    {data.collaborationDensity.toFixed(1)}
                  </div>
                  <p className="text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-widest font-medium">
                    Collaboration Links per Person
                  </p>
                </>
              )}
            </div>

            <div>
              <MetricRow
                label="Total People"
                value={data.people}
                color="text-[color:var(--text-primary)]"
              />
              <MetricRow
                label="With Shared-Work Record"
                value={`${data.peopleWithCollaborationRecord} of ${data.people}`}
                color="text-[color:var(--text-primary)]"
              />
              {/*
                Neutral, not a warning colour. These people are UNOBSERVED by
                the RACI and workflow-step sources, which is a gap in our data
                — not evidence that they work alone. Colouring it like a risk
                would restate the exact claim M42 stopped making.
              */}
              <MetricRow
                label="No Record (unknown)"
                value={data.peopleWithoutRecord.length}
                color="text-[color:var(--text-tertiary)]"
              />
            </div>

            {res.recommendations && res.recommendations.length > 0 && (
              <div className="px-3 py-2 rounded-lg bg-[var(--border-subtle)] border border-[var(--border-default)]">
                <p className="text-[10px] text-[color:var(--text-secondary)] uppercase tracking-widest font-bold mb-1">Insights</p>
                <p className="text-xs text-[color:var(--text-primary)] truncate">
                  {res.recommendations[0]}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
