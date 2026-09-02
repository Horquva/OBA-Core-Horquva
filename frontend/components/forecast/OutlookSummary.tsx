'use client';

import { useState, useEffect } from 'react';
import { forecast, ApiError, type ForecastOutlookResponse, type ForecastSummaryResponse } from '../../lib/api';
import { Calendar, AlertTriangle, Activity, Database, Zap } from 'lucide-react';
import clsx from 'clsx';
import { RiskBadge } from '../ui/RiskBadge';
import { ProvenanceBadge } from '../ui/ProvenanceBadge';

type FetchState = 'loading' | 'success' | 'error' | 'empty';

interface OutlookState {
  outlook: ForecastOutlookResponse;
  summary: ForecastSummaryResponse;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ScoreCell({ score }: { score: number }) {
  const color = score > 75 ? 'text-emerald-400' : score < 50 ? 'text-red-400' : 'text-yellow-400';
  return (
    <span className={clsx("font-semibold tabular-nums", color)}>
      {score}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OutlookSummary() {
  const [data, setData] = useState<OutlookState | null>(null);
  const [state, setState] = useState<FetchState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [outlook, summary] = await Promise.all([
          forecast.outlook(),
          forecast.summary(),
        ]);
        if (cancelled) return;
        
        if (outlook.organizationalOutlook.length === 0) {
          setState('empty');
        } else {
          // Sort by horizonDays ascending
          outlook.organizationalOutlook.sort((a, b) => a.horizonDays - b.horizonDays);
          setData({ outlook, summary });
          setState('success');
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMsg(
          err instanceof ApiError
            ? `${err.status} — ${err.message}`
            : 'Failed to fetch outlook data',
        );
        setState('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="animate-fade-up delay-150">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Organizational Outlook</h2>
            <p className="text-xs text-[color:var(--text-secondary)]">30, 60, and 90-day trajectory forecasts</p>
          </div>
        </div>
        {state === 'success' && data && (
          <ProvenanceBadge provenance={data.outlook.provenance} />
        )}
      </div>

      {state === 'loading' && (
        <div className="card overflow-hidden border border-[var(--border-subtle)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
                  {[0, 1, 2, 3, 4].map(i => (
                    <th key={i} className="px-5 py-3.5"><div className="h-4 w-20 rounded bg-[var(--border-subtle)] animate-pulse-soft" /></th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#111116]">
                {[0, 1, 2].map(i => (
                  <tr key={i}>
                    {[0, 1, 2, 3, 4].map(j => (
                      <td key={j} className="px-5 py-4"><div className="h-4 w-24 rounded bg-[var(--border-subtle)] animate-pulse-soft" /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="card px-6 py-6 border border-[var(--border-subtle)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[color:var(--text-primary)] font-medium mb-1">Failed to load outlook</p>
              <p className="text-xs text-[color:var(--text-tertiary)]">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {state === 'empty' && (
        <div className="card px-6 py-10 flex flex-col items-center justify-center text-center">
          <Calendar className="w-10 h-10 text-[color:var(--text-tertiary)] mb-3" />
          <h3 className="text-[color:var(--text-primary)] font-semibold mb-1">No Outlook Data</h3>
          <p className="text-sm text-[color:var(--text-secondary)]">Forecast trajectories are not available.</p>
        </div>
      )}

      {state === 'success' && data && (
        <div className="space-y-6">
          {/* Headline summary card */}
          <div className="card px-6 py-5 border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-widest font-bold mb-1">
                {data.summary.headlineOutlook.horizonDays}-Day Headline Outlook
              </p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-[color:var(--text-primary)] tracking-tight">
                  {data.summary.headlineOutlook.outlookScore}
                </span>
                <span className={clsx(
                  "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
                  data.summary.headlineOutlook.outlookStatus === 'stable' || data.summary.headlineOutlook.outlookStatus === 'positive'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                )}>
                  {data.summary.headlineOutlook.outlookStatus}
                </span>
              </div>
            </div>
            
            {data.summary.headlineOutlook.weakestDimension && (
              <div className="px-4 py-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <div>
                  <p className="text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-widest font-medium">Weakest Dimension</p>
                  <p className="text-sm text-[color:var(--text-primary)] capitalize">{data.summary.headlineOutlook.weakestDimension}</p>
                </div>
              </div>
            )}
          </div>

          {/* Detailed table */}
          <div className="card overflow-hidden border border-[var(--border-subtle)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-surface)] text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                    <th className="px-5 py-3.5 font-medium">Horizon</th>
                    <th className="px-5 py-3.5 font-medium">Health</th>
                    <th className="px-5 py-3.5 font-medium">Memory Score</th>
                    <th className="px-5 py-3.5 font-medium">Knowledge Loss Risk</th>
                    <th className="px-5 py-3.5 font-medium" title="Authored/historical forecast, not a live computation -- see the Historical badge above. A different, differently-scaled number from /continuity's and the dashboard's continuity figures.">Continuity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#111116]">
                  {data.outlook.organizationalOutlook.map(row => (
                    <tr key={row.horizonDays} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-[color:var(--text-primary)]">{row.horizonDays} Days</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
                          <ScoreCell score={row.healthScore} />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Database className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
                          <ScoreCell score={row.memoryScore} />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <RiskBadge level={row.knowledgeLossRisk} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
                          <ScoreCell score={row.continuityScore} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
