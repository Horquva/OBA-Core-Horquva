'use client';

import * as React from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { ErrorState } from '@/components/ui/states';
import { cn } from '@/lib/cn';
import type { TeamSummary } from '@/types/view';

export interface TeamCoveragePanelProps {
  /** undefined = loading, null = failed to load. */
  teams?: TeamSummary[] | null;
  onRetry?: () => void;
  className?: string;
}

const MAX_ROWS = 6;

/**
 * One meter per team: the covered share of its critical assets, on a neutral track
 * (not green against red, which colour-blind readers can't separate). Teams with the
 * lowest covered share come first; individual people are never ranked here.
 */
export function TeamCoveragePanel({ teams, onRetry, className }: TeamCoveragePanelProps) {
  const rows = teams
    ? teams
        .filter((t) => t.coverage.total > 0)
        .sort((a, b) => a.coverage.covered / a.coverage.total - b.coverage.covered / b.coverage.total || b.coverage.exposed - a.coverage.exposed)
    : null;

  return (
    <Panel className={cn('flex flex-col', className)} aria-labelledby="teams-heading">
      <PanelHeader
        titleId="teams-heading"
        title="Coverage by team"
        icon={<Users />}
        count={rows?.length}
        description="Share of each team's critical assets that are fully covered."
        action={{ label: 'All teams', href: '/people' }}
      />

      {teams === null && (
        <div className="p-5">
          <ErrorState onRetry={onRetry} message="We couldn't load team coverage." />
        </div>
      )}

      {teams === undefined && (
        <div className="space-y-4 px-5 py-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <span className="skeleton block h-3.5 w-1/3" />
              <span className="skeleton block h-2.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      )}

      {rows && rows.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
          <p className="type-heading text-ink">No team owns a critical asset yet</p>
          <p className="type-meta mt-1 text-ink-3">Teams appear once your directory groups are connected.</p>
        </div>
      )}

      {rows && rows.length > 0 && (
        <ul className="flex-1 space-y-1 px-2 py-3">
          {rows.slice(0, MAX_ROWS).map((team) => {
            const { covered, exposed, total } = team.coverage;
            const pct = (covered / total) * 100;
            return (
              <li key={team.id}>
                <Link
                  href={`/people/teams/${encodeURIComponent(team.id)}`}
                  className="group block rounded-control px-3 py-2 transition-colors hover:bg-surface-sunken/50"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="type-meta truncate font-medium text-ink">{team.name}</span>
                    <span className="type-meta shrink-0 text-ink-2">
                      <span className="font-medium text-ink tabular-nums">{covered} of {total}</span> covered
                      {exposed > 0 && <span className="text-ink-3"> · {exposed} exposed</span>}
                    </span>
                  </div>
                  <div
                    role="meter"
                    aria-label={`${team.name}: ${covered} of ${total} critical assets covered`}
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={covered}
                    className="mt-1.5 h-2.5 overflow-hidden rounded-r-[4px] bg-surface-sunken"
                  >
                    {covered > 0 && <div className="h-full rounded-r-[4px] bg-st-pass" style={{ width: `${pct}%` }} />}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
