import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface BrandProps extends React.HTMLAttributes<HTMLDivElement> {
  compact?: boolean;
}

export function Brand({ compact = false, className, ...props }: BrandProps) {
  return (
    <div className={cn('flex items-center gap-3', className)} {...props}>
      <Link
        href="/"
        aria-label="Horquva OBA Home"
        className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber rounded-control"
      >
        {/* Bronze/Amber Architectural Ribbon Mark */}
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface border border-rule shadow-xs">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5 text-amber"
            aria-hidden="true"
          >
            <path
              d="M6 3C4.34315 3 3 4.34315 3 6V18C3 19.6569 4.34315 21 6 21H18C19.6569 21 21 19.6569 21 18V6C21 4.34315 19.6569 3 18 3H6Z"
              stroke="currentColor"
              strokeWidth="1.5"
              className="opacity-20"
            />
            <path
              d="M7 17L12 7L17 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 13H15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {!compact && (
          <div className="flex flex-col">
            <span className="font-sans text-sm font-semibold uppercase tracking-[0.18em] text-ink leading-none">
              Horquva
            </span>
            <span className="font-sans text-[10px] font-medium tracking-tight text-ink-3 leading-none mt-1">
              OBA · Organizational Brain Analysis
            </span>
          </div>
        )}
      </Link>
    </div>
  );
}
