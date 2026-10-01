'use client';

import * as React from 'react';
import type { CoverageMetrics } from '@/types/view';
import { Card } from './Card';
import { SegmentedBar } from './bars';
import { cn } from '@/lib/cn';

export interface CoverageStripProps extends React.HTMLAttributes<HTMLDivElement> {
  metrics: CoverageMetrics;
}

export function CoverageStrip({ metrics, className, ...props }: CoverageStripProps) {
  const [showDefinition, setShowDefinition] = React.useState(false);

  const unknownCount = metrics.unknown ?? 0;
  const segments = [
    {
      count: metrics.covered,
      label: 'fully covered',
      colorClass: 'bg-st-pass',
      href: '/assets?status=covered',
    },
    {
      count: metrics.exposed,
      label: 'exposed',
      colorClass: 'bg-st-fail',
      href: '/assets?status=exposed',
    },
    ...(unknownCount > 0
      ? [
          {
            count: unknownCount,
            label: 'unknown',
            colorClass: 'bg-st-unknown',
            href: '/assets?status=unknown',
          },
        ]
      : []),
  ];

  return (
    <Card className={cn('flex flex-col gap-4', className)} {...props}>
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl sm:text-3xl text-ink tracking-tight font-normal">
          <span className="font-normal">{metrics.covered} of {metrics.total} critical assets fully covered</span>
        </h2>
        <button
          type="button"
          onClick={() => setShowDefinition((v) => !v)}
          className="text-xs text-amber-ink hover:underline cursor-pointer focus:outline-none"
        >
          {showDefinition ? 'Hide definition' : 'What counts as covered?'}
        </button>
      </div>

      <SegmentedBar segments={segments} total={metrics.total} />

      {showDefinition && (
        <div className="mt-2 p-3 bg-surface-sunken rounded-control text-xs text-ink-2 leading-relaxed border border-rule">
          <p className="font-medium text-ink mb-1">Coverage Definition (SIM-07)</p>
          <p>{metrics.definition || 'A critical automation is fully covered when it has at least one confirmed backup owner, a documented and accessible runbook, and operates on dedicated non-personal credentials.'}</p>
        </div>
      )}
    </Card>
  );
}
