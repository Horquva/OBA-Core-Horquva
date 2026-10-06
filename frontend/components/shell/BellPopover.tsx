'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ChangeEventView } from '@/types/view';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';

export interface BellPopoverProps {
  events?: ChangeEventView[];
  onAcknowledge?: (id: string) => void;
  onAcknowledgeAll?: () => void;
  className?: string;
}

export function BellPopover({
  events = [],
  onAcknowledge,
  onAcknowledgeAll,
  className,
}: BellPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const count = events.length;

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={`Notifications: ${count} unread changes`}
        className="relative rounded-control p-2 text-ink-2 hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-[10px] font-bold text-ink-night tabular-nums leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Flyout Panel (380px) */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Recent changes and alerts"
          className="absolute right-0 mt-2 w-[380px] max-w-[calc(100vw-2rem)] rounded-card border border-rule bg-surface p-4 shadow-xl z-50 space-y-3 font-sans"
        >
          <div className="flex items-center justify-between border-b border-rule pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink text-sm">Recent Changes</span>
              {count > 0 && (
                <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[11px] font-mono text-amber-ink font-semibold">
                  {count}
                </span>
              )}
            </div>

            {count > 0 && onAcknowledgeAll && (
              <button
                type="button"
                onClick={onAcknowledgeAll}
                className="text-xs text-amber-ink hover:underline cursor-pointer focus:outline-none"
              >
                Acknowledge all
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-rule">
            {count === 0 ? (
              <div className="py-8 text-center text-xs text-ink-3">
                <p className="font-medium text-ink mb-0.5">All caught up</p>
                <p>No unacknowledged graph changes or departure alerts.</p>
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="py-3 space-y-1.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-ink leading-tight">{event.title}</p>
                    <span className="text-[10px] text-ink-3 shrink-0 tabular-nums">
                      {formatTime(event.detectedAt)}
                    </span>
                  </div>
                  <p className="text-ink-2 leading-relaxed">{event.impact}</p>

                  <div className="flex items-center justify-between pt-1">
                    {event.href ? (
                      <Link
                        href={event.href}
                        onClick={() => setIsOpen(false)}
                        className="font-medium text-amber-ink hover:underline"
                      >
                        Inspect asset →
                      </Link>
                    ) : (
                      <span />
                    )}

                    {onAcknowledge && (
                      <button
                        type="button"
                        onClick={() => onAcknowledge(event.id)}
                        className="rounded px-2 py-0.5 text-[11px] font-medium text-ink-2 hover:bg-surface-sunken hover:text-ink cursor-pointer border border-rule"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
