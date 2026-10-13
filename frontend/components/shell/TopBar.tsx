'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';
import { AskField } from './AskField';
import { BellPopover } from './BellPopover';
import type { ChangeEventView } from '@/types/view';

export interface TopBarProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode;
  onOpenMobileNav?: () => void;
  events?: ChangeEventView[];
  eventsError?: string | null;
  onRetryEvents?: () => void;
  onAcknowledgeEvent?: (id: string) => void;
  onAcknowledgeAllEvents?: () => void;
}

export function TopBar({
  title,
  onOpenMobileNav,
  events,
  eventsError,
  onRetryEvents,
  onAcknowledgeEvent,
  onAcknowledgeAllEvents,
  className,
  ...props
}: TopBarProps) {

  return (
    <header
      role="banner"
      className={cn(
        'sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-rule bg-transparent px-4 sm:px-6',
        className
      )}
      {...props}
    >
      {/* Left Area: Mobile Menu Trigger + Breadcrumb/Title */}
      <div className="flex items-center gap-3">
        {onOpenMobileNav && (
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
            className="rounded-control p-1.5 text-ink-2 hover:bg-surface-sunken hover:text-ink lg:hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {title && (
          <div className="text-sm font-semibold text-ink line-clamp-1">
            {title}
          </div>
        )}
      </div>

      {/* Center Search / Ask Field */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <AskField />
      </div>

      {/* Right Area: Bell & Dev Session */}
      <div className="flex items-center gap-2 sm:gap-3">

        <BellPopover
          events={events}
          error={eventsError}
          onRetry={onRetryEvents}
          onAcknowledge={onAcknowledgeEvent}
          onAcknowledgeAll={onAcknowledgeAllEvents}
        />

      </div>
    </header>
  );
}
