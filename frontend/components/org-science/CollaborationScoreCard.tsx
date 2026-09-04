'use client';

import { useState, useEffect } from 'react';
import { collaboration, ApiError, type CollaborationScoreResponse } from '../../lib/api';
import { Users, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

type FetchState = 'loading' | 'success' | 'error' | 'empty';

function MetricRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--border-subtle)] last:border-0">
      <span className="text-[color:var(--text-secondary)]">{label}</span>
      <span className={clsx("font-bold tabular-nums", color)}>{value}</span>
    </div>
  );
}

export function CollaborationScoreCard() {
  const [data, setData] = useState<CollaborationScoreResponse | null>(null);
  const [state, setState] = useState<FetchState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await collaboration.score();
        if (cancelled) return;
        setData(res);
        setState('success');
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMsg(
          err instanceof ApiError
            ? `${err.status} — ${err.message}`
            : 'Failed to fetch collaboration score',
        );
        setState('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="card border-[var(--border-subtle)] flex flex-col h-full min-h-[280px]">
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Users className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">Collaboration Matrix</h3>
        </div>
        {state === 'success' && data && (
          <span className={clsx(
            "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
            data.collaborationScore > 75 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
            data.collaborationScore < 50 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
            'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
          )}>
            {data.collaborationLevel}
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
              <p className="text-sm text-[color:var(--text-primary)] font-medium mb-1">Failed to load collaboration data</p>
              <p className="text-xs text-[color:var(--text-tertiary)]">{errorMsg}</p>
            </div>
          </div>
        )}

        {state === 'empty' && (
          <div className="flex flex-col items-center text-center">
            <Users className="w-8 h-8 text-[color:var(--text-tertiary)] mb-2" />
            <p className="text-sm text-[color:var(--text-secondary)]">No collaboration data available.</p>
          </div>
        )}

        {state === 'success' && data && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="text-4xl font-bold text-[color:var(--text-primary)] tabular-nums tracking-tight mb-1">
                {data.collaborationScore}
              </div>
              <p className="text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-widest font-medium">
                Overall Score
              </p>
            </div>

            <div>
              <MetricRow 
                label="AI Adoption" 
                value={data.aiAdoptionScore} 
                color={data.aiAdoptionScore > 75 ? 'text-emerald-400' : data.aiAdoptionScore < 50 ? 'text-red-400' : 'text-yellow-400'} 
              />
              <MetricRow 
                label="Human Dependency" 
                value={data.humanDependencyScore} 
                color={data.humanDependencyScore < 30 ? 'text-emerald-400' : data.humanDependencyScore > 70 ? 'text-red-400' : 'text-yellow-400'} 
              />
            </div>

            {data.weakestCollaborationAreas.length > 0 && (
              <div className="px-3 py-2 rounded-lg bg-red-500/[0.04] border border-red-500/15">
                <p className="text-[10px] text-red-400 uppercase tracking-widest font-bold mb-1">Needs Attention</p>
                <p className="text-xs text-[color:var(--text-primary)] truncate">
                  {data.weakestCollaborationAreas.join(' • ')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
