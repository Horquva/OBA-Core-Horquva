import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { BrandMark } from './BrandMark';

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
        <BrandMark height={38} />

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
