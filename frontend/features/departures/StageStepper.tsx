'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { DEPARTURE_STAGES, STAGE_LABEL, type DepartureStage } from '@/types/view';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface StageStepperProps {
  stage: DepartureStage;
  stageTimestamps: Partial<Record<DepartureStage, string>>;
  /** Nothing to hand over: steps 2 and 3 have nothing to do. */
  nothingToHandOver: boolean;
}

/** The five lifecycle steps as numbered nodes joined by a line. */
export function StageStepper({ stage, stageTimestamps, nothingToHandOver }: StageStepperProps) {
  const step = DEPARTURE_STAGES.indexOf(stage) + 1;
  const closed = stage === 'verified';

  return (
    <ol className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:gap-0" aria-label="Departure lifecycle">
      {DEPARTURE_STAGES.map((s, i) => {
        const n = i + 1;
        const skipped = nothingToHandOver && (s === 'successor_named' || s === 'accepted') && n > step;
        const done = n < step || closed;
        const current = n === step && !closed;
        const at = stageTimestamps[s];
        return (
          <li key={s} aria-current={current ? 'step' : undefined} className="relative flex gap-3 sm:block sm:pr-3">
            {/* Connector to the next step. */}
            {i < DEPARTURE_STAGES.length - 1 && (
              <span
                aria-hidden="true"
                className={cn('absolute left-[calc(1.75rem+0.5rem)] right-2 top-3.5 hidden h-px sm:block', done ? 'bg-st-pass' : 'bg-rule')}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'relative z-[1] inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                done && 'bg-st-pass text-paper',
                current && 'bg-amber text-on-amber ring-4 ring-amber/20',
                !done && !current && (skipped ? 'border border-dashed border-rule text-ink-3' : 'border border-rule bg-surface text-ink-3'),
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
            </span>
            <div className="min-w-0 sm:mt-2.5">
              <p className={cn('type-meta font-medium', done || current ? 'text-ink' : 'text-ink-3')}>{STAGE_LABEL[s]}</p>
              <p className="text-[11px] text-ink-3">
                {at ? formatDate(at) : current ? 'In progress' : skipped ? 'Not needed: nothing to hand over' : 'Not yet'}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
