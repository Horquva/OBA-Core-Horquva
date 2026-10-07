'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/states';

/** The briefing is markdown; the one-line preview shows its prose, not '#' and '**'. */
export function plainPreview(markdown: string, max: number): string {
  const text = markdown
    .split('\n')
    .map((line) => line.replace(/^\s*(#{1,6}\s+|[-*]\s+|\d+\.\s+|>\s*)/, '').trim())
    .filter((line) => line && !/^[-=*_]{3,}$/.test(line))
    .filter((line, i, lines) => !(i === 0 && lines.length > 1 && /briefing/i.test(line))) // drop the title line
    .join(' ')
    .replace(/(\*\*|__|\*|_|`)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export interface BriefingCardProps {
  briefingText?: string | null;
  isLoading?: boolean;
  /** The briefing failed to load; say so instead of showing a generic tagline. */
  error?: boolean;
  className?: string;
}

export function BriefingCard({
  briefingText,
  isLoading = false,
  error = false,
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
          <h3 className="text-lg font-semibold text-ink">
            This Week’s Continuity Briefing
          </h3>
          <p className="text-xs text-ink-3 line-clamp-1 max-w-xl">
            {error
              ? "This week's briefing couldn't be loaded."
              : briefingText
                ? plainPreview(briefingText, 140)
                : 'No briefing text yet.'}
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
