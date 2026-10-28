'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, UsersRound, Waypoints } from 'lucide-react';
import type { TeamSummary } from '@/types/view';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { NamedShareBar } from '@/components/ui/bars';
import { ErrorState } from '@/components/ui/states';
import { PersonPicker } from '@/components/ui/PersonPicker';
import { useResource } from '@/lib/useResource';
import { fetchTeams } from '@/lib/api/people';
import { cn } from '@/lib/cn';
import { CoverageBar, StatTile, TeamStatusPill, isConcentrated, majority } from './peopleFacts';

export interface PeopleViewProps {
  initialTeams?: TeamSummary[];
  minGroupSize?: number;
}

export function PeopleView({ initialTeams, minGroupSize: initialMinSize = 5 }: PeopleViewProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');

  const teamsResource = useResource<{ teams: TeamSummary[]; minGroupSize: number }>('people-teams-list', fetchTeams);
  const teams = teamsResource.status === 'ready' ? teamsResource.data.teams : initialTeams || [];
  const minGroupSize = teamsResource.status === 'ready' ? teamsResource.data.minGroupSize : initialMinSize;
  const loading = teamsResource.status === 'loading' && teams.length === 0;

  // Alphabetical only: teams are never ordered by how exposed they are.
  const sorted = React.useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name)), [teams]);
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? sorted.filter((t) => t.name.toLowerCase().includes(q)) : sorted;
  }, [sorted, query]);

  const totals = teams.reduce(
    (acc, t) => ({
      members: acc.members + t.memberCount,
      covered: acc.covered + t.coverage.covered,
      critical: acc.critical + t.coverage.total,
      exposed: acc.exposed + t.coverage.exposed,
    }),
    { members: 0, covered: 0, critical: 0, exposed: 0 },
  );
  const concentrated = sorted.filter(isConcentrated);

  return (
    <div className="space-y-6 pb-16">
      <header className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="type-title text-ink">People &amp; Teams</h1>
          <p className="mt-1 text-sm text-ink-2">Who holds each team&apos;s critical work, and whether it has a backup.</p>
        </div>
        <div className="w-full sm:w-72">
          <PersonPicker onChange={(person) => person && router.push(`/people/${person.id}`)} placeholder="Find a person…" />
        </div>
      </header>

      {teamsResource.status === 'error' && teams.length === 0 && (
        <Panel className="p-5">
          <ErrorState onRetry={teamsResource.reload} message="We couldn't load teams." lastLoadedAt={teamsResource.lastLoadedAt || undefined} />
        </Panel>
      )}

      {loading && (
        <div className="space-y-6" aria-label="Loading teams">
          <span className="skeleton block h-24 rounded-panel" />
          <span className="skeleton block h-80 rounded-panel" />
        </div>
      )}

      {!loading && !(teamsResource.status === 'error' && teams.length === 0) && (
        <>
          {/* Summary */}
          <Panel className="grid grid-cols-2 gap-px overflow-hidden bg-rule lg:grid-cols-5">
            <StatTile label="Teams" value={teams.length} />
            <StatTile label="Team members" value={totals.members} />
            <StatTile
              label="Critical assets covered"
              value={
                <span>
                  {totals.covered}
                  <span className="text-base font-medium text-ink-3"> of {totals.critical}</span>
                </span>
              }
            />
            <StatTile label="Without a backup" value={totals.exposed} tone={totals.exposed > 0 ? 'fail' : undefined} />
            <StatTile
              label="Mostly held by one person"
              value={concentrated.length}
              tone={concentrated.length > 0 ? 'warn' : undefined}
            />
          </Panel>

          {/* Concentration */}
          <Panel aria-labelledby="concentration-heading">
            <PanelHeader
              titleId="concentration-heading"
              title="Where one person holds most of a team's critical work"
              icon={<Waypoints />}
              count={concentrated.length}
              description="If that person is away or leaves, most of the team's critical assets go with them."
            />
            {concentrated.length === 0 ? (
              <p className="type-meta px-5 py-6 text-ink-3">No team relies on one person for most of its critical assets.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-px bg-rule md:grid-cols-2">
                {concentrated.map((t) => (
                  <li key={t.id} className="bg-surface px-5 py-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link href={`/people/teams/${t.id}`} className="text-sm font-medium text-ink transition-colors hover:text-amber-ink">
                        {t.name}
                      </Link>
                      <span className="type-meta text-ink-3">{t.memberCount} members</span>
                    </div>
                    <p className="type-meta mt-1 text-ink-2">{t.concentration!.sentence}</p>
                    <NamedShareBar className="mt-3" holders={t.concentration!.holders} total={t.concentration!.total} />
                  </li>
                ))}
                {concentrated.length % 2 === 1 && <li aria-hidden="true" className="hidden bg-surface md:block" />}
              </ul>
            )}
          </Panel>

          {/* Teams */}
          <Panel aria-labelledby="teams-heading">
            <PanelHeader
              titleId="teams-heading"
              title="Teams"
              icon={<UsersRound />}
              count={teams.length}
              description={`Listed alphabetically. Teams under ${minGroupSize} members roll up to protect privacy.`}
            />
            <div className="border-b border-rule px-5 py-3">
                <label className="relative block w-full sm:w-64">
                  <span className="sr-only">Filter teams</span>
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" aria-hidden="true" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter teams"
                    className="type-meta h-8 w-full rounded-control border border-rule bg-surface pl-8 pr-2.5 text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none"
                  />
                </label>
            </div>

            {filtered.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="type-heading text-ink">{query ? 'No teams match' : 'No teams yet'}</p>
                <p className="type-meta mt-1 text-ink-3">
                  {query
                    ? `Nothing matches "${query}".`
                    : "Teams come from directory groups, which aren't connected yet."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="type-meta border-b border-rule text-ink-3">
                      <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Team</th>
                      <th scope="col" className="w-[30%] px-3 py-2.5 font-medium">Critical assets with a backup</th>
                      <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">Who holds them</th>
                      <th scope="col" className="py-2.5 pl-3 pr-5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {filtered.map((t) => {
                      const rolled = t.rolledUp || t.memberCount < minGroupSize;
                      const m = majority(t.concentration);
                      return (
                        <tr key={t.id} className={cn('group relative transition-colors hover:bg-surface-sunken/50', rolled && 'text-ink-3')}>
                          <td className="py-3.5 pl-5 pr-3">
                            <Link
                              href={`/people/teams/${t.id}`}
                              className={cn("text-sm font-medium after:absolute after:inset-0 after:content-['']", rolled ? 'text-ink-2' : 'text-ink')}
                            >
                              {t.name}
                            </Link>
                            <p className="text-[11px] text-ink-3">
                              {t.memberCount} {t.memberCount === 1 ? 'member' : 'members'}
                            </p>
                          </td>
                          <td className="px-3 py-3.5">
                            {rolled ? (
                              <span className="type-meta text-ink-3">Not shown separately (under {minGroupSize} members)</span>
                            ) : t.coverage.total === 0 ? (
                              <span className="type-meta text-ink-3">No critical assets</span>
                            ) : (
                              <div className="max-w-xs">
                                <p className="type-meta text-ink">
                                  <span className="font-medium tabular-nums">{t.coverage.covered}</span>
                                  <span className="text-ink-3"> of {t.coverage.total} covered</span>
                                </p>
                                <CoverageBar coverage={t.coverage} className="mt-1.5" />
                              </div>
                            )}
                          </td>
                          <td className="hidden px-3 py-3.5 md:table-cell">
                            {rolled || !m ? (
                              <span className="type-meta text-ink-3">—</span>
                            ) : (
                              <p className="type-meta text-ink-2">
                                {m.people === 1 ? (
                                  <span className="font-medium text-amber-ink">Mostly one person</span>
                                ) : (
                                  <span>Spread across {m.people} people</span>
                                )}
                                <span className="block text-[11px] text-ink-3">
                                  {m.people === 1 ? 'holds' : 'hold'} {m.held} of {m.total} critical
                                </span>
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 pl-3 pr-5">
                            <TeamStatusPill team={t} minGroupSize={minGroupSize} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
