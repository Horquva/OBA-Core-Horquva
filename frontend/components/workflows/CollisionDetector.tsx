'use client';

import { useState, useEffect } from 'react';
import {
  orchestration,
  ApiError,
  type CollisionsResponse,
  type BlockedResponse,
} from '../../lib/api';
import {
  AlertTriangle,
  ArrowLeftRight,
  Ban,
  Users,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

type FetchState = 'loading' | 'success' | 'error' | 'empty';

interface CollisionState {
  collisions: CollisionsResponse;
  blocked: BlockedResponse;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CollisionDetector() {
  const [data, setData] = useState<CollisionState | null>(null);
  const [state, setState] = useState<FetchState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [collisions, blocked] = await Promise.all([
          orchestration.collisions(),
          orchestration.blocked(),
        ]);
        if (cancelled) return;
        if (collisions.totalCollisions === 0 && blocked.totalBlocked === 0) {
          setData({ collisions, blocked });
          setState('empty');
        } else {
          setData({ collisions, blocked });
          setState('success');
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMsg(
          err instanceof ApiError
            ? `${err.status} — ${err.message}`
            : 'Failed to fetch collision data',
        );
        setState('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="animate-fade-up delay-300">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <ArrowLeftRight className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Collision Detection</h2>
          <p className="text-xs text-slate-400">Shared-actor conflicts and blocked workflow analysis</p>
        </div>
      </div>

      {/* Loading */}
      {state === 'loading' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i} className="card px-6 py-5 border border-[#1f1f29]">
              <div className="h-5 w-36 rounded bg-[#1f1f29] animate-pulse-soft mb-4" />
              <div className="space-y-3">
                {[0, 1, 2].map(j => (
                  <div key={j} className="h-16 w-full rounded-lg bg-[#1f1f29] animate-pulse-soft" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="card px-6 py-6 border border-[#1f1f29]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium mb-1">Failed to load collision data</p>
              <p className="text-xs text-slate-500">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty */}
      {state === 'empty' && (
        <div className="card px-6 py-10 flex flex-col items-center justify-center text-center">
          <ArrowLeftRight className="w-10 h-10 text-slate-500 mb-3" />
          <h3 className="text-white font-semibold mb-1">No Collisions Detected</h3>
          <p className="text-sm text-slate-400">No shared-actor conflicts or blocked workflows found.</p>
        </div>
      )}

      {/* Success — two-column layout */}
      {state === 'success' && data && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* ── Collisions Panel ───────────────────────────────── */}
          <div className="card overflow-hidden border border-[#1f1f29]">
            {/* Panel header — matches RiskScoreTable header */}
            <div className="px-6 py-4 border-b border-[#1f1f29] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-semibold text-white">Shared-Actor Conflicts</h3>
              </div>
              <span
                className={clsx(
                  'inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border bg-[#1f1f29] border-[#28283a]',
                  data.collisions.totalCollisions > 0 ? 'text-orange-400' : 'text-emerald-400',
                )}
              >
                {data.collisions.totalCollisions} Collision{data.collisions.totalCollisions !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="p-4">
              {data.collisions.collisions.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-slate-500">No shared-actor conflicts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.collisions.collisions.map((c, i) => (
                    <div key={i} className="px-4 py-3 rounded-lg bg-[#111116] border border-[#1f1f29]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-white">{c.actorName}</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#1f1f29] border border-[#28283a] text-[10px] text-slate-400">
                          {c.actorType}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-1.5">
                        Conflicting Workflows ({c.conflictingWorkflows.length})
                      </p>
                      <div className="space-y-1">
                        {c.conflictingWorkflows.map((cw, j) => (
                          <div key={j} className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">{cw.workflowName}</span>
                            <span className="text-slate-600 tabular-nums">
                              Step {cw.currentStep}/{cw.totalSteps}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Blocked Panel ──────────────────────────────────── */}
          <div className="card overflow-hidden border border-[#1f1f29]">
            {/* Panel header */}
            <div className="px-6 py-4 border-b border-[#1f1f29] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Ban className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-semibold text-white">Blocked Workflows</h3>
              </div>
              <span
                className={clsx(
                  'inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border bg-[#1f1f29] border-[#28283a]',
                  data.blocked.totalBlocked > 0 ? 'text-red-400' : 'text-emerald-400',
                )}
              >
                {data.blocked.totalBlocked} Blocked
              </span>
            </div>

            <div className="p-4">
              {data.blocked.blockedWorkflows.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-slate-500">No blocked workflows</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.blocked.blockedWorkflows.map((bw, i) => (
                    <div key={i} className="px-4 py-3 rounded-lg bg-red-500/[0.04] border border-red-500/15">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-white">{bw.workflowName}</span>
                        <span className="text-[10px] text-slate-500 tabular-nums">
                          Step {bw.currentStep}/{bw.totalSteps}
                        </span>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#1f1f29] border border-[#28283a] text-xs text-slate-300 mb-1.5">
                        {bw.department}
                      </span>
                      {bw.blockedActor && (
                        <p className="text-xs text-slate-400 mt-1.5">
                          Blocked by: <span className="text-white font-medium">{bw.blockedActor}</span>
                        </p>
                      )}
                      <p className="text-xs text-red-400/80 mt-1">{bw.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
