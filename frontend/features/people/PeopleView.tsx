'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { TeamSummary, EntityRef } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { NamedShareBar } from '@/components/ui/bars';
import { SegmentedBar } from '@/components/ui/bars';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { PersonPicker, PersonItem } from '@/components/ui/PersonPicker';
import { useResource } from '@/lib/useResource';
import { fetchTeams } from '@/lib/api/people';
import { cn } from '@/lib/cn';

export interface PeopleViewProps {
  initialTeams?: TeamSummary[];
  minGroupSize?: number;
}

export function PeopleView({ initialTeams, minGroupSize: initialMinSize = 5 }: PeopleViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');

  const teamsResource = useResource<{ teams: TeamSummary[]; minGroupSize: number }>(
    'people-teams-list',
    fetchTeams,
  );

  const teamsData = teamsResource.status === 'ready' ? teamsResource.data.teams : initialTeams || [];
  const minGroupSize = teamsResource.status === 'ready' ? teamsResource.data.minGroupSize : initialMinSize;

  const filteredTeams = React.useMemo(() => {
    if (!searchQuery.trim()) return teamsData;
    const q = searchQuery.toLowerCase();
    return teamsData.filter((t) => t.name.toLowerCase().includes(q));
  }, [teamsData, searchQuery]);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/50 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
              Organizational Concentration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl text-ink font-semibold tracking-tight">
            People & Teams
          </h1>
          <p className="text-sm text-ink-3 mt-1">
            Track asset ownership concentration, team coverage, and single-person bottlenecks.
          </p>
        </div>

        {/* Quick Person Search */}
        <div className="w-full sm:w-72">
          <PersonPicker
            onChange={(person) => {
              if (person) {
                router.push(`/people/${person.id}`);
              }
            }}
            placeholder="Search person directly..."
          />
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="search"
          placeholder="Filter teams by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Filter teams"
          className="w-full max-w-sm rounded-control border border-rule bg-surface px-3 py-1.5 text-xs text-ink placeholder:text-ink-3 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
        />

        <span className="text-xs text-ink-3 font-mono">
          Privacy floor: minimum {minGroupSize} members
        </span>
      </div>

      {/* Loading Skeleton */}
      {teamsResource.status === 'loading' && teamsData.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton variant="card" className="h-64" />
          <Skeleton variant="card" className="h-64" />
          <Skeleton variant="card" className="h-64" />
        </div>
      )}

      {/* Error State */}
      {teamsResource.status === 'error' && teamsData.length === 0 && (
        <ErrorState
          onRetry={teamsResource.reload}
          message="We couldn't load team concentration data."
          lastLoadedAt={teamsResource.lastLoadedAt || undefined}
        />
      )}

      {/* Empty State */}
      {teamsResource.status === 'ready' && filteredTeams.length === 0 && (
        <EmptyState
          title="No teams found"
          description={
            searchQuery
              ? `No teams match "${searchQuery}".`
              : 'Connect your directory provider (Microsoft Entra ID or Google Workspace) to view team concentration.'
          }
        />
      )}

      {/* Teams Grid */}
      {filteredTeams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => {
            const isTooSmall = team.rolledUp || team.memberCount < minGroupSize;

            const segments = [
              {
                count: team.coverage.covered,
                label: 'covered',
                colorClass: 'bg-st-pass',
              },
              {
                count: team.coverage.exposed,
                label: 'exposed',
                colorClass: 'bg-st-fail',
              },
              ...(team.coverage.unknown && team.coverage.unknown > 0
                ? [
                    {
                      count: team.coverage.unknown,
                      label: 'unknown',
                      colorClass: 'bg-st-unknown',
                    },
                  ]
                : []),
            ];

            return (
              <Card
                key={team.id}
                className={cn(
                  'flex flex-col justify-between p-6 shadow-xs transition-all hover:border-ink-3/40 bg-surface',
                  isTooSmall && 'opacity-90 bg-surface-sunken/30',
                )}
              >
                <div className="space-y-4">
                  {/* Team Title & Member Count */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/people/teams/${team.id}`}
                        className="text-xl sm:text-2xl text-ink font-semibold hover:text-amber-ink transition-colors"
                      >
                        {team.name}
                      </Link>
                      <p className="text-xs text-ink-3 mt-0.5 font-mono">
                        {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
                      </p>
                    </div>

                    {isTooSmall && (
                      <span className="text-[11px] px-2 py-0.5 rounded-badge bg-amber/15 text-amber-ink font-semibold whitespace-nowrap">
                        Rolled up
                      </span>
                    )}
                  </div>

                  {/* Too small privacy notice */}
                  {isTooSmall ? (
                    <div className="rounded-control bg-surface-sunken p-3 text-xs text-ink-3 border border-rule/60">
                      <p className="font-medium text-ink mb-0.5">Privacy Notice</p>
                      <p>
                        Too small to report separately (&lt;{minGroupSize} members) to preserve individual privacy. Assets roll up to parent department.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Concentration Sentence */}
                      {team.concentration && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-ink-3 uppercase font-mono">
                            Ownership Concentration
                          </p>
                          <p className="font-semibold text-base text-ink leading-snug">
                            {team.concentration.sentence}
                          </p>
                        </div>
                      )}

                      {/* Named Share Bar */}
                      {team.concentration && team.concentration.holders.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <NamedShareBar holders={team.concentration.holders} total={team.concentration.total} />
                        </div>
                      )}

                      {/* Coverage Bar */}
                      <div className="space-y-1.5 pt-2 border-t border-rule/40">
                        <div className="flex items-center justify-between text-xs text-ink-3 font-mono">
                          <span>Asset Coverage</span>
                          <span>
                            {team.coverage.covered} of {team.coverage.total} covered
                          </span>
                        </div>
                        <SegmentedBar total={team.coverage.total} segments={segments} />
                      </div>
                    </>
                  )}
                </div>

                {/* Footer link */}
                <div className="pt-6 border-t border-rule/40 mt-4 flex items-center justify-end">
                  <Link
                    href={`/people/teams/${team.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-ink hover:underline"
                  >
                    <span>View team roster</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
