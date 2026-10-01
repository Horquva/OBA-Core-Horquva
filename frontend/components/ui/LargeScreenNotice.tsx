'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';

export interface LargeScreenNoticeProps {
  thresholdPx?: number;
  message?: string;
  className?: string;
}

export function LargeScreenNotice({
  thresholdPx = 1200,
  message = 'Best experienced on a desktop display (1200px or wider). Viewing in compact layout.',
  className,
}: LargeScreenNoticeProps) {
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);

  React.useEffect(() => {
    const checkWidth = () => {
      setIsSmallScreen(window.innerWidth < thresholdPx);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, [thresholdPx]);

  if (isDismissed || !isSmallScreen) return null;

  return (
    <aside
      aria-label="Viewport size notification"
      className={cn(
        'flex items-center justify-between gap-3 border-b border-rule bg-surface-sunken px-4 py-2 text-xs text-ink-2',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <svg
          className="h-4 w-4 shrink-0 text-amber"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <span>{message}</span>
      </div>
      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        aria-label="Dismiss notice"
        className="rounded-control p-1 text-ink-3 transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </aside>
  );
}
