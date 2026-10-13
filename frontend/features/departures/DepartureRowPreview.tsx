'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { EntityKindIcon } from '@/components/ui/EntityKindIcon';
import { CriticalityDots } from '@/components/ui/marks';
import { useResource } from '@/lib/useResource';
import { fetchDeparture } from '@/lib/api/departures';
import { formatRunsPerWeek } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { DepartureDetail } from '@/types/view';
import { ACCEPTANCE_LABEL, ACCEPTANCE_PILL } from './departureStatus';

/** The expanded row in the departures table: each asset, its successor and whether they accepted. */
export function DepartureRowPreview({ id, name }: { id: string; name: string }) {
  const detail = useResource<DepartureDetail>(`departure-${id}`, () => fetchDeparture(id));

  if (detail.status === 'loading') {
    return (
      <div className="space-y-2 py-1" aria-label={`Loading ${name}'s handover`}>
        <span className="skeleton block h-4 w-1/2" />
        <span className="skeleton block h-4 w-2/5" />
      </div>
    );
  }
  if (detail.status === 'error') {
    return (
      <p className="type-meta text-ink-3">
        We couldn&apos;t load this handover.{' '}
        <button type="button" onClick={detail.reload} className="cursor-pointer font-medium text-amber-ink hover:underline">
          Retry
        </button>
      </p>
    );
  }

  const d = detail.data;
  return (
    <div className="space-y-3">
      {d.handover.length === 0 ? (
        <p className="type-meta text-ink-3">{name} owns no tracked assets.</p>
      ) : (
        <ul className="divide-y divide-rule rounded-control border border-rule bg-surface">
          {d.handover.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3.5 py-2.5">
              <span className="flex min-w-0 flex-1 items-center gap-2.5">
                <EntityKindIcon kind={h.asset.kind} className="shrink-0 text-ink-3" />
                <span className="type-meta truncate font-medium text-ink">{h.asset.name}</span>
                <CriticalityDots level={h.criticality} />
              </span>
              <span className="type-meta w-40 truncate text-ink-2">{h.successor ? h.successor.name : <span className="text-ink-3">No successor named</span>}</span>
              <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium', ACCEPTANCE_PILL[h.acceptance])}>
                {ACCEPTANCE_LABEL[h.acceptance]}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-ink-3">
          {d.personalCredentialAutomations.length > 0 &&
            `${d.personalCredentialAutomations.length} on their credentials (${d.personalCredentialAutomations.map((a) => formatRunsPerWeek(a.weeklyRuns)).join(', ')}). `}
          {d.undocumented.length > 0 && `${d.undocumented.length} without a runbook.`}
        </p>
        <Link href={`/departures/${id}`} className="type-meta inline-flex items-center gap-1 font-medium text-ink-2 hover:text-ink">
          Open departure <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
