'use client';

import * as React from 'react';
import type { SuccessionPlanResult } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/states';
import { cn } from '@/lib/cn';

/** Must match the backend's succession-test rule (routes/departures.ts): ≥40% share and ≥3 critical assets. */
const OVERLOAD_SHARE_PCT = 40;

export interface SuccessionPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  result?: SuccessionPlanResult | null;
  isLoading?: boolean;
  /** The succession test request failed. */
  error?: boolean;
  /** HR/admin and the departure still open: show save / request actions. */
  canEdit?: boolean;
  /** Saved successors are waiting to be asked. */
  canRequestAcceptance?: boolean;
  onSave?: () => void;
  onSendAcceptance?: () => void;
  isSaving?: boolean;
  isSending?: boolean;
  hasUnsavedChanges?: boolean;
}

export function SuccessionPanel({
  result,
  isLoading = false,
  error = false,
  canEdit = true,
  canRequestAcceptance = false,
  onSave,
  onSendAcceptance,
  isSaving = false,
  isSending = false,
  hasUnsavedChanges = false,
  className,
  ...props
}: SuccessionPanelProps) {
  const hasOverload = result?.loads.some((load) => load.overloadWarning) ?? false;

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
          Projection of continuity based on the proposed successor assignments.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-28" />
        </div>
      )}

      {!isLoading && error && (
        <p className="rounded-control border border-st-fail/30 bg-st-fail/10 p-3 text-xs text-st-fail">
          The succession test couldn't run. The projection below is not shown until it does.
        </p>
      )}

      {!isLoading && !error && !result && (
        <p className="text-xs text-ink-3 leading-relaxed">
          Assign successors in the handover table to project coverage and catch single-person overload.
        </p>
      )}

      {!isLoading && result && (
        <>
          {/* Coverage Delta Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-control bg-st-pass/10 border border-st-pass/30 p-3 text-center">
              <span className="font-sans text-2xl font-bold text-st-pass tabular-nums">{result.coveredCount}</span>
              <p className="text-xs font-medium text-ink-2 mt-0.5">Protected Assets</p>
            </div>

            <div className="rounded-control bg-st-fail/10 border border-st-fail/30 p-3 text-center">
              <span className="font-sans text-2xl font-bold text-st-fail tabular-nums">{result.stillExposedCount}</span>
              <p className="text-xs font-medium text-ink-2 mt-0.5">Still Exposed</p>
            </div>
          </div>

          {hasOverload && (
            <div className="rounded-control border border-amber/50 bg-amber/15 p-3.5 space-y-1.5 text-xs text-amber-ink">
              <div className="flex items-center gap-1.5 font-semibold">
                <span aria-hidden="true">⚠️</span>
                <span>Succession Overload Warning</span>
              </div>
              <p className="leading-relaxed text-ink-2">
                A proposed successor would hold {OVERLOAD_SHARE_PCT}% or more of the company&apos;s critical
                automations. Spread these assets across more people to avoid creating a new single point of failure.
              </p>
            </div>
          )}

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
                      load.overloadWarning ? 'border-amber/50 bg-amber/10' : 'border-rule bg-surface-sunken/40',
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
                          load.overloadWarning ? 'bg-amber text-paper' : 'bg-surface-sunken text-ink-2',
                        )}
                      >
                        {Math.round(load.shareOfCompanyCriticalAutomationsPct)}% share
                      </span>
                    </div>

                    <div className="text-[11px] text-ink-3 flex items-center justify-between">
                      <span>Critical automations owned:</span>
                      <span className="font-semibold text-ink font-mono">{load.totalCriticalAssetsOwned}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Actions stay available even when the projection is loading or failed. */}
      {canEdit && (
        <div className="pt-2 border-t border-rule/50 space-y-2">
          <Button variant="primary" className="w-full" onClick={onSave} disabled={!hasUnsavedChanges || isSaving}>
            {isSaving ? 'Saving...' : 'Save Successor Assignments'}
          </Button>

          <Button
            variant="secondary"
            className="w-full"
            onClick={onSendAcceptance}
            disabled={isSending || !canRequestAcceptance}
          >
            {isSending ? 'Sending...' : 'Request Successor Acceptance'}
          </Button>
          {hasUnsavedChanges && (
            <p className="text-[11px] text-ink-3">Save the assignments before asking successors to accept.</p>
          )}
        </div>
      )}
    </Card>
  );
}
