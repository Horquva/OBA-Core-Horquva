'use client';

import * as React from 'react';
import Link from 'next/link';
import type { TeamDetail as TeamDetailType, TeamMember } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { NamedShareBar } from '@/components/ui/bars';
import { CoverageStrip } from '@/components/ui/CoverageStrip';
import { CriticalityDots, EvidenceBadge, NoneValue, UnknownValue } from '@/components/ui/marks';
import { Skeleton, ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchTeam } from '@/lib/api/people';
import { cn } from '@/lib/cn';

export interface TeamDetailProps {
  id: string;
  initialDetail?: TeamDetailType;
}

export function TeamDetail({ id, initialDetail }: TeamDetailProps) {
  const teamResource = useResource<TeamDetailType>(
    `team-detail-${id}`,
    () => fetchTeam(id),
  );

  const detail =
    teamResource.status === 'ready'
      ? teamResource.data
      : initialDetail;

  // Strict Invariant: Alphabetical sort ONLY by member name
  const sortedMembers = React.useMemo(() => {
    if (!detail?.members) return [];
    return [...detail.members].sort((a, b) =>
      a.person.name.localeCompare(b.person.name),
    );
  }, [detail?.members]);

  const [expandedMemberId, setExpandedMemberId] = React.useState<string | null>(null);

  if (teamResource.status === 'loading' && !detail) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        <Skeleton variant="text" className="w-1/4 h-5" />
        <Skeleton variant="card" className="h-48" />
        <Skeleton variant="card" className="h-96" />
      </div>
    );
  }

  if (teamResource.status === 'error' && !detail) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <ErrorState
          onRetry={teamResource.reload}
          message="We couldn't load this team's details."
          lastLoadedAt={teamResource.lastLoadedAt || undefined}
        />
      </div>
    );
  }

  if (!detail) return null;

  const { team } = detail;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header & Back Link */}
      <div className="space-y-4">
        <Link
          href="/people"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-ink transition-colors"
        >
          <span aria-hidden="true">←</span>
          <span>Back to Teams</span>
        </Link>

        <div className="space-y-2 border-b border-rule/50 pb-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
              Team Holdings
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl text-ink font-semibold tracking-tight">
                {team.name}
              </h1>
              <p className="text-xs text-ink-3 mt-1 font-mono">
                {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'} · Listed alphabetically
              </p>
            </div>

            {team.rolledUp && (
              <span className="px-2.5 py-1 rounded-badge bg-amber/15 text-amber-ink text-xs font-semibold self-start sm:self-auto">
                Rolled Up Team (&lt;5 members)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Coverage & Concentration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <CoverageStrip metrics={team.coverage} />

        {team.concentration ? (
          <Card className="p-6 space-y-4 shadow-card bg-surface">
            <div className="space-y-1">
              <h2 className="text-xs font-semibold text-ink-3 uppercase font-mono">
                Team Concentration
              </h2>
              <p className="font-semibold text-xl text-ink leading-snug">
                {team.concentration.sentence}
              </p>
            </div>

            {team.concentration.holders.length > 0 && (
              <div className="pt-2">
                <NamedShareBar holders={team.concentration.holders} total={team.concentration.total} />
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-6 space-y-2 bg-surface">
            <h2 className="text-xs font-semibold text-ink-3 uppercase font-mono">
              Team Concentration
            </h2>
            <p className="text-xs text-ink-3">
              No single operator holds a disproportionate share of critical assets on this team.
            </p>
          </Card>
        )}
      </div>

      {/* Team Roster (ALPHABETICAL ONLY) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Team Members</h2>
            <p className="text-xs text-ink-3">
              Members are displayed in alphabetical order to eliminate subjective employee scoring.
            </p>
          </div>
          <span className="text-xs text-ink-3 font-mono">
            {sortedMembers.length} members
          </span>
        </div>

        <div className="space-y-3">
          {sortedMembers.map((member) => {
            const initials = member.person.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            const owned = member.holdings.filter((h) => h.relation === 'owns');
            const backups = member.holdings.filter((h) => h.relation === 'backs_up');
            const credentials = member.holdings.filter((h) => h.relation === 'credential');

            const isExpanded = expandedMemberId === member.person.id;

            return (
              <Card
                key={member.person.id}
                className="p-5 bg-surface transition-colors hover:border-ink-3/40"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Identity */}
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-full bg-surface-sunken border border-rule text-base font-semibold flex items-center justify-center text-ink shrink-0">
                      {initials}
                    </span>

                    <div>
                      <Link
                        href={`/people/${member.person.id}`}
                        className="text-lg font-semibold text-ink hover:text-amber-ink transition-colors"
                      >
                        {member.person.name}
                      </Link>
                      <p className="text-xs text-ink-3">
                        {member.title ?? 'Title not on record'}
                      </p>
                    </div>
                  </div>

                  {/* Holdings Summary & Toggle */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded-badge bg-surface-sunken text-ink">
                        <strong>{owned.length}</strong> owned
                      </span>
                      <span className="px-2 py-0.5 rounded-badge bg-surface-sunken text-ink-2">
                        <strong>{backups.length}</strong> backups
                      </span>
                      {credentials.length > 0 && (
                        <span className="px-2 py-0.5 rounded-badge bg-amber/15 text-amber-ink font-semibold">
                          <strong>{credentials.length}</strong> credentials
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedMemberId(isExpanded ? null : member.person.id)
                      }
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? 'Hide' : 'View'} holdings for ${member.person.name}`}
                      className="text-xs font-semibold text-ink-3 hover:text-ink cursor-pointer underline decoration-rule hover:decoration-ink"
                    >
                      {isExpanded ? 'Hide holdings' : 'View holdings'}
                    </button>

                  </div>
                </div>

                {/* Expanded Holdings Table */}
                {isExpanded && member.holdings.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-rule/50 overflow-x-auto">
                    <table className="w-full text-left text-xs text-ink">
                      <thead className="border-b border-rule font-mono text-[11px] uppercase text-ink-3">
                        <tr>
                          <th scope="col" className="pb-2">Asset</th>
                          <th scope="col" className="pb-2">Relation</th>
                          <th scope="col" className="pb-2">Criticality</th>
                          <th scope="col" className="pb-2">Backup Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule font-sans">
                        {member.holdings.map((h) => (
                          <tr key={h.asset.id} className="hover:bg-surface-sunken/40">
                            <td className="py-2.5 font-medium">
                              <Link
                                href={`/assets/${h.asset.id}`}
                                className="text-ink hover:text-amber-ink transition-colors font-semibold"
                              >
                                {h.asset.name}
                              </Link>
                            </td>

                            <td className="py-2.5 whitespace-nowrap">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-badge text-[11px] font-mono',
                                  h.relation === 'owns' && 'bg-bronze/10 text-bronze',
                                  h.relation === 'backs_up' && 'bg-st-pass/10 text-st-pass',
                                  h.relation === 'credential' && 'bg-amber/15 text-amber-ink font-semibold',
                                )}
                              >
                                {h.relation === 'owns'
                                  ? 'Owner'
                                  : h.relation === 'backs_up'
                                  ? 'Backup'
                                  : 'Credential'}
                              </span>
                            </td>

                            <td className="py-2.5 whitespace-nowrap">
                              <CriticalityDots level={h.criticality} />
                            </td>

                            <td className="py-2.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <EvidenceBadge grade={h.backup.grade} />
                                {h.backup.state === 'none' ? (
                                  <NoneValue />
                                ) : h.backup.state === 'unknown' ? (
                                  <UnknownValue />
                                ) : (
                                  <span className="text-ink-2">{h.backup.display || 'None'}</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
