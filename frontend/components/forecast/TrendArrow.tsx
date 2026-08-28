'use client';

import { useState, useEffect } from 'react';
import { forecast, ApiError, type ForecastHealthItem } from '../../lib/api';
import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

type FetchState = 'loading' | 'success' | 'error' | 'empty';

export function TrendArrow() {
  const [data, setData] = useState<ForecastHealthItem[]>([]);
  const [state, setState] = useState<FetchState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await forecast.health();
        if (cancelled) return;
        if (res.forecasts.length === 0) {
          setState('empty');
        } else {
          // Sort by horizonDays ascending (30, 60, 90)
          const sorted = [...res.forecasts].sort((a, b) => a.horizonDays - b.horizonDays);
          setData(sorted);
          setState('success');
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMsg(
          err instanceof ApiError
            ? `${err.status} — ${err.message}`
            : 'Failed to fetch health trend data',
        );
        setState('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="animate-fade-up delay-300">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Activity className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Health Trajectory</h2>
          <p className="text-xs text-[color:var(--text-secondary)]">Directional health score indicator over time</p>
        </div>
      </div>

      {state === 'loading' && (
        <div className="card px-6 py-6 border border-[var(--border-subtle)]">
          <div className="flex items-center gap-6">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex-1 h-12 rounded bg-[var(--border-subtle)] animate-pulse-soft" />
            ))}
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="card px-6 py-6 border border-[var(--border-subtle)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[color:var(--text-primary)] font-medium mb-1">Failed to load health trends</p>
              <p className="text-xs text-[color:var(--text-tertiary)]">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {state === 'empty' && (
        <div className="card px-6 py-10 flex flex-col items-center justify-center text-center">
          <Activity className="w-10 h-10 text-[color:var(--text-tertiary)] mb-3" />
          <h3 className="text-[color:var(--text-primary)] font-semibold mb-1">No Trend Data</h3>
          <p className="text-sm text-[color:var(--text-secondary)]">Forecast health trend data is currently unavailable.</p>
        </div>
      )}

      {state === 'success' && data.length > 0 && (
        <div className="card px-6 py-5 border border-[var(--border-subtle)]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#1f1f29]">
            {data.map(item => {
              const trend = item.trend.toUpperCase();
              let Icon = Minus;
              let color = 'text-[color:var(--text-secondary)]';
              let bg = 'bg-slate-500/10 border-slate-500/20';

              if (trend === 'IMPROVING' || trend === 'UP') {
                Icon = TrendingUp;
                color = 'text-emerald-400';
                bg = 'bg-emerald-500/10 border-emerald-500/20';
              } else if (trend === 'DECLINING' || trend === 'DOWN') {
                Icon = TrendingDown;
                color = 'text-red-400';
                bg = 'bg-red-500/10 border-red-500/20';
              } else if (trend === 'STABLE') {
                Icon = Minus;
                color = 'text-blue-400';
                bg = 'bg-blue-500/10 border-blue-500/20';
              }

              return (
                <div key={item.horizonDays} className="pt-4 sm:pt-0 sm:px-6 first:pt-0 first:sm:pl-0 last:sm:pr-0">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-[color:var(--text-secondary)] uppercase tracking-widest">
                      {item.horizonDays}-Day
                    </span>
                    <span className={clsx(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border',
                      color, bg
                    )}>
                      {trend}
                    </span>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-3xl font-bold text-[color:var(--text-primary)] tabular-nums tracking-tight">
                      {item.healthScore}
                    </span>
                    <Icon className={clsx("w-6 h-6 mb-1.5", color)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
