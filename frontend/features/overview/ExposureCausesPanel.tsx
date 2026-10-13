'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChartNoAxesColumn } from 'lucide-react';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { cn } from '@/lib/cn';
import type { ExposureCause } from '@/types/view';

export interface ExposureCausesPanelProps {
  causes: ExposureCause[];
  /** Bars are scaled against all critical assets, so a full bar means every one of them. */
  totalCritical: number;
  className?: string;
}

/**
 * Failing checks grouped by what is missing. A magnitude job, so one hue, largest first;
 * values sit at the bar tips. An asset can fail several checks, so the rows don't sum.
 */
export function ExposureCausesPanel({ causes, totalCritical, className }: ExposureCausesPanelProps) {
  const scale = Math.max(1, totalCritical);
  const anyFailing = causes.some((c) => c.assets > 0);

  return (
    <Panel className={cn('flex flex-col', className)} aria-labelledby="causes-heading">
      <PanelHeader
        titleId="causes-heading"
        title="Where the exposure comes from"
        icon={<ChartNoAxesColumn />}
        description="Critical assets failing each check. One asset can fail more than one."
        action={{ label: 'All actions', href: '/actions' }}
      />

      {!anyFailing ? (
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
          <p className="type-heading text-ink">No failing checks</p>
          <p className="type-meta mt-1 text-ink-3">Every critical asset passes all continuity checks.</p>
        </div>
      ) : (
        <ul className="flex-1 space-y-1 px-2 py-3">
          {causes.map((cause) => {
            const pct = (cause.assets / scale) * 100;
            return (
              <li key={cause.checkId}>
                <Link
                  href="/actions"
                  title={`${cause.label}: ${cause.assets} of ${totalCritical} critical assets`}
                  className="group grid grid-cols-[minmax(8rem,11rem)_minmax(0,1fr)] items-center gap-4 rounded-control px-3 py-2 transition-colors hover:bg-surface-sunken/50"
                >
                  <span className={cn('type-meta truncate', cause.assets > 0 ? 'text-ink' : 'text-ink-3')}>{cause.label}</span>
                  <span className="flex items-center gap-2.5">
                    <span className="h-2.5 flex-1 overflow-hidden rounded-r-[4px] bg-surface-sunken">
                      {cause.assets > 0 && (
                        <span className="block h-full rounded-r-[4px] bg-bronze transition-[width] duration-300" style={{ width: `${pct}%` }} />
                      )}
                    </span>
                    <span className="type-meta w-14 shrink-0 text-right text-ink-2">
                      <span className="font-medium text-ink tabular-nums">{cause.assets}</span> of {totalCritical}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
