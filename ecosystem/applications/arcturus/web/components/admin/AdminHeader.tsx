'use client';

import { Activity, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface AdminHeaderProps {
  totalRoutes: number;
  liveCount: number;
  errorCount: number;
  notMountedCount: number;
  isLoading: boolean;
}

export function AdminHeader({
  totalRoutes,
  liveCount,
  errorCount,
  notMountedCount,
  isLoading,
}: AdminHeaderProps) {
  const stats = [
    {
      label: 'Total Endpoints',
      value: totalRoutes,
      icon: <Activity className="w-4 h-4" />,
      color: 'text-indigo-400',
      bg: 'bg-[var(--border-subtle)] border-[var(--border-default)]',
    },
    {
      label: 'Live',
      value: liveCount,
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: 'text-emerald-400',
      bg: 'bg-[var(--border-subtle)] border-[var(--border-default)]',
    },
    {
      label: 'Errors',
      value: errorCount,
      icon: <XCircle className="w-4 h-4" />,
      color: 'text-red-400',
      bg: 'bg-[var(--border-subtle)] border-[var(--border-default)]',
    },
    {
      label: 'Not Mounted',
      value: notMountedCount,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'text-amber-400',
      bg: 'bg-[var(--border-subtle)] border-[var(--border-default)]',
    },
  ];

  return (
    <div className="animate-fade-up">
      {/* Title — matches RiskHeader pattern */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)] tracking-tight">
            System Health &amp; Admin Console
          </h1>
        </div>
        <p className="text-[color:var(--text-secondary)] text-sm">
          Live endpoint monitoring across all backend route groups — with freshness tracking and automation mode.
        </p>
      </div>

      {/* Stats — 4-column grid, same card/icon pattern as RiskHeader */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={clsx(
              'card px-5 py-5 flex flex-col gap-3 animate-fade-up',
              `delay-${75 + i * 75}`,
            )}
          >
            <div
              className={clsx(
                'w-8 h-8 rounded-lg flex items-center justify-center border',
                stat.bg,
                stat.color,
              )}
            >
              {stat.icon}
            </div>
            <div>
              {isLoading ? (
                <div className="h-7 w-12 rounded bg-[var(--border-subtle)] animate-pulse-soft" />
              ) : (
                <p className="text-2xl font-bold text-[color:var(--text-primary)] tracking-tight">{stat.value}</p>
              )}
              <p className="text-[11px] text-[color:var(--text-tertiary)] mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
