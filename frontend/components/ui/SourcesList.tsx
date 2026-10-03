'use client';

import * as React from 'react';
import type { EvidenceGrade, FactView } from '@/types/view';
import { cn } from '@/lib/cn';
import { EvidenceBadge } from './marks';

export interface SourceFactItem {
  id: string;
  attribute: string;
  value: string;
  grade: EvidenceGrade;
  source: string;
  observedAt?: string;
  entityName?: string;
}

export interface SourcesListProps extends React.HTMLAttributes<HTMLDivElement> {
  sources: SourceFactItem[];
  defaultExpanded?: boolean;
}

export function SourcesList({
  sources,
  defaultExpanded = false,
  className,
  ...props
}: SourcesListProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  if (sources.length === 0) return null;

  return (
    <div
      className={cn('rounded-control border border-rule bg-surface-sunken/40 text-xs', className)}
      {...props}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between p-3 font-medium text-ink-2 hover:text-ink transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber rounded-control"
      >
        <span className="flex items-center gap-2">
          <span className="font-semibold text-ink">Sources</span>
          <span className="text-ink-3">({sources.length} verified facts cited)</span>
        </span>
        <span className="text-[11px] text-ink-3">{isExpanded ? 'Hide ▲' : 'Show ▼'}</span>
      </button>

      {isExpanded && (
        <ul className="divide-y divide-rule border-t border-rule px-3 py-1 font-sans">
          {sources.map((item) => (
            <li key={item.id} className="py-2.5 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <EvidenceBadge grade={item.grade} />
                  {item.entityName && (
                    <span className="font-medium text-ink">{item.entityName}:</span>
                  )}
                  <span className="font-mono text-ink-2">{item.attribute}</span>
                </div>
                <span className="text-[11px] text-ink-3">Source: {item.source}</span>
              </div>
              <p className="text-ink-2 pl-1">
                Value: <strong className="font-medium text-ink">{item.value}</strong>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
