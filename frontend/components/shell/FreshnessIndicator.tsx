'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';

export interface FreshnessSource {
  name: string;
  syncedAt: string | null;
  status: 'ok' | 'failed' | 'syncing';
  error?: string;
}

export interface FreshnessIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  lastSyncedAt?: string | null;
  syncedSources?: number;
  totalSources?: number;
  sources?: FreshnessSource[];
  staleHoursThreshold?: number;
}

export function FreshnessIndicator({
  lastSyncedAt,
  syncedSources = 3,
  totalSources = 3,
  sources = [],
  staleHoursThreshold = 24,
  className,
  ...props
}: FreshnessIndicatorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close popover on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isStale = React.useMemo(() => {
    if (!lastSyncedAt) return false;
    const diffMs = Date.now() - new Date(lastSyncedAt).getTime();
    return diffMs > staleHoursThreshold * 60 * 60 * 1000;
  }, [lastSyncedAt, staleHoursThreshold]);

  const hasFailedSource = syncedSources < totalSources;

  let dotColor = 'bg-st-pass';
  if (isStale) {
    dotColor = 'bg-st-fail';
  } else if (hasFailedSource) {
    dotColor = 'bg-amber';
  }

  const timeDisplay = lastSyncedAt ? formatTime(lastSyncedAt) : 'just now';

  return (
    <div ref={containerRef} className={cn('relative inline-block text-xs', className)} {...props}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="View data freshness details"
        className="flex items-center gap-2 rounded-control px-2.5 py-1 text-ink-2 hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber"
      >
        <span className={cn('h-2 w-2 rounded-full shrink-0', dotColor)} aria-hidden="true" />
        <span className="hidden sm:inline">Data as of {timeDisplay}</span>
        <span className="text-ink-3 tabular-nums">· {syncedSources}/{totalSources} synced</span>
      </button>

      {/* Detail Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Data freshness breakdown"
          className="absolute right-0 mt-2 w-72 rounded-card border border-rule bg-surface p-4 shadow-xl z-50 space-y-3 font-sans"
        >
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <span className="font-semibold text-ink">Connector Sync Status</span>
            <span className={cn('text-[11px] font-medium', isStale ? 'text-st-fail' : 'text-st-pass')}>
              {isStale ? 'Sync Stale (>24h)' : 'Operational'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-ink-2">
              Last global graph refresh: <span className="font-medium text-ink">{timeDisplay}</span>
            </p>

            {sources.length > 0 ? (
              <ul className="divide-y divide-rule border-t border-rule pt-2">
                {sources.map((src, idx) => (
                  <li key={idx} className="flex items-center justify-between py-1.5">
                    <span className="text-ink font-medium">{src.name}</span>
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-wider',
                        src.status === 'ok'
                          ? 'text-st-pass'
                          : src.status === 'syncing'
                          ? 'text-amber-ink'
                          : 'text-st-fail'
                      )}
                    >
                      {src.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-3 text-[11px]">
                Active connectors (n8n, Entra/Google, AI Admin) are synchronized.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
