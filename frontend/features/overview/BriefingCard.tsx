'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/states';

export interface BriefingCardProps {
  briefingText?: string | null;
  isLoading?: boolean;
  className?: string;
}

export function BriefingCard({
  briefingText,
  isLoading = false,
  className,
}: BriefingCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <div className="space-y-3">
          <Skeleton variant="text" className="w-1/3 h-5" />
          <Skeleton variant="card" className="h-16" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-ink">
              Executive Briefing
            </span>
          </div>
          <h3 className="font-serif text-lg font-normal text-ink">
            This Week’s Continuity Briefing
          </h3>
          <p className="text-xs text-ink-3 line-clamp-1 max-w-xl">
            {briefingText
              ? briefingText.slice(0, 140) + '...'
              : 'Synthesized insights from verified SCD2 continuity changes.'}
          </p>
        </div>

        <Link
          href="/briefing"
          className="inline-flex items-center justify-center gap-1.5 rounded-control border border-rule bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-sunken transition-colors shrink-0"
        >
          <span>Read briefing</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Card>
  );
}
