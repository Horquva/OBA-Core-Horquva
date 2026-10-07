import * as React from 'react';
import Link from 'next/link';
import { Card } from './Card';
import { cn } from '@/lib/cn';

export interface PriorityCardProps extends React.HTMLAttributes<HTMLDivElement> {
  rank: string; // "01", "02", "03"
  category: string;
  problem: string;
  criticalAssetsAffected: number;
  href?: string;
  onReview?: () => void;
  icon?: React.ReactNode;
}

export function PriorityCard({
  rank,
  category,
  problem,
  criticalAssetsAffected,
  href,
  onReview,
  icon,
  className,
  ...props
}: PriorityCardProps) {
  const reviewPill = (
    <button
      type="button"
      onClick={onReview}
      className="inline-flex items-center justify-center px-4 py-1 text-xs font-semibold rounded-full border border-amber-ink text-amber-ink hover:bg-amber-ink/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber"
    >
      Review
    </button>
  );

  return (
    <Card className={cn('flex flex-col justify-between h-full p-5', className)} {...props}>
      <div>
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-mono text-ink-3 font-semibold">{rank}</span>
          <span className="inline-flex items-center gap-1.5 text-bronze-ink font-medium">
            {icon}
            <span>{category}</span>
          </span>
        </div>
        <p className="text-sm font-medium text-ink leading-snug mb-4 line-clamp-2">
          {problem}
        </p>
      </div>

      <div className="flex items-end justify-between pt-4 border-t border-rule mt-2">
        <div className="flex flex-col">
          <span className="text-[11px] text-ink-3 uppercase tracking-wider font-semibold">
            Critical assets affected
          </span>
          <span className="text-2xl font-semibold text-ink tabular-nums">
            {criticalAssetsAffected}
          </span>
        </div>
        {href ? (
          <Link href={href} className="focus:outline-none">
            {reviewPill}
          </Link>
        ) : (
          reviewPill
        )}
      </div>
    </Card>
  );
}
