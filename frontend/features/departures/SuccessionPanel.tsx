'use client';

import * as React from 'react';
import type { SuccessionPlanResult } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/states';
import { cn } from '@/lib/cn';

export interface SuccessionPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  result?: SuccessionPlanResult | null;
  isLoading?: boolean;
  onSave?: () => void;
  onSendAcceptance?: () => void;
  isSaving?: boolean;
  isSending?: boolean;
  hasUnsavedChanges?: boolean;
}

export function SuccessionPanel({
  result,
  isLoading = false,
  onSave,
  onSendAcceptance,
  isSaving = false,
  isSending = false,
  hasUnsavedChanges = false,
  className,
  ...props
}: SuccessionPanelProps) {
  if (isLoading) {
    return (
      <Card className={cn('p-6 space-y-4', className)} {...props}>
        <Skeleton variant="text" className="w-1/2 h-5" />
        <Skeleton variant="card" className="h-24" />
        <Skeleton variant="card" className="h-28" />
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className={cn('p-6 space-y-3 bg-surface', className)} {...props}>
        <h3 className="font-serif text-xl font-normal text-ink">Succession Simulation</h3>
        <p className="text-xs text-ink-3 leading-relaxed">
          Assign successors to assets in the handover table to project coverage delta and prevent single-person overload.
        </p>
      </Card>
    );
  }

  const hasOverload = result.loads.some((load) => load.overloadWarning);

  return (
    <Card className={cn('p-6 space-y-6 shadow-card bg-surface', className)} {...props}>
      <div className="space-y-1 border-b border-rule/50 pb-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
            Live Succession Simulation
          </span>
        </div>
        <h3 className="font-serif text-2xl font-normal text-ink">Coverage Delta</h3>
        <p className="text-xs text-ink-3">
          Instant projection of operational continuity based on proposed successor assignments.
        </p>
      </div>

      {/* Coverage Delta Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-control bg-st-pass/10 border border-st-pass/30 p-3 text-center">
          <span className="font-sans text-2xl font-bold text-st-pass tabular-nums">
            {result.coveredCount}
          </span>
          <p className="text-xs font-medium text-ink-2 mt-0.5">Protected Assets</p>
        </div>

        <div className="rounded-control bg-st-fail/10 border border-st-fail/30 p-3 text-center">
          <span className="font-sans text-2xl font-bold text-st-fail tabular-nums">
            {result.stillExposedCount}
          </span>
          <p className="text-xs font-medium text-ink-2 mt-0.5">Still Exposed</p>
        </div>
      </div>

      {/* Overload Alert Banner */}
      {hasOverload && (
        <div className="rounded-control border border-amber/50 bg-amber/15 p-3.5 space-y-1.5 text-xs text-amber-ink">
          <div className="flex items-center gap-1.5 font-semibold">
            <span aria-hidden="true">⚠️</span>
            <span>Succession Overload Warning (SIM-08)</span>
          </div>
          <p className="leading-relaxed text-ink-2">
            One or more proposed successors would hold more than 30% of critical company automations. Consider distributing assets across secondary backups to avoid recreating a single point of failure.
          </p>
        </div>
      )}

      {/* Successor Loads Breakdown */}
      {result.loads.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
            Proposed Operator Loads
          </h4>

          <div className="space-y-2">
            {result.loads.map((load) => (
              <div
                key={load.successor.id}
                className={cn(
                  'rounded-control border p-3 text-xs transition-colors space-y-2',
                  load.overloadWarning
                    ? 'border-amber/50 bg-amber/10'
                    : 'border-rule bg-surface-sunken/40',
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-surface-sunken border border-rule text-[11px] font-semibold flex items-center justify-center text-ink shrink-0">
                      {load.successor.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <span className="font-medium text-ink">{load.successor.name}</span>
                  </div>

                  <span
                    className={cn(
                      'font-mono text-xs font-semibold tabular-nums px-2 py-0.5 rounded-badge',
                      load.overloadWarning
                        ? 'bg-amber text-paper'
                        : 'bg-surface-sunken text-ink-2',
                    )}
                  >
                    {Math.round(load.shareOfCompanyCriticalAutomationsPct)}% share
                  </span>
                </div>

                <div className="text-[11px] text-ink-3 flex items-center justify-between">
                  <span>Critical automations owned:</span>
                  <span className="font-semibold text-ink font-mono">
                    {load.totalCriticalAssetsOwned}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 border-t border-rule/50 space-y-2">
        <Button
          variant="primary"
          className="w-full"
          onClick={onSave}
          disabled={!hasUnsavedChanges || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Successor Assignments'}
        </Button>

        <Button
          variant="secondary"
          className="w-full"
          onClick={onSendAcceptance}
          disabled={isSending || result.loads.length === 0}
        >
          {isSending ? 'Sending...' : 'Request Successor Acceptance'}
        </Button>
      </div>
    </Card>
  );
}
