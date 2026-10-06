'use client';

import * as React from 'react';
import Link from 'next/link';
import type { DepartureSummary } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { StageStepper } from '@/components/ui/StageStepper';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchDepartures } from '@/lib/api/departures';
import { formatDate, formatRelative } from '@/lib/format';
import { InitiateDepartureSideSheet } from './InitiateDepartureSideSheet';
import { cn } from '@/lib/cn';

export interface DeparturesListProps {
  initialDepartures?: DepartureSummary[];
}

export function DeparturesList({ initialDepartures }: DeparturesListProps) {
  const [isSideSheetOpen, setIsSideSheetOpen] = React.useState(false);
  const [selectedTab, setSelectedTab] = React.useState<'upcoming' | 'in_handover' | 'departed'>('upcoming');

  const departuresResource = useResource<DepartureSummary[]>(
    'departures-list',
    fetchDepartures,
  );

  const departures =
    departuresResource.status === 'ready'
      ? departuresResource.data
      : initialDepartures || [];

  const upcoming = departures.filter((d) => d.group === 'upcoming');
  const inHandover = departures.filter((d) => d.group === 'in_handover');
  const departed = departures.filter((d) => d.group === 'departed');

  const currentList = {
    upcoming,
    in_handover: inHandover,
    departed,
  }[selectedTab];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/50 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
              Continuity Offboarding
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink font-normal tracking-tight">
            Departures & Handover
          </h1>
          <p className="text-sm text-ink-3 mt-1">
            Track scheduled leavers, simulate succession coverage, and verify post-departure stability.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsSideSheetOpen(true)}
          className="self-start sm:self-auto text-xs"
        >
          <span>+ Initiate Departure</span>
        </Button>
      </div>

      {/* Group Navigation Tabs */}
      <div className="space-y-6">
        <Tabs
          tabs={[
            { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
            { id: 'in_handover', label: 'In Handover', count: inHandover.length },
            { id: 'departed', label: 'Recently Departed', count: departed.length },
          ]}
          activeTab={selectedTab}
          onChange={(id) => setSelectedTab(id as 'upcoming' | 'in_handover' | 'departed')}
          ariaLabel="Departure stage categories"
        />

        <TabPanel id="upcoming" activeTab={selectedTab}>
          {renderList(upcoming, 'No upcoming departures scheduled.')}
        </TabPanel>
        <TabPanel id="in_handover" activeTab={selectedTab}>
          {renderList(inHandover, 'No active handover workbenches open.')}
        </TabPanel>
        <TabPanel id="departed" activeTab={selectedTab}>
          {renderList(departed, 'No departures recorded in the past 30 days.')}
        </TabPanel>
      </div>

      {/* Loading Skeleton */}
      {departuresResource.status === 'loading' && departures.length === 0 && (
        <div className="space-y-4">
          <Skeleton variant="card" className="h-32" />
          <Skeleton variant="card" className="h-32" />
          <Skeleton variant="card" className="h-32" />
        </div>
      )}

      {/* Error State */}
      {departuresResource.status === 'error' && departures.length === 0 && (
        <ErrorState
          onRetry={departuresResource.reload}
          message="We couldn't load departure records."
          lastLoadedAt={departuresResource.lastLoadedAt || undefined}
        />
      )}

      {/* Side Sheet for Initiating Departures */}
      <InitiateDepartureSideSheet
        open={isSideSheetOpen}
        onClose={() => setIsSideSheetOpen(false)}
        onSuccess={() => {
          departuresResource.reload();
        }}
      />
    </div>
  );

  function renderList(items: DepartureSummary[], emptyMsg: string) {
    if (items.length === 0) {
      return (
        <EmptyState
          title="No records found"
          description={emptyMsg}
          actionLabel="Initiate Departure"
          onAction={() => setIsSideSheetOpen(true)}
          className="mt-4"
        />
      );
    }

    return (
      <div className="space-y-4 mt-4">
        {items.map((dep) => {
          const initials = dep.person.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          const formattedDate = formatDate(dep.leaveDate);
          const relativeTime = formatRelative(dep.leaveDate);

          return (
            <Card
              key={dep.id}
              className={cn(
                'p-6 transition-all hover:border-ink-3/40 bg-surface shadow-xs',
                dep.hasAlert && 'border-amber/60 bg-amber/5',
              )}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Person details */}
                <div className="flex items-start gap-4">
                  <span className="h-12 w-12 rounded-full bg-surface-sunken border border-rule font-serif text-lg font-normal flex items-center justify-center text-ink shrink-0">
                    {initials}
                  </span>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/departures/${dep.id}`}
                        className="font-serif text-xl font-normal text-ink hover:text-amber-ink transition-colors"
                      >
                        {dep.person.name}
                      </Link>

                      {dep.hasAlert && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge bg-amber text-paper text-[11px] font-semibold">
                          Discontinuity Alert
                        </span>
                      )}

                      <span className="text-[11px] px-1.5 py-0.5 rounded-badge bg-surface-sunken text-ink-3 font-mono">
                        {dep.detectedFrom}
                      </span>
                    </div>

                    <p className="text-xs text-ink-3">
                      {dep.role || 'Member'} {dep.team ? `· ${dep.team}` : ''}
                    </p>

                    <p className="text-xs text-ink-2 font-mono">
                      Effective: {formattedDate} ({relativeTime})
                    </p>
                  </div>
                </div>

                {/* Handover stats & lifecycle */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 lg:justify-end">
                  <div className="space-y-1 text-left sm:text-right min-w-[140px]">
                    <p className="text-xs text-ink-3 uppercase font-mono">Handover Progress</p>
                    <p className="text-sm font-semibold text-ink">
                      <span className="tabular-nums font-mono">{dep.assetsHandedOver}</span> of{' '}
                      <span className="tabular-nums font-mono">{dep.assetsTotal}</span> assets
                    </p>
                  </div>

                  <div className="min-w-[200px] max-w-[260px]">
                    <StageStepper currentStage={dep.stage} />
                  </div>

                  <Link
                    href={`/departures/${dep.id}`}
                    className="inline-flex items-center justify-center rounded-control bg-surface-sunken hover:bg-surface-sunken/80 border border-rule px-3.5 py-2 text-xs font-semibold text-ink transition-colors shrink-0"
                  >
                    <span>Open Workbench</span>
                    <span aria-hidden="true" className="ml-1">→</span>
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }
}
