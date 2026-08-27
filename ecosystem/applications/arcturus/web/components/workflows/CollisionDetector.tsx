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
          <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Collision Detection</h2>
          <p className="text-xs text-[color:var(--text-secondary)]">Shared-actor conflicts and blocked workflow analysis</p>
        </div>
      </div>

      {/* Loading */}
      {state === 'loading' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i} className="card px-6 py-5 border border-[var(--border-subtle)]">
              <div className="h-5 w-36 rounded bg-[var(--border-subtle)] animate-pulse-soft mb-4" />
              <div className="space-y-3">
                {[0, 1, 2].map(j => (
                  <div key={j} className="h-16 w-full rounded-lg bg-[var(--border-subtle)] animate-pulse-soft" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="card px-6 py-6 border border-[var(--border-subtle)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[color:var(--text-primary)] font-medium mb-1">Failed to load collision data</p>
              <p className="text-xs text-[color:var(--text-tertiary)]">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty */}
      {state === 'empty' && (
        <div className="card px-6 py-10 flex flex-col items-center justify-center text-center">
          <ArrowLeftRight className="w-10 h-10 text-[color:var(--text-tertiary)] mb-3" />
          <h3 className="text-[color:var(--text-primary)] font-semibold mb-1">No Collisions Detected</h3>
          <p className="text-sm text-[color:var(--text-secondary)]">No shared-actor conflicts or blocked workflows found.</p>
        </div>
      )}

      {/* Success — two-column layout */}
      {state === 'success' && data && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* ── Collisions Panel ───────────────────────────────── */}
          <div className="card overflow-hidden border border-[var(--border-subtle)]">
            {/* Panel header — matches RiskScoreTable header */}
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">Shared-Actor Conflicts</h3>
              </div>
              <span
                className={clsx(
                  'inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border bg-[var(--border-subtle)] border-[var(--border-default)]',
                  data.collisions.totalCollisions > 0 ? 'text-orange-400' : 'text-emerald-400',
                )}
              >
                {data.collisions.totalCollisions} Collision{data.collisions.totalCollisions !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="p-4">
              {data.collisions.collisions.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-[color:var(--text-tertiary)]">No shared-actor conflicts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.collisions.collisions.map((c, i) => (
                    <div key={i} className="px-4 py-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-[color:var(--text-primary)]">{c.actorName}</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--border-subtle)] border border-[var(--border-default)] text-[10px] text-[color:var(--text-secondary)]">
                          {c.actorType}
                        </span>
                      </div>
                      <p className="text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-widest font-medium mb-1.5">
                        Conflicting Workflows ({c.conflictingWorkflows.length})
                      </p>
                      <div className="space-y-1">
                        {c.conflictingWorkflows.map((cw, j) => (
                          <div key={j} className="flex items-center justify-between text-xs">
                            <span className="text-[color:var(--text-primary)]">{cw.workflowName}</span>
                            <span className="text-[color:var(--text-tertiary)] tabular-nums">
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
          <div className="card overflow-hidden border border-[var(--border-subtle)]">
            {/* Panel header */}
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Ban className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">Blocked Workflows</h3>
              </div>
              <span
                className={clsx(
                  'inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border bg-[var(--border-subtle)] border-[var(--border-default)]',
                  data.blocked.totalBlocked > 0 ? 'text-red-400' : 'text-emerald-400',
                )}
              >
                {data.blocked.totalBlocked} Blocked
              </span>
            </div>

            <div className="p-4">
              {data.blocked.blockedWorkflows.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-[color:var(--text-tertiary)]">No blocked workflows</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.blocked.blockedWorkflows.map((bw, i) => (
                    <div key={i} className="px-4 py-3 rounded-lg bg-red-500/[0.04] border border-red-500/15">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-[color:var(--text-primary)]">{bw.workflowName}</span>
                        <span className="text-[10px] text-[color:var(--text-tertiary)] tabular-nums">
                          Step {bw.currentStep}/{bw.totalSteps}
                        </span>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[var(--border-subtle)] border border-[var(--border-default)] text-xs text-[color:var(--text-primary)] mb-1.5">
                        {bw.department}
                      </span>
                      {bw.blockedActor && (
                        <p className="text-xs text-[color:var(--text-secondary)] mt-1.5">
                          Blocked by: <span className="text-[color:var(--text-primary)] font-medium">{bw.blockedActor}</span>
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
