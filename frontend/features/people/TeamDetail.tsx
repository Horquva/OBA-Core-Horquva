'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ShieldCheck, UsersRound, Waypoints } from 'lucide-react';
import type { TeamDetail as TeamDetailType } from '@/types/view';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { NamedShareBar } from '@/components/ui/bars';
import { ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchTeam } from '@/lib/api/people';
import { cn } from '@/lib/cn';
import { CoverageBar, TeamStatusPill, holdingCounts } from './peopleFacts';
import { HoldingsTable } from './HoldingsTable';

/** Must match the backend's privacy floor default (organization.minGroupSize). */
const DEFAULT_MIN_GROUP = 5;

export interface TeamDetailProps {
  id: string;
  initialDetail?: TeamDetailType;
}

export function TeamDetail({ id, initialDetail }: TeamDetailProps) {
  const teamResource = useResource<TeamDetailType>(`team-detail-${id}`, () => fetchTeam(id));
  const detail = teamResource.status === 'ready' ? teamResource.data : initialDetail;

  // Alphabetical only: members are never ordered by what they hold.
  const members = React.useMemo(
    () => (detail?.members ? [...detail.members].sort((a, b) => a.person.name.localeCompare(b.person.name)) : []),
    [detail?.members],
  );
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const toggle = (pid: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });

  if (teamResource.status === 'loading' && !detail) {
    return (
      <div className="space-y-6 pb-16" aria-label="Loading team">
        <span className="skeleton block h-4 w-28" />
        <span className="skeleton block h-16 w-1/2" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <span className="skeleton block h-44 rounded-panel" />
          <span className="skeleton block h-44 rounded-panel" />
        </div>
        <span className="skeleton block h-96 rounded-panel" />
      </div>
    );
  }

  if (teamResource.status === 'error' && !detail) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Panel className="p-5">
          <ErrorState onRetry={teamResource.reload} message="We couldn't load this team." lastLoadedAt={teamResource.lastLoadedAt || undefined} />
        </Panel>
      </div>
    );
  }

  if (!detail) return null;
  const { team } = detail;
  const { coverage } = team;
  const unknown = coverage.unknown ?? 0;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="space-y-4 pt-2">
        <Link href="/people" className="type-meta inline-flex items-center gap-1.5 font-medium text-ink-3 transition-colors hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          People &amp; Teams
        </Link>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="type-title text-ink">{team.name}</h1>
              <TeamStatusPill team={team} minGroupSize={DEFAULT_MIN_GROUP} />
            </div>
            <p className="mt-1 text-sm text-ink-2">
              {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
              {!team.rolledUp && coverage.total > 0 && ` · ${coverage.covered} of ${coverage.total} critical assets have a backup`}
            </p>
          </div>
        </header>
      </div>

      {/* Coverage + concentration, equal height */}
      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
        <Panel aria-labelledby="team-coverage-heading" className="flex flex-col">
          <PanelHeader titleId="team-coverage-heading" title="Coverage" icon={<ShieldCheck />} description="Critical and high assets this team's members own." />
          <div className="flex flex-1 flex-col justify-center px-5 py-5">
            {coverage.total === 0 ? (
              <p className="type-meta text-ink-3">This team owns no critical assets.</p>
            ) : (
              <>
                <p className="text-[15px] font-medium text-ink">
                  <span className="text-2xl font-semibold tracking-tight tabular-nums">{coverage.covered}</span>
                  <span className="text-ink-3"> of {coverage.total} have a backup on record</span>
                </p>
                <CoverageBar coverage={coverage} className="mt-3 h-2" />
                <ul className="type-meta mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-ink-2">
                  <li className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-st-pass" /> Covered
                    <span className="font-medium tabular-nums text-ink">{coverage.covered}</span>
                  </li>
                  {unknown > 0 && (
                    <li className="inline-flex items-center gap-1.5">
                      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-st-unknown" /> Unknown
                      <span className="font-medium tabular-nums text-ink">{unknown}</span>
                    </li>
                  )}
                  <li className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-st-fail" /> No backup
                    <span className="font-medium tabular-nums text-ink">{Math.max(0, coverage.exposed - unknown)}</span>
                  </li>
                </ul>
              </>
            )}
          </div>
        </Panel>

        <Panel aria-labelledby="team-concentration-heading" className="flex flex-col">
          <PanelHeader titleId="team-concentration-heading" title="Who holds the critical work" icon={<Waypoints />} description="Counts of critical assets owned, not a ranking." />
          <div className="flex flex-1 flex-col justify-center px-5 py-5">
            {team.rolledUp ? (
              <p className="type-meta text-ink-3">Not shown: this team is under {DEFAULT_MIN_GROUP} members, so no per-person breakdown is reported.</p>
            ) : team.concentration ? (
              <>
                <p className="text-[15px] font-medium leading-snug text-ink">{team.concentration.sentence}</p>
                <NamedShareBar className="mt-4" holders={team.concentration.holders} total={team.concentration.total} />
              </>
            ) : (
              <p className="type-meta text-ink-3">Nobody on this team owns a critical asset.</p>
            )}
          </div>
        </Panel>
      </div>

      {/* Roster */}
      <Panel aria-labelledby="roster-heading">
        <PanelHeader
          titleId="roster-heading"
          title="Members"
          icon={<UsersRound />}
          count={team.rolledUp ? undefined : members.length}
          description="Listed alphabetically. Open a row to see what they hold."
        />
        {team.rolledUp ? (
          <div className="px-5 py-12 text-center">
            <p className="type-heading text-ink">Rolled up for privacy</p>
            <p className="type-meta mx-auto mt-1 max-w-sm text-ink-3">
              Teams under {DEFAULT_MIN_GROUP} members show no per-person view. Their assets count toward the organisation totals.
            </p>
          </div>
        ) : members.length === 0 ? (
          <p className="type-meta px-5 py-10 text-center text-ink-3">No members on record.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="type-meta border-b border-rule text-ink-3">
                  <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Person</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Owns</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Backs up</th>
                  <th scope="col" className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">On their credentials</th>
                  <th scope="col" className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">No backup</th>
                  <th scope="col" className="w-12 py-2.5 pr-4">
                    <span className="sr-only">Show holdings</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {members.map((member) => {
                  const c = holdingCounts(member.holdings);
                  const open = expanded.has(member.person.id);
                  return (
                    <React.Fragment key={member.person.id}>
                      <tr className={cn('transition-colors hover:bg-surface-sunken/50', open && 'bg-surface-sunken/40')}>
                        <td className="py-3 pl-5 pr-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={member.person.name} size={32} />
                            <div className="min-w-0">
                              <Link href={`/people/${member.person.id}`} className="text-sm font-medium text-ink transition-colors hover:text-amber-ink">
                                {member.person.name}
                              </Link>
                              <p className="truncate text-[11px] text-ink-3">{member.title ?? 'Title not on record'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-sm tabular-nums text-ink">{c.owns}</td>
                        <td className="px-3 py-3 text-right text-sm tabular-nums text-ink">{c.backsUp}</td>
                        <td className={cn('hidden px-3 py-3 text-right text-sm tabular-nums sm:table-cell', c.credential > 0 ? 'font-medium text-amber-ink' : 'text-ink-3')}>
                          {c.credential}
                        </td>
                        <td className={cn('hidden px-3 py-3 text-right text-sm tabular-nums sm:table-cell', c.noBackup > 0 ? 'font-medium text-st-fail' : 'text-ink-3')}>
                          {c.noBackup}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <button
                            type="button"
                            onClick={() => toggle(member.person.id)}
                            aria-expanded={open}
                            aria-label={`${open ? 'Hide' : 'Show'} ${member.person.name}'s holdings`}
                            disabled={member.holdings.length === 0}
                            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-control text-ink-3 transition-colors hover:bg-surface hover:text-ink disabled:cursor-default disabled:opacity-30"
                          >
                            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={6} className="bg-surface-sunken/40 px-5 pb-4 pt-1">
                            <div className="overflow-hidden rounded-control border border-rule bg-surface">
                              <HoldingsTable holdings={member.holdings} label={`${member.person.name}'s holdings`} compact />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
