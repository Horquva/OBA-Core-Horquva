'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { DataFreshness } from '@/lib/api/changes';

const SOURCE_LABELS: Record<string, string> = {
  entra: 'Microsoft Entra ID',
  google: 'Google Workspace',
  n8n: 'n8n',
  csv: 'CSV import',
  attestation: 'Confirmed by people',
  manual_assignment: 'Assigned in OBA',
};

export interface FreshnessIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** undefined while loading; null when it could not be loaded. */
  freshness?: DataFreshness | null;
  staleHoursThreshold?: number;
}

/**
 * "How recent is what I'm looking at?" — the newest relationship or fact in the
 * graph, per source. Never claims connectors are synced: sync runs aren't tracked yet.
 */
export function FreshnessIndicator({
  freshness,
  staleHoursThreshold = 24,
  className,
  ...props
}: FreshnessIndicatorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (freshness === undefined) return null;

  const latest = freshness?.latestDataAt ?? null;
  const isStale = latest ? Date.now() - new Date(latest).getTime() > staleHoursThreshold * 3_600_000 : false;
  const label = freshness === null ? 'Data age unavailable' : latest ? `Newest data ${formatDate(latest)}` : 'No data yet';
  const dotColor = freshness === null || !latest ? 'bg-ink-3' : isStale ? 'bg-amber' : 'bg-st-pass';

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
        <span className="hidden sm:inline">{label}</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Data freshness breakdown"
          className="absolute right-0 mt-2 w-72 rounded-card border border-rule bg-surface p-4 shadow-xl z-50 space-y-3 font-sans"
        >
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <span className="font-semibold text-ink">Newest data by source</span>
            {isStale && <span className="text-[11px] font-medium text-amber-ink">Older than {staleHoursThreshold}h</span>}
          </div>
          {freshness === null ? (
            <p className="text-xs text-st-fail">Could not load data freshness.</p>
          ) : freshness.sources.length === 0 ? (
            <p className="text-xs text-ink-3">No data has been loaded yet.</p>
          ) : (
            <ul className="divide-y divide-rule text-xs">
              {freshness.sources.map((src) => (
                <li key={src.source} className="flex items-center justify-between py-1.5">
                  <span className="text-ink font-medium">{SOURCE_LABELS[src.source] ?? src.source}</span>
                  <span className="text-ink-3 tabular-nums">{src.latestAt ? formatDate(src.latestAt) : 'Unknown'}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-ink-3">Connector sync status isn't tracked yet.</p>
        </div>
      )}
    </div>
  );
}
