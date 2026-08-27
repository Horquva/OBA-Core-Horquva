'use client';

import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import clsx from 'clsx';
import type { HealthCheckResult, EndpointStatus } from './EndpointHealthGrid';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function StatusCell({ status }: { status: EndpointStatus }) {
  switch (status) {
    case 'LIVE':
      return (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-emerald-400 font-semibold">LIVE</span>
        </div>
      );
    case 'ERROR':
      return (
        <div className="flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs text-red-400 font-semibold">ERROR</span>
        </div>
      );
    case 'NOT_MOUNTED':
      return (
        <div className="flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
          <span className="text-xs text-[color:var(--text-tertiary)] font-semibold">NOT MOUNTED</span>
        </div>
      );
    case 'CHECKING':
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-indigo-400 animate-pulse-soft" />
          <span className="text-xs text-indigo-400 font-semibold">CHECKING</span>
        </div>
      );
  }
}

// ─── Skeleton Row ────────────────────────────────────────────────────────────

function SkeletonRow({ index }: { index: number }) {
  return (
    <tr key={index}>
      <td className="px-5 py-4">
        <div className="h-4 w-24 rounded bg-[var(--border-subtle)] animate-pulse-soft" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-36 rounded bg-[var(--border-subtle)] animate-pulse-soft" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-20 rounded bg-[var(--border-subtle)] animate-pulse-soft" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-16 rounded bg-[var(--border-subtle)] animate-pulse-soft" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-20 rounded bg-[var(--border-subtle)] animate-pulse-soft" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-12 rounded bg-[var(--border-subtle)] animate-pulse-soft ml-auto" />
      </td>
    </tr>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface DataFreshnessTableProps {
  results: HealthCheckResult[];
  isLoading: boolean;
}

export function DataFreshnessTable({ results, isLoading }: DataFreshnessTableProps) {
  // Only track mounted routes (unmounted have no freshness data)
  const trackedResults = results.filter(r => r.route.mounted);

  // Empty state
  if (trackedResults.length === 0) {
    return (
      <div className="card px-6 py-10 flex flex-col items-center justify-center text-center animate-fade-up delay-400">
        <Clock className="w-10 h-10 text-[color:var(--text-tertiary)] mb-3" />
        <h3 className="text-[color:var(--text-primary)] font-semibold mb-1">No Endpoints to Track</h3>
        <p className="text-sm text-[color:var(--text-secondary)]">No mounted endpoints found in the route registry.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up delay-400">
      {/* Section header — matches RiskScoreTable section header pattern */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
          <Clock className="w-4 h-4 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Data Freshness</h2>
          <p className="text-xs text-[color:var(--text-secondary)]">
            Last successful health check timestamp per mounted endpoint — {trackedResults.length} endpoints tracked
          </p>
        </div>
      </div>

      {/* Table — follows RiskScoreTable structure exactly */}
      <div className="card overflow-hidden border border-[var(--border-subtle)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-surface)] text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                <th className="px-5 py-3.5 font-medium">Module</th>
                <th className="px-5 py-3.5 font-medium">Endpoint</th>
                <th className="px-5 py-3.5 font-medium">Category</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 font-medium">Last Check</th>
                <th className="px-5 py-3.5 font-medium text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111116]">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonRow key={i} index={i} />
                  ))
                : trackedResults.map(result => (
                    <tr
                      key={result.route.path}
                      className="hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      {/* Module name */}
                      <td className="px-5 py-4">
                        <span className="font-medium text-[color:var(--text-primary)] text-sm">
                          {result.route.name}
                        </span>
                      </td>

                      {/* Endpoint path */}
                      <td className="px-5 py-4">
                        <span className="text-xs text-[color:var(--text-secondary)] font-mono">
                          {result.route.pingPath}
                        </span>
                      </td>

                      {/* Category badge — matches department pill pattern */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-[var(--border-subtle)] border border-[var(--border-default)] text-xs text-[color:var(--text-primary)]">
                          {result.route.category}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusCell status={result.status} />
                      </td>

                      {/* Last check timestamp */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-[color:var(--text-primary)] tabular-nums">
                          {formatTime(result.checkedAt)}
                        </span>
                      </td>

                      {/* Latency — color-coded */}
                      <td className="px-5 py-4 text-right">
                        {result.latencyMs > 0 ? (
                          <span
                            className={clsx(
                              'text-sm font-bold tabular-nums',
                              result.latencyMs < 200
                                ? 'text-emerald-400'
                                : result.latencyMs < 500
                                  ? 'text-yellow-400'
                                  : 'text-red-400',
                            )}
                          >
                            {result.latencyMs}ms
                          </span>
                        ) : (
                          <span className="text-xs text-[color:var(--text-tertiary)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
