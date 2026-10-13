'use client';

import * as React from 'react';
import Link from 'next/link';
import { UserMinus } from 'lucide-react';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState } from '@/components/ui/states';
import { formatDate, formatRelativeTime } from '@/lib/format';
import { DEPARTURE_STAGES, STAGE_LABEL, type DepartureSummary } from '@/types/view';
import { cn } from '@/lib/cn';

export interface DeparturesPanelProps {
  /** undefined = loading, null = failed to load. */
  departures?: DepartureSummary[] | null;
  onRetry?: () => void;
  className?: string;
}

const MAX_ROWS = 5;

function RowSkeleton() {
  return (
    <li className="space-y-2.5 px-5 py-4">
      <span className="skeleton block h-4 w-1/2" />
      <span className="skeleton block h-3 w-2/3" />
      <span className="skeleton block h-1.5 w-full rounded-full" />
    </li>
  );
}

export function DeparturesPanel({ departures, onRetry, className }: DeparturesPanelProps) {
  const active = departures
    ? departures
        .filter((d) => d.group !== 'departed')
        .sort((a, b) => new Date(a.leaveDate).getTime() - new Date(b.leaveDate).getTime())
    : null;

  return (
    <Panel className={cn('flex flex-col', className)} aria-labelledby="departures-heading">
      <PanelHeader
        titleId="departures-heading"
        title="Upcoming departures"
        icon={<UserMinus />}
        count={active?.length}
        action={{ label: 'All departures', href: '/departures' }}
      />

      {departures === null && (
        <div className="p-5">
          <ErrorState onRetry={onRetry} message="We couldn't load upcoming departures." />
        </div>
      )}

      {departures === undefined && (
        <ul className="divide-y divide-rule">
          <RowSkeleton />
          <RowSkeleton />
        </ul>
      )}

      {active && active.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
          <p className="type-heading text-ink">No one is leaving</p>
          <p className="type-meta mt-1 text-ink-3">Departures appear here once HR or a manager records them.</p>
        </div>
      )}

      {active && active.length > 0 && (
        <ul className="divide-y divide-rule">
          {active.slice(0, MAX_ROWS).map((dep) => {
            const pct = dep.assetsTotal > 0 ? (dep.assetsHandedOver / dep.assetsTotal) * 100 : 0;
            const step = DEPARTURE_STAGES.indexOf(dep.stage) + 1;
            return (
              <li key={dep.id}>
                <Link href={`/departures/${dep.id}`} className="group flex gap-3 px-5 py-4 transition-colors hover:bg-surface-sunken/50">
                  <Avatar name={dep.person.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium text-ink">{dep.person.name}</p>
                      <time dateTime={dep.leaveDate} title={formatDate(dep.leaveDate)} className="type-meta shrink-0 text-ink-2 tabular-nums">
                        Leaves {formatRelativeTime(dep.leaveDate)}
                      </time>
                    </div>
                    <p className="type-meta mt-0.5 truncate text-ink-3">
                      {dep.role || dep.team || 'Team member'}
                      <span aria-hidden="true"> · </span>
                      {STAGE_LABEL[dep.stage]} (step {step} of {DEPARTURE_STAGES.length})
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <div
                        role="progressbar"
                        aria-label={`Handover progress for ${dep.person.name}`}
                        aria-valuemin={0}
                        aria-valuemax={dep.assetsTotal}
                        aria-valuenow={dep.assetsHandedOver}
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken"
                      >
                        <div
                          className={cn('h-full rounded-full', dep.hasAlert ? 'bg-amber' : 'bg-st-pass')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="type-meta shrink-0 text-ink-2">
                        <span className="font-medium text-ink tabular-nums">{dep.assetsHandedOver} of {dep.assetsTotal}</span> handed over
                      </span>
                    </div>

                    {dep.hasAlert && (
                      <p className="type-meta mt-2 flex items-center gap-1.5 font-medium text-st-fail">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-st-fail" aria-hidden="true" />
                        Critical assets without an accepted successor
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
