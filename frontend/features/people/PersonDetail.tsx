'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowRightLeft, Boxes, CalendarDays, ClipboardCheck } from 'lucide-react';
import type { DepartureSummary, PersonDetail as PersonDetailType } from '@/types/view';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchPerson } from '@/lib/api/people';
import { fetchDepartures } from '@/lib/api/departures';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { StatTile, holdingCounts } from './peopleFacts';
import { HoldingsTable } from './HoldingsTable';

type RelationFilter = 'all' | 'owns' | 'backs_up' | 'credential';

export interface PersonDetailProps {
  id: string;
  initialDetail?: PersonDetailType;
}

export function PersonDetail({ id, initialDetail }: PersonDetailProps) {
  const personResource = useResource<PersonDetailType>(`person-detail-${id}`, () => fetchPerson(id));
  // Same cache key as the departures list, so it's usually already loaded.
  const departuresResource = useResource<DepartureSummary[]>('departures-list', fetchDepartures);
  const detail = personResource.status === 'ready' ? personResource.data : initialDetail;
  const [filter, setFilter] = React.useState<RelationFilter>('all');

  if (personResource.status === 'loading' && !detail) {
    return (
      <div className="space-y-6 pb-16" aria-label="Loading person">
        <span className="skeleton block h-4 w-28" />
        <span className="skeleton block h-16 w-1/2" />
        <span className="skeleton block h-24 rounded-panel" />
        <span className="skeleton block h-96 rounded-panel" />
      </div>
    );
  }

  if (personResource.status === 'error' && !detail) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Panel className="p-5">
          <ErrorState onRetry={personResource.reload} message="We couldn't load this person." lastLoadedAt={personResource.lastLoadedAt || undefined} />
        </Panel>
      </div>
    );
  }

  if (!detail) return null;

  const c = holdingCounts(detail.holdings);
  const firstName = detail.person.name.split(' ')[0];
  const leaving =
    departuresResource.status === 'ready'
      ? departuresResource.data.find((d) => d.person.id === detail.person.id && d.stage !== 'verified') ?? null
      : null;
  const filters: Array<{ id: RelationFilter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: detail.holdings.length },
    { id: 'owns', label: 'Owner', count: c.owns },
    { id: 'backs_up', label: 'Backup', count: c.backsUp },
    { id: 'credential', label: 'Their credentials', count: c.credential },
  ];
  const shown = filter === 'all' ? detail.holdings : detail.holdings.filter((h) => h.relation === filter);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="space-y-4 pt-2">
        <Link href="/people" className="type-meta inline-flex items-center gap-1.5 font-medium text-ink-3 transition-colors hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          People &amp; Teams
        </Link>
        <header className="flex items-center gap-4">
          <Avatar name={detail.person.name} size={56} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="type-title text-ink">{detail.person.name}</h1>
              {leaving && (
                <Link
                  href={`/departures/${leaving.id}`}
                  className="type-meta inline-flex h-6 items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--amber)_16%,transparent)] px-2.5 font-medium text-amber-ink transition-opacity hover:opacity-80"
                >
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {new Date(leaving.leaveDate) < new Date() ? 'Left' : 'Leaving'} {formatDate(leaving.leaveDate)}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              )}
            </div>
            <p className="mt-0.5 text-sm text-ink-2">
              {detail.title ?? 'Title not on record'}
              {detail.team && (
                <>
                  {' · '}
                  <Link href={`/people/teams/${detail.team.id}`} className="text-ink transition-colors hover:text-amber-ink">
                    {detail.team.name}
                  </Link>
                </>
              )}
            </p>
          </div>
        </header>
      </div>

      {/* Counted holdings */}
      <Panel className="grid grid-cols-2 gap-px overflow-hidden bg-rule lg:grid-cols-4">
        <StatTile label="Owns" value={c.owns} />
        <StatTile label="Backs up" value={c.backsUp} />
        <StatTile label="Runs on their credentials" value={c.credential} tone={c.credential > 0 ? 'warn' : undefined} detail={c.credential > 0 ? 'Stops if their account is disabled' : undefined} />
        <StatTile label="No backup on record" value={c.noBackup} tone={c.noBackup > 0 ? 'fail' : undefined} detail={c.noBackup > 0 ? `Only ${firstName} on record` : undefined} />
      </Panel>

      {/* Holdings + side panels, equal height */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        <Panel aria-labelledby="holdings-heading" className="flex flex-col lg:col-span-8">
          <PanelHeader
            titleId="holdings-heading"
            title="What they hold"
            icon={<Boxes />}
            count={detail.holdings.length}
            description={`Assets ${firstName} owns, backs up, or that run on their credentials.`}
          />
          <div className="flex flex-wrap gap-1.5 border-b border-rule px-5 py-3" role="group" aria-label="Filter by role">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'type-meta inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-3 font-medium transition-colors',
                  filter === f.id ? 'bg-surface-sunken text-ink' : 'text-ink-3 hover:text-ink',
                )}
              >
                {f.label}
                <span className="tabular-nums text-ink-3">{f.count}</span>
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-5 py-12 text-center">
              <p className="type-meta text-ink-3">{detail.holdings.length === 0 ? `${firstName} holds no tracked assets.` : 'Nothing in this view.'}</p>
            </div>
          ) : (
            <div className="flex-1">
              <HoldingsTable holdings={shown} label="Holdings table" />
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <Panel aria-labelledby="taking-over-heading">
            <PanelHeader
              titleId="taking-over-heading"
              title="Asked to take over"
              icon={<ArrowRightLeft />}
              count={detail.openHandovers.length}
              description="Handovers waiting for them to accept."
            />
            {detail.openHandovers.length === 0 ? (
              <p className="type-meta px-5 py-5 text-ink-3">Nothing waiting for {firstName}.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {detail.openHandovers.map((ho) => (
                  <li key={ho.departureId}>
                    <Link href={`/departures/${ho.departureId}`} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-sunken/50">
                      <Avatar name={ho.from.name} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="type-meta truncate font-medium text-ink">From {ho.from.name}</p>
                        <p className="text-[11px] text-ink-3">
                          {ho.assetCount} {ho.assetCount === 1 ? 'asset' : 'assets'} to accept
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-ink-3 transition-colors group-hover:text-ink" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel aria-labelledby="confirmations-heading" className="flex flex-1 flex-col">
            <PanelHeader titleId="confirmations-heading" title="Confirmations" icon={<ClipboardCheck />} description="Ownership and backup facts they're asked to confirm." />
            <div className="flex flex-1 flex-col justify-center px-5 py-5">
              {detail.pendingConfirmations === null ? (
                <p className="type-meta text-ink-3">
                  Not counted on this page yet.{' '}
                  <Link href="/actions" className="font-medium text-ink-2 hover:text-ink">
                    See Actions
                  </Link>
                </p>
              ) : detail.pendingConfirmations > 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="type-meta text-ink-2">
                    <span className="text-2xl font-semibold tracking-tight text-ink tabular-nums">{detail.pendingConfirmations}</span> waiting on {firstName}
                  </p>
                  <Link href="/actions" className="type-meta inline-flex items-center gap-1 font-medium text-ink-2 hover:text-ink">
                    Open Actions <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <p className="type-meta text-ink-3">Everything they were asked to confirm is confirmed.</p>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <p className="type-meta text-center text-ink-3">
        OBA shows only counted assets and backups on record. People are never scored or ranked.
      </p>
    </div>
  );
}
