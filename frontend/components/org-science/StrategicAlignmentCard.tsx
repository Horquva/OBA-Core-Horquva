'use client';

import { useState, useEffect } from 'react';
import { orgScience, ApiError, type IntelligenceResponse, type StrategicAlignmentPayload } from '../../lib/api';
import { Target, AlertTriangle } from 'lucide-react';
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

export function StrategicAlignmentCard() {
  const [res, setRes] = useState<IntelligenceResponse<StrategicAlignmentPayload> | null>(null);
  const [state, setState] = useState<FetchState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await orgScience.strategicAlignment();
        if (cancelled) return;
        setRes(response);
        setState('success');
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMsg(
          err instanceof ApiError
            ? `${err.status} — ${err.message}`
            : 'Failed to fetch alignment data',
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
          <Target className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">Ownership Coverage</h3>
        </div>
        {state === 'success' && data && (
          <span className={clsx(
            "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
            data.covered ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
            'bg-red-500/10 text-red-400 border-red-500/20'
          )}>
            {data.covered ? 'COVERED' : 'GAPS FOUND'}
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
              <p className="text-sm text-[color:var(--text-primary)] font-medium mb-1">Failed to load alignment</p>
              <p className="text-xs text-[color:var(--text-tertiary)]">{errorMsg}</p>
            </div>
          </div>
        )}

        {state === 'empty' && (
          <div className="flex flex-col items-center text-center">
            <Target className="w-8 h-8 text-[color:var(--text-tertiary)] mb-2" />
            <p className="text-sm text-[color:var(--text-secondary)]">No alignment data available.</p>
          </div>
        )}

        {state === 'success' && data && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="text-4xl font-bold text-[color:var(--text-primary)] tabular-nums tracking-tight mb-1">
                {Math.round(data.ownershipCoverageScore * 100)}%
              </div>
              <p className="text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-widest font-medium">
                Ownership Coverage
              </p>
            </div>

            <div>
              <MetricRow 
                label="Identified Gaps" 
                value={data.gaps.length} 
                color={data.gaps.length === 0 ? 'text-emerald-400' : 'text-yellow-400'} 
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
