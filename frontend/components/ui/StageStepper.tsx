import * as React from 'react';
import { DEPARTURE_STAGES, STAGE_LABEL, type DepartureStage } from '@/types/view';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';

export interface StageStepperProps extends React.HTMLAttributes<HTMLDivElement> {
  currentStage: DepartureStage;
  timestamps?: Partial<Record<DepartureStage, string>>;
}

export function StageStepper({ currentStage, timestamps = {}, className, ...props }: StageStepperProps) {
  const currentIndex = DEPARTURE_STAGES.indexOf(currentStage);

  return (
    <div className={cn('flex flex-col gap-2 w-full', className)} {...props}>
      <ol className="flex items-center w-full" aria-label="Departure lifecycle stages">
        {DEPARTURE_STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isPending = idx > currentIndex;
          const timestamp = timestamps[stage];

          return (
            <li
              key={stage}
              className={cn(
                'flex items-center relative',
                idx !== DEPARTURE_STAGES.length - 1 ? 'w-full' : '',
              )}
            >
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    isCompleted && 'bg-st-pass text-surface',
                    isCurrent && 'bg-amber text-on-amber ring-4 ring-amber/20',
                    isPending && 'bg-surface-sunken text-ink-3 border border-rule',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? '✓' : idx + 1}
                </span>
                <span className="hidden sm:block text-[11px] font-medium text-ink-2 mt-1 text-center whitespace-nowrap">
                  {STAGE_LABEL[stage]}
                </span>
                {timestamp && (
                  <span className="hidden sm:block text-[10px] text-ink-3 text-center whitespace-nowrap">
                    {formatDate(timestamp)}
                  </span>
                )}
              </div>
              {idx !== DEPARTURE_STAGES.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-full mx-2 -mt-4 sm:-mt-8',
                    idx < currentIndex ? 'bg-st-pass' : 'bg-rule',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
