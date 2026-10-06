'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { StageStepper } from '@/components/ui/StageStepper';
import { formatDate, formatRelativeTime } from '@/lib/format';
import type { DepartureSummary } from '@/types/view';
import type { ApiError } from '@/lib/api/client';

export interface UpcomingDeparturesCardProps {
  departures?: DepartureSummary[];
  isLoading?: boolean;
  error?: ApiError | null;
  onRetry?: () => void;
  className?: string;
}

export function UpcomingDeparturesCard({
  departures = [],
  isLoading = false,
  error = null,
  onRetry,
  className,
}: UpcomingDeparturesCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <div className="space-y-4">
          <Skeleton variant="text" className="w-1/2 h-5" />
          <Skeleton variant="card" className="h-28" />
          <Skeleton variant="card" className="h-28" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <ErrorState onRetry={onRetry} message="We couldn't load upcoming departures." />
      </Card>
    );
  }

  if (departures.length === 0) {
    return (
      <Card className={className}>
        <EmptyState
          title="No upcoming departures"
          description="There are no departures scheduled within the next 30 days."
          actionLabel="View all departures"
          onAction={() => {
            window.location.href = '/departures';
          }}
        />
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between pb-3 border-b border-rule/50">
        <div>
          <h2 className="text-base font-semibold text-ink">Upcoming Departures</h2>
          <p className="text-xs text-ink-3">Departures scheduled within the next 30 days.</p>
        </div>
        <span className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs font-mono font-medium text-ink-2 tabular-nums">
          {departures.length}
        </span>
      </div>

      <div className="divide-y divide-rule/40">
        {departures.map((dep) => (
          <Link
            key={dep.id}
            href={`/departures/${dep.id}`}
            className="group block py-4 transition-colors hover:bg-surface-sunken/40 -mx-6 px-6 first:pt-4 last:pb-2"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-ink group-hover:text-amber-ink transition-colors">
                  {dep.person.name}
                </h3>
                <p className="text-xs text-ink-3 mt-0.5">
                  {dep.role || dep.team || 'Team member'} · Leaving {formatRelativeTime(dep.leaveDate)} ({formatDate(dep.leaveDate)})
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-mono font-medium text-ink tabular-nums">
                  {dep.assetsHandedOver} of {dep.assetsTotal}
                </span>
                <span className="text-[11px] text-ink-3 block">handed over</span>
              </div>
            </div>

            <div className="mt-3">
              <StageStepper currentStage={dep.stage} />
            </div>

            {dep.hasAlert && (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-st-fail font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-st-fail shrink-0" aria-hidden="true" />
                <span>Critical assets without an accepted successor</span>
              </div>
            )}
          </Link>
        ))}
      </div>

      <div className="pt-3 border-t border-rule/50 text-right">
        <Link
          href="/departures"
          className="text-xs font-semibold text-amber-ink hover:underline inline-flex items-center gap-1"
        >
          <span>See all departures</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Card>
  );
}
