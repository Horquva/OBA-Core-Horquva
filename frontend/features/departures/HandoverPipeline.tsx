'use client';

import * as React from 'react';
import { ChevronRight, Workflow } from 'lucide-react';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { DEPARTURE_STAGES, STAGE_LABEL, type DepartureStage, type DepartureSummary } from '@/types/view';
import { cn } from '@/lib/cn';

export interface HandoverPipelineProps {
  departures: DepartureSummary[];
  /** The stage the table is filtered to, if any. */
  selected: DepartureStage | null;
  onSelect: (stage: DepartureStage | null) => void;
  className?: string;
}

/**
 * How many departures sit at each of the five lifecycle steps. A stage that holds people
 * shows where handovers get stuck; clicking it filters the table below.
 */
export function HandoverPipeline({ departures, selected, onSelect, className }: HandoverPipelineProps) {
  const counts = DEPARTURE_STAGES.map((stage) => ({
    stage,
    count: departures.filter((d) => d.stage === stage).length,
    atRisk: departures.filter((d) => d.stage === stage && d.hasAlert).length,
  }));
  const max = Math.max(1, ...counts.map((c) => c.count));

  return (
    <Panel className={className} aria-labelledby="pipeline-heading">
      <PanelHeader
        titleId="pipeline-heading"
        title="Handover pipeline"
        icon={<Workflow />}
        description="Departures at each step. Select a step to filter the table."
      />
      <ol className="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-5 sm:gap-0" aria-label="Departures by lifecycle step">
        {counts.map(({ stage, count, atRisk }, i) => {
          const active = selected === stage;
          return (
            <li key={stage} className="relative flex items-stretch">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(active ? null : stage)}
                className={cn(
                  'flex w-full cursor-pointer flex-col rounded-control px-3 py-2.5 text-left transition-colors',
                  active ? 'bg-surface-sunken' : 'hover:bg-surface-sunken/60',
                )}
              >
                <span className="type-meta text-ink-3">
                  {i + 1}. {STAGE_LABEL[stage]}
                </span>
                <span className={cn('mt-1 text-2xl font-semibold tracking-tight', count === 0 ? 'text-ink-3' : 'text-ink')}>{count}</span>
                <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
                  <span
                    className={cn('block h-full rounded-full', stage === 'verified' ? 'bg-st-pass' : 'bg-bronze')}
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </span>
                <span className={cn('mt-1.5 text-[11px]', atRisk > 0 ? 'font-medium text-st-fail' : 'text-ink-3')}>
                  {atRisk > 0 ? `${atRisk} need${atRisk === 1 ? 's' : ''} a successor` : count > 0 ? 'On track' : ' '}
                </span>
              </button>
              {i < counts.length - 1 && (
                <ChevronRight aria-hidden="true" className="absolute -right-2 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-rule sm:block" />
              )}
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
