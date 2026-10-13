'use client';

import * as React from 'react';
import type { HandoverAsset } from '@/types/view';
import { cn } from '@/lib/cn';

export interface HandoverProgressProps {
  handover: HandoverAsset[];
  firstName: string;
  personalCredentials: number;
  undocumented: number;
}

/**
 * One segmented bar for the whole handover. Accepted and declined are never adjacent
 * (colour-blind safe), and every segment is named in the legend with its count.
 */
export function HandoverProgress({ handover, firstName, personalCredentials, undocumented }: HandoverProgressProps) {
  const total = handover.length;
  const segments = [
    { key: 'accepted', label: 'Accepted', count: handover.filter((h) => h.acceptance === 'accepted').length, swatch: 'bg-st-pass' },
    { key: 'requested', label: 'Awaiting', count: handover.filter((h) => h.acceptance === 'requested').length, swatch: 'bg-amber' },
    { key: 'none', label: 'Not asked yet', count: handover.filter((h) => h.successor !== null && h.acceptance === 'none').length, swatch: 'bg-bronze' },
    { key: 'declined', label: 'Declined', count: handover.filter((h) => h.acceptance === 'declined').length, swatch: 'bg-st-fail' },
    { key: 'unnamed', label: 'No successor', count: handover.filter((h) => h.successor === null && h.acceptance === 'none').length, swatch: 'bg-surface-sunken border border-rule' },
  ];
  const accepted = segments[0].count;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[15px] font-medium text-ink">
          <span className="tabular-nums">{accepted}</span> of <span className="tabular-nums">{total}</span> {total === 1 ? 'asset' : 'assets'} accepted
        </p>
        {(personalCredentials > 0 || undocumented > 0) && (
          <p className="type-meta text-ink-3">
            {personalCredentials > 0 && (
              <span className="font-medium text-st-fail">
                {personalCredentials} {personalCredentials === 1 ? 'runs' : 'run'} on {firstName}&apos;s credentials
              </span>
            )}
            {personalCredentials > 0 && undocumented > 0 && ' · '}
            {undocumented > 0 && `${undocumented} without a runbook`}
          </p>
        )}
      </div>

      <div className="mt-3 flex h-2 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {segments
          .filter((s) => s.count > 0)
          .map((s) => (
            <span key={s.key} className={cn('h-full first:rounded-l-full last:rounded-r-full', s.swatch)} style={{ width: `${(s.count / total) * 100}%` }} />
          ))}
      </div>

      <ul className="type-meta mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-ink-2">
        {segments.map((s) => (
          <li key={s.key} className={cn('inline-flex items-center gap-1.5', s.count === 0 && 'text-ink-3')}>
            <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', s.swatch)} />
            {s.label}
            <span className="font-medium tabular-nums text-ink">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
