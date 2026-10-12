'use client';

import * as React from 'react';
import type { CoverageMetrics } from '@/types/view';
import { Card } from './Card';
import { SegmentedBar } from './bars';
import { cn } from '@/lib/cn';

export interface CoverageStripProps extends React.HTMLAttributes<HTMLDivElement> {
  metrics?: CoverageMetrics;
  total?: number;
  covered?: number;
  exposed?: number;
  unknown?: number | null;
  definition?: string;
}

export function CoverageStrip({
  metrics,
  total,
  covered,
  exposed,
  unknown,
  definition,
  className,
  ...props
}: CoverageStripProps) {
  const [showDefinition, setShowDefinition] = React.useState(false);

  const m: CoverageMetrics = metrics ?? {
    total: total ?? 0,
    covered: covered ?? 0,
    exposed: exposed ?? 0,
    unknown: unknown ?? null,
    definition: definition ?? 'An asset is covered if it has a confirmed backup owner and documented runbook.',
  };

  const unknownCount = m.unknown ?? 0;
  const segments = [
    {
      count: m.covered,
      label: 'fully covered',
      colorClass: 'bg-st-pass',
      href: '/assets?status=covered',
    },
    {
      count: m.exposed,
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
    <Card className={cn('p-6 space-y-4', className)} {...props}>
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <h2 className="text-2xl sm:text-3xl font-semibold text-ink leading-tight">
          <span className="font-normal">{m.covered} of {m.total} critical assets fully covered</span>
        </h2>

        <button
          type="button"
          onClick={() => setShowDefinition((prev) => !prev)}
          className="text-xs text-ink-3 hover:text-ink transition-colors cursor-pointer self-start sm:self-auto underline decoration-rule hover:decoration-ink"
        >
          {showDefinition ? 'Hide definition' : 'What counts as covered?'}
        </button>
      </div>

      <SegmentedBar total={m.total} segments={segments} />

      {showDefinition && (
        <div className="rounded-control bg-surface-sunken p-3 text-xs text-ink-2 border border-rule transition-all">
          <p className="font-medium text-ink mb-1">Coverage Definition (SIM-07)</p>
          <p>{m.definition}</p>
        </div>
      )}
    </Card>
  );
}
