'use client';

import { useState, useEffect } from 'react';
import { orchestration, ApiError } from '../../lib/api';
import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

// ─── State ───────────────────────────────────────────────────────────────────

type ModeStatus = 'loading' | 'success' | 'error';

interface ModeState {
  status: ModeStatus;
  mode: string | null;
  errorMessage: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AutomationModeControl() {
  const [state, setState] = useState<ModeState>({
    status: 'loading',
    mode: null,
    errorMessage: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchMode() {
      try {
        const data = await orchestration.mode();
        if (!cancelled) {
          setState({
            status: 'success',
            mode: data.executionMode,
            errorMessage: null,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof ApiError
              ? `${err.status} — ${err.message}`
              : err instanceof Error
                ? err.message
                : 'Unable to connect to endpoint';
          setState({ status: 'error', mode: null, errorMessage: message });
        }
      }
    }

    fetchMode();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="animate-fade-up delay-500">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Shield className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Automation Mode</h2>
          <p className="text-xs text-[color:var(--text-secondary)]">
            Current system execution mode from{' '}
            <span className="font-mono text-[color:var(--text-tertiary)]">/api/orchestration/mode</span>
          </p>
        </div>
      </div>

      <div className="card px-6 py-5 border border-[var(--border-subtle)]">
        {/* Loading state */}
        {state.status === 'loading' && (
          <div className="flex items-center gap-4">
            <div className="w-24 h-7 rounded bg-[var(--border-subtle)] animate-pulse-soft" />
            <div className="w-48 h-4 rounded bg-[var(--border-subtle)] animate-pulse-soft" />
          </div>
        )}

        {/* Success state */}
        {state.status === 'success' && state.mode !== null && (
          <div className="flex items-center gap-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span
              className={clsx(
                'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest border',
                state.mode === 'advisory'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : state.mode === 'autonomous'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
              )}
            >
              {state.mode}
            </span>
            <p className="text-sm text-[color:var(--text-secondary)]">
              {state.mode === 'advisory'
                ? 'System suggests actions but never auto-executes.'
                : 'System may auto-execute approved actions.'}
            </p>
          </div>
        )}

        {/* Error state */}
        {state.status === 'error' && (
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[color:var(--text-primary)] mb-1">
                Unable to retrieve execution mode from{' '}
                <span className="font-mono text-[color:var(--text-secondary)]">/api/orchestration/mode</span>
              </p>
              <p className="text-xs text-[color:var(--text-tertiary)]">{state.errorMessage}</p>
              <div className="mt-3 px-4 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <p className="text-xs text-[color:var(--text-secondary)]">
                  Per API reference, the default execution mode is{' '}
                  <span className="text-emerald-400 font-semibold">advisory</span> — the system
                  never auto-acts unless explicitly changed.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
