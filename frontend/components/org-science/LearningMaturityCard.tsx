'use client';

import { useState, useEffect } from 'react';
import { learning, ApiError, type LearningSummary } from '../../lib/api';
import { BookOpen, AlertTriangle, TrendingUp, ShieldAlert, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

type FetchState = 'loading' | 'success' | 'error' | 'empty';

export function LearningMaturityCard() {
  const [data, setData] = useState<LearningSummary | null>(null);
  const [state, setState] = useState<FetchState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await learning.summary();
        if (cancelled) return;
        setData(res);
        setState('success');
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMsg(
          err instanceof ApiError
            ? `${err.status} — ${err.message}`
            : 'Failed to fetch learning maturity data',
        );
        setState('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="card border-[#1f1f29] flex flex-col h-full min-h-[280px]">
      <div className="px-6 py-4 border-b border-[#1f1f29] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">Learning Maturity</h3>
        </div>
        {state === 'success' && data && (
          <span className={clsx(
            "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
            data.learningMaturityScore > 75 ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
            data.learningMaturityScore < 50 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
            'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
          )}>
            {data.learningMaturityLevel}
          </span>
        )}
      </div>

      <div className="p-6 flex-1 flex flex-col justify-center">
        {state === 'loading' && (
          <div className="space-y-4">
            <div className="h-10 w-24 mx-auto rounded bg-[#1f1f29] animate-pulse-soft" />
            <div className="flex gap-2">
              <div className="h-12 w-1/2 rounded bg-[#1f1f29] animate-pulse-soft" />
              <div className="h-12 w-1/2 rounded bg-[#1f1f29] animate-pulse-soft" />
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium mb-1">Failed to load learning maturity</p>
              <p className="text-xs text-slate-500">{errorMsg}</p>
            </div>
          </div>
        )}

        {state === 'empty' && (
          <div className="flex flex-col items-center text-center">
            <BookOpen className="w-8 h-8 text-slate-500 mb-2" />
            <p className="text-sm text-slate-400">No learning maturity data available.</p>
          </div>
        )}

        {state === 'success' && data && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="text-4xl font-bold text-white tabular-nums tracking-tight mb-1">
                {data.learningMaturityScore}
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                Maturity Score
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[#111116] border border-[#1f1f29]">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Mitigated</span>
                </div>
                <div className="text-lg font-bold text-emerald-400 tabular-nums">
                  {data.mitigationPercentage}%
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#111116] border border-[#1f1f29]">
                <div className="flex items-center gap-1.5 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Unmitigated</span>
                </div>
                <div className="text-lg font-bold text-red-400 tabular-nums">
                  {data.unmitigatedRisks}
                </div>
              </div>
            </div>

            {data.highestExposureDepartment && (
              <div className="px-3 py-2 rounded-lg bg-[#1f1f29] border border-[#28283a] flex items-center justify-between">
                <span className="text-xs text-slate-400">Highest Exposure</span>
                <span className="text-xs font-medium text-white">{data.highestExposureDepartment.department}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
