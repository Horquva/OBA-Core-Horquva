'use client';

import * as React from 'react';
import { ArrowRight, GitBranch, TriangleAlert } from 'lucide-react';
import type { EntityRef, HandoverAsset, SuccessionPlanResult } from '@/types/view';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';

/** Must match the backend's succession-test rule (routes/departures.ts): ≥40% share and ≥3 critical assets. */
const OVERLOAD_SHARE_PCT = 40;

export interface SuccessionPanelProps {
  result?: SuccessionPlanResult | null;
  isLoading?: boolean;
  /** The succession test request failed. */
  error?: boolean;
  /** The handover rows and the successors currently picked (saved or not). */
  handover: HandoverAsset[];
  assignments: Record<string, EntityRef | null>;
  className?: string;
}

const MAX_LISTED = 5;

/**
 * Live projection of the proposed successors: what would be covered, what stays exposed,
 * and whether one person would end up holding too much. Saving lives in the action bar.
 */
export function SuccessionPanel({ result, isLoading = false, error = false, handover, assignments, className }: SuccessionPanelProps) {
  const hasOverload = result?.loads.some((load) => load.overloadWarning) ?? false;
  // Counted from the handover itself: exposed = no accepted successor; after the plan,
  // only rows with nobody picked stay exposed.
  const total = handover.length;
  const exposedNow = handover.filter((h) => h.acceptance !== 'accepted');
  const exposedAfter = exposedNow.filter((h) => !(assignments[h.asset.id] ?? h.successor));

  return (
    <Panel className={className} aria-labelledby="succession-heading">
      <PanelHeader
        titleId="succession-heading"
        title="Succession check"
        icon={<GitBranch />}
        description="Updates as you assign successors."
      />

      <div className="space-y-4 px-5 py-4">
        {total === 0 ? (
          <div className="py-4 text-center">
            <p className="type-heading text-ink">Nothing to check</p>
            <p className="type-meta mt-1 text-ink-3">There are no assets to hand over, so no successor plan is needed.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div>
                <p className="type-meta text-ink-3">Exposed now</p>
                <p className={cn('mt-0.5 text-2xl font-semibold tracking-tight tabular-nums', exposedNow.length > 0 ? 'text-st-fail' : 'text-ink')}>
                  {exposedNow.length}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-3" aria-hidden="true" />
              <div>
                <p className="type-meta text-ink-3">After this plan</p>
                <p className={cn('mt-0.5 text-2xl font-semibold tracking-tight tabular-nums', exposedAfter.length > 0 ? 'text-st-fail' : 'text-st-pass')}>
                  {exposedAfter.length}
                </p>
              </div>
            </div>

            <div className="space-y-1.5" aria-hidden="true">
              {[exposedNow.length, exposedAfter.length].map((n, i) => (
                <span key={i} className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                  <span className={cn('block h-full rounded-full', i === 0 ? 'bg-ink-3' : 'bg-st-fail')} style={{ width: `${(n / total) * 100}%` }} />
                </span>
              ))}
            </div>

            <p className="type-meta text-ink-2">
              {exposedNow.length === 0
                ? 'Every asset already has an accepted successor.'
                : exposedAfter.length === 0
                  ? `Everyone is named. ${exposedNow.length} still ${exposedNow.length === 1 ? 'needs' : 'need'} to accept.`
                  : `${exposedAfter.length} of ${total} ${total === 1 ? 'asset has' : 'assets have'} nobody named yet.`}
            </p>

            {exposedAfter.length > 0 && (
              <ul className="space-y-1">
                {exposedAfter.slice(0, MAX_LISTED).map((h) => (
                  <li key={h.asset.id} className="type-meta flex items-center gap-2 text-ink-2">
                    <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-st-fail" />
                    <span className="truncate">{h.asset.name}</span>
                  </li>
                ))}
                {exposedAfter.length > MAX_LISTED && <li className="text-[11px] text-ink-3">and {exposedAfter.length - MAX_LISTED} more</li>}
              </ul>
            )}
          </>
        )}

        {total > 0 && isLoading && <span className="skeleton block h-10 rounded-control" />}

        {total > 0 && !isLoading && error && (
          <p className="type-meta rounded-control border border-rule bg-surface-sunken px-3 py-2.5 text-st-fail">
            The succession test couldn&apos;t run. Successor load isn&apos;t shown until it does.
          </p>
        )}

        {total > 0 && !isLoading && result && (
          <>
            {hasOverload && (
              <div className="flex gap-2.5 rounded-control border border-rule bg-surface-sunken px-3 py-2.5">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-ink" aria-hidden="true" />
                <div>
                  <p className="type-meta font-medium text-ink">Succession overload</p>
                  <p className="type-meta mt-0.5 text-ink-2">
                    A proposed successor would hold {OVERLOAD_SHARE_PCT}% or more of the company&apos;s critical automations. Spread these
                    assets across more people so you don&apos;t create a new single point of failure.
                  </p>
                </div>
              </div>
            )}

            {result.loads.length > 0 && (
              <div>
                <p className="type-meta mb-1.5 text-ink-3">Proposed successors</p>
                <ul className="divide-y divide-rule">
                  {result.loads.map((load) => (
                    <li key={load.successor.id} className="flex items-center gap-3 py-2.5">
                      <Avatar name={load.successor.name} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="type-meta truncate font-medium text-ink">{load.successor.name}</p>
                        <p className="text-[11px] text-ink-3">
                          {load.totalCriticalAssetsOwned} critical {load.totalCriticalAssetsOwned === 1 ? 'asset' : 'assets'} after handover
                        </p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex h-6 items-center rounded-full px-2 text-xs font-medium tabular-nums',
                          load.overloadWarning ? 'bg-[color-mix(in_srgb,var(--amber)_18%,transparent)] text-amber-ink' : 'bg-surface-sunken text-ink-2',
                        )}
                      >
                        {Math.round(load.shareOfCompanyCriticalAutomationsPct)}% share
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
