'use client';

import { useEffect, useState, useCallback } from 'react';
import { orgScience, ApiError, type GraphStatus } from '../../lib/api';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

type BannerState = 'loading' | 'ready' | 'error';

function relativeTime(iso: string | null): string {
  if (!iso) return 'never loaded';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface GraphFreshnessBannerProps {
  /** Fires after a reload completes successfully, so callers can refetch dependent data. */
  onReload: () => void;
}

export function GraphFreshnessBanner({ onReload }: GraphFreshnessBannerProps) {
  const [state, setState] = useState<BannerState>('loading');
  const [status, setStatus] = useState<GraphStatus | null>(null);
  const [reloading, setReloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await orgScience.graphStatus();
      setStatus(s);
      setState('ready');
    } catch (err: unknown) {
      setErrorMsg(err instanceof ApiError ? `${err.status} — ${err.message}` : 'Failed to reach the backend');
      setState('error');
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(fetchStatus);
  }, [fetchStatus]);

  async function handleReload() {
    setReloading(true);
    setErrorMsg(null);
    try {
      await orgScience.graphReload();
      await fetchStatus();
      onReload();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiError
          ? `Reload failed (${err.status}) — showing last-known data`
          : 'Reload failed — showing last-known data',
      );
    } finally {
      setReloading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-sm">
      <div className="flex items-center gap-2 min-w-0">
        {state === 'error' && !errorMsg?.includes('Reload failed') && (
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
        )}
        <span className="text-[color:var(--text-secondary)] truncate">
          {state === 'loading' && 'Checking graph status…'}
          {state === 'ready' && status && `Graph data as of ${relativeTime(status.source.loadedAt)}`}
          {state === 'error' && (errorMsg ?? 'Graph status unavailable')}
        </span>
      </div>
      <button
        type="button"
        onClick={handleReload}
        disabled={reloading}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-widest',
          'border border-[var(--border-default)] text-[color:var(--text-primary)]',
          'hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        <RefreshCw className={clsx('w-3.5 h-3.5', reloading && 'animate-spin')} />
        {reloading ? 'Reloading…' : 'Reload'}
      </button>
    </div>
  );
}
