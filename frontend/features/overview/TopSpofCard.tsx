'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { formatRunsPerWeek } from '@/lib/format';
import type { SpofAsset } from '@/types/view';
import type { ApiError } from '@/lib/api/client';

export interface TopSpofCardProps {
  assets?: SpofAsset[];
  isLoading?: boolean;
  error?: ApiError | null;
  onRetry?: () => void;
  className?: string;
}

export function TopSpofCard({
  assets = [],
  isLoading = false,
  error = null,
  onRetry,
  className,
}: TopSpofCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <div className="space-y-4">
          <Skeleton variant="text" className="w-1/2 h-5" />
          <Skeleton variant="card" className="h-20" />
          <Skeleton variant="card" className="h-20" />
          <Skeleton variant="card" className="h-20" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <ErrorState onRetry={onRetry} message="We couldn't load single points of failure." />
      </Card>
    );
  }

  if (assets.length === 0) {
    return (
      <Card className={className}>
        <EmptyState
          title="No single points of failure"
          description="Every critical asset currently has an active backup or automated redundancy."
          actionLabel="View asset catalog"
          onAction={() => {
            window.location.href = '/assets';
          }}
        />
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between pb-3 border-b border-rule/50">
        <div>
          <h2 className="text-base font-semibold text-ink">Top Single Points of Failure</h2>
          <p className="text-xs text-ink-3">Ranked critical assets dependent on a single individual or credential.</p>
        </div>
        <span className="rounded-full bg-amber/15 text-amber-ink px-2.5 py-0.5 text-xs font-mono font-medium tabular-nums">
          {assets.length}
        </span>
      </div>

      <div className="divide-y divide-rule/40">
        {assets.map((spof, index) => (
          <Link
            key={spof.asset.id}
            href={`/assets/${spof.asset.id}`}
            className="group flex items-start justify-between gap-4 py-3.5 transition-colors hover:bg-surface-sunken/40 -mx-6 px-6 first:pt-4 last:pb-2"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-mono font-semibold text-ink-3">
                {String(index + 1).padStart(2, '0')}
              </span>

              <div>
                <h3 className="text-sm font-semibold text-ink group-hover:text-amber-ink transition-colors leading-tight">
                  {spof.asset.name}
                </h3>
                <p className="text-xs text-ink-2 mt-0.5">
                  {spof.reason} · depends on <span className="font-medium text-ink">{spof.dependsOn.name}</span>
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs font-mono font-medium text-ink tabular-nums block">
                {formatRunsPerWeek(spof.runsPerWeek)}
              </span>
              <span className="text-[10px] text-ink-3 uppercase tracking-wider block">Volume</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="pt-3 border-t border-rule/50 text-right">
        <Link
          href="/assets"
          className="text-xs font-semibold text-amber-ink hover:underline inline-flex items-center gap-1"
        >
          <span>See all assets</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Card>
  );
}
