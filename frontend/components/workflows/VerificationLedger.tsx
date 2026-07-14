'use client';

import { useState, useEffect } from 'react';
import {
  verification,
  ApiError,
  type VerificationAction,
  type FlaggedAction,
  type FlaggedActionsResponse,
} from '../../lib/api';
import {
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

type FetchState = 'loading' | 'success' | 'error' | 'empty';
type FilterMode = 'all' | 'flagged';

const STATUS_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  COMPLETED: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  FLAGGED:   { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  FAILED:    { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
  PENDING:   { color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20' },
};

// ─── Skeleton Row ────────────────────────────────────────────────────────────

function SkeletonRow({ index }: { index: number }) {
  return (
    <tr key={index}>
      <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-[#1f1f29] animate-pulse-soft" /></td>
      <td className="px-5 py-4"><div className="h-4 w-32 rounded bg-[#1f1f29] animate-pulse-soft" /></td>
      <td className="px-5 py-4"><div className="h-4 w-28 rounded bg-[#1f1f29] animate-pulse-soft" /></td>
      <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-[#1f1f29] animate-pulse-soft" /></td>
      <td className="px-5 py-4"><div className="h-4 w-12 rounded bg-[#1f1f29] animate-pulse-soft" /></td>
      <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-[#1f1f29] animate-pulse-soft ml-auto" /></td>
    </tr>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function VerificationLedger() {
  const [allActions, setAllActions] = useState<VerificationAction[]>([]);
  const [flaggedData, setFlaggedData] = useState<FlaggedActionsResponse | null>(null);
  const [state, setState] = useState<FetchState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [actions, flagged] = await Promise.all([
          verification.actions(),
          verification.flagged(),
        ]);
        if (cancelled) return;
        if (actions.length === 0) {
          setState('empty');
        } else {
          setAllActions(actions);
          setFlaggedData(flagged);
          setState('success');
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMsg(
          err instanceof ApiError
            ? `${err.status} — ${err.message}`
            : 'Failed to load verification data',
        );
        setState('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Union type so we can safely narrow with `'violations' in action`
  const displayedActions: (VerificationAction | FlaggedAction)[] =
    filter === 'flagged' && flaggedData
      ? flaggedData.flaggedActions
      : allActions;

  return (
    <div className="animate-fade-up delay-400">
      {/* Section header + filter toggle */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <FileCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Verification Ledger</h2>
            <p className="text-xs text-slate-400">Action verification log with compliance status</p>
          </div>
        </div>

        {state === 'success' && (
          <div className="flex items-center gap-1 bg-[#1f1f29] border border-[#28283a] rounded-lg p-0.5">
            <button
              onClick={() => setFilter('all')}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium transition-all',
                filter === 'all'
                  ? 'bg-[#28283a] text-white'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              All ({allActions.length})
            </button>
            <button
              onClick={() => setFilter('flagged')}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium transition-all',
                filter === 'flagged'
                  ? 'bg-[#28283a] text-white'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              Flagged ({flaggedData?.totalFlagged ?? 0})
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {state === 'loading' && (
        <div className="card overflow-hidden border border-[#1f1f29]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#111116] text-[10px] uppercase tracking-widest text-slate-500 border-b border-[#1f1f29]">
                  <th className="px-5 py-3.5 font-medium">Actor</th>
                  <th className="px-5 py-3.5 font-medium">Action</th>
                  <th className="px-5 py-3.5 font-medium">Workflow</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium">Compliant</th>
                  <th className="px-5 py-3.5 font-medium text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#111116]">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty */}
      {state === 'empty' && (
        <div className="card px-6 py-10 flex flex-col items-center justify-center text-center">
          <FileCheck className="w-10 h-10 text-slate-500 mb-3" />
          <h3 className="text-white font-semibold mb-1">No Verification Actions</h3>
          <p className="text-sm text-slate-400">No verification actions have been recorded yet.</p>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="card px-6 py-6 border border-[#1f1f29]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium mb-1">Failed to load verification data</p>
              <p className="text-xs text-slate-500">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success — data table following RiskScoreTable pattern */}
      {state === 'success' && displayedActions.length > 0 && (
        <div className="card overflow-hidden border border-[#1f1f29]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#111116] text-[10px] uppercase tracking-widest text-slate-500 border-b border-[#1f1f29]">
                  <th className="px-5 py-3.5 font-medium">Actor</th>
                  <th className="px-5 py-3.5 font-medium">Action</th>
                  <th className="px-5 py-3.5 font-medium">Workflow</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium">Compliant</th>
                  <th className="px-5 py-3.5 font-medium text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#111116]">
                {displayedActions.map((action, i) => {
                  const st = STATUS_STYLES[action.verificationStatus] ?? STATUS_STYLES.PENDING;
                  const hasFlagDetail = 'violations' in action && action.violations.length > 0;

                  return (
                    <tr key={i} className="hover:bg-[#1a1a22] transition-colors align-top">
                      {/* Actor */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-white font-medium">{action.actorName}</span>
                        <p className="text-[10px] text-slate-500">{action.actorType}</p>
                      </td>

                      {/* Action name */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-300">{action.actionName}</span>
                      </td>

                      {/* Workflow */}
                      <td className="px-5 py-4">
                        {action.workflow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#1f1f29] border border-[#28283a] text-xs text-slate-300">
                            {action.workflow}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-5 py-4">
                        <span
                          className={clsx(
                            'inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border',
                            st.bg,
                            st.color,
                            st.border,
                          )}
                        >
                          {action.verificationStatus}
                        </span>
                        {hasFlagDetail && (
                          <p className="text-[10px] text-amber-400/80 mt-1">
                            {(action as FlaggedAction).violations.length} violation
                            {(action as FlaggedAction).violations.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </td>

                      {/* Policy compliant */}
                      <td className="px-5 py-4">
                        {action.policyCompliant ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="px-5 py-4 text-right">
                        <span className="text-xs text-slate-400 tabular-nums">
                          {new Date(action.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Success but filtered view is empty */}
      {state === 'success' && displayedActions.length === 0 && (
        <div className="card px-6 py-10 flex flex-col items-center justify-center text-center">
          <Filter className="w-10 h-10 text-slate-500 mb-3" />
          <h3 className="text-white font-semibold mb-1">No Flagged Actions</h3>
          <p className="text-sm text-slate-400">No flagged actions found in the verification log.</p>
        </div>
      )}
    </div>
  );
}
