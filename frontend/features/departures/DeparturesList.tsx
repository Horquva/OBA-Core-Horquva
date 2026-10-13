'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown, Plus, UserMinus, X } from 'lucide-react';
import type { DepartureStage, DepartureSummary, WorkAtRisk } from '@/types/view';
import { DEPARTURE_STAGES, STAGE_LABEL } from '@/types/view';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchDepartures, fetchWorkAtRisk } from '@/lib/api/departures';
import { formatDate, formatRelative } from '@/lib/format';
import { InitiateDepartureSideSheet } from './InitiateDepartureSideSheet';
import { STATUS_LABEL, STATUS_PILL, departureStatus, stepOf } from './departureStatus';
import { WorkAtRiskPanel } from './WorkAtRiskPanel';
import { HandoverPipeline } from './HandoverPipeline';
import { DepartureRowPreview } from './DepartureRowPreview';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session';
import { canInitiateDeparture } from '@/lib/permissions';

export interface DeparturesListProps {
  initialDepartures?: DepartureSummary[];
}

type Filter = 'all' | DepartureSummary['group'];

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'in_handover', label: 'In handover' },
  { id: 'departed', label: 'Departed' },
];

const SOON_DAYS = 30;

function Tile({ label, value, detail, tone }: { label: string; value: React.ReactNode; detail?: React.ReactNode; tone?: 'fail' }) {
  return (
    <div className="bg-surface px-6 py-4">
      <p className="type-meta text-ink-3">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tracking-tight', tone === 'fail' ? 'text-st-fail' : 'text-ink')}>{value}</p>
      {detail && <div className="type-meta mt-1 text-ink-3">{detail}</div>}
    </div>
  );
}

/** Five short segments: done, current (amber), still to come. */
function StageBar({ stage }: { stage: DepartureSummary['stage'] }) {
  const step = stepOf(stage);
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {DEPARTURE_STAGES.map((s, i) => (
        <span
          key={s}
          className={cn('h-1.5 w-4 rounded-full', i + 1 < step ? 'bg-st-pass' : i + 1 === step ? 'bg-amber' : 'bg-surface-sunken')}
        />
      ))}
    </div>
  );
}

export function DeparturesList({ initialDepartures }: DeparturesListProps) {
  const [isSideSheetOpen, setIsSideSheetOpen] = React.useState(false);
  const { session } = useSession();
  const canInitiate = canInitiateDeparture(session);
  const [filter, setFilter] = React.useState<Filter>('all');
  const [stageFilter, setStageFilter] = React.useState<DepartureStage | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const toggleRow = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const departuresResource = useResource<DepartureSummary[]>('departures-list', fetchDepartures);
  const atRiskResource = useResource<WorkAtRisk>('departures-at-risk', fetchWorkAtRisk);
  const departures = departuresResource.status === 'ready' ? departuresResource.data : initialDepartures;
  const loading = !departures && departuresResource.status === 'loading';
  const failed = !departures && departuresResource.status === 'error';

  const all = departures ?? [];
  const active = all.filter((d) => d.group !== 'departed');
  const counts: Record<Filter, number> = {
    all: all.length,
    upcoming: all.filter((d) => d.group === 'upcoming').length,
    in_handover: all.filter((d) => d.group === 'in_handover').length,
    departed: all.filter((d) => d.group === 'departed').length,
  };
  const soonCutoff = Date.now() + SOON_DAYS * 86_400_000;
  const leavingSoon = active.filter((d) => new Date(d.leaveDate).getTime() <= soonCutoff).length;
  const needSuccessor = active.filter((d) => d.hasAlert).length;
  const handedOver = active.reduce((n, d) => n + d.assetsHandedOver, 0);
  const toHandOver = active.reduce((n, d) => n + d.assetsTotal, 0);

  // Soonest first; people who already left go to the bottom, most recent first.
  const rows = all
    .filter((d) => (filter === 'all' || d.group === filter) && (!stageFilter || d.stage === stageFilter))
    .sort((a, b) => {
      if ((a.group === 'departed') !== (b.group === 'departed')) return a.group === 'departed' ? 1 : -1;
      const ta = new Date(a.leaveDate).getTime();
      const tb = new Date(b.leaveDate).getTime();
      return a.group === 'departed' ? tb - ta : ta - tb;
    });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <header className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="type-title text-ink">Departures</h1>
          <p className="mt-1 text-sm text-ink-2">Everyone leaving, and whether their critical work has a successor.</p>
        </div>
        {canInitiate && (
          <Button variant="primary" size="sm" onClick={() => setIsSideSheetOpen(true)} leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
            Record a departure
          </Button>
        )}
      </header>

      {failed && (
        <Panel className="p-5">
          <ErrorState onRetry={departuresResource.reload} message="We couldn't load departures." lastLoadedAt={departuresResource.lastLoadedAt || undefined} />
        </Panel>
      )}

      {loading && (
        <div className="space-y-6">
          <span className="skeleton block h-[104px] rounded-panel" />
          <span className="skeleton block h-64 rounded-panel" />
        </div>
      )}

      {departures && (
        <>
          {/* Summary */}
          <Panel className="grid grid-cols-2 gap-px overflow-hidden bg-rule lg:grid-cols-4">
            <Tile label={`Leaving in ${SOON_DAYS} days`} value={leavingSoon} />
            <Tile label="In handover" value={counts.in_handover} />
            <Tile
              label="Without an accepted successor"
              value={needSuccessor}
              tone={needSuccessor > 0 ? 'fail' : undefined}
              detail={needSuccessor > 0 ? 'Critical assets at risk' : 'Every critical asset is covered'}
            />
            <Tile
              label="Assets handed over"
              value={
                <span>
                  {handedOver}
                  <span className="text-base font-medium text-ink-3"> of {toHandOver}</span>
                </span>
              }
              detail={
                toHandOver > 0 ? (
                  <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <span className="block h-full rounded-full bg-st-pass" style={{ width: `${(handedOver / toHandOver) * 100}%` }} />
                  </span>
                ) : (
                  'Nothing to hand over'
                )
              }
            />
          </Panel>

          <WorkAtRiskPanel
            data={atRiskResource.status === 'ready' ? atRiskResource.data : atRiskResource.status === 'error' ? null : undefined}
            onRetry={atRiskResource.reload}
          />

          <HandoverPipeline departures={all} selected={stageFilter} onSelect={setStageFilter} />

          {/* All departures */}
          <Panel aria-labelledby="departures-table-heading">
            <PanelHeader titleId="departures-table-heading" title="All departures" icon={<UserMinus />} count={all.length} />

            <div role="group" aria-label="Filter departures" className="flex flex-wrap gap-1 border-b border-rule px-4 py-2.5">
              {FILTERS.map((f) => (
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
                  <span className="tabular-nums text-ink-3">{counts[f.id]}</span>
                </button>
              ))}
              {stageFilter && (
                <button
                  type="button"
                  onClick={() => setStageFilter(null)}
                  aria-label={`Clear step filter: ${STAGE_LABEL[stageFilter]}`}
                  className="type-meta ml-auto inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-rule px-3 font-medium text-ink-2 hover:text-ink"
                >
                  Step: {STAGE_LABEL[stageFilter]}
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {rows.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="type-heading text-ink">{all.length === 0 ? 'No departures yet' : 'Nothing here'}</p>
                <p className="type-meta mt-1 text-ink-3">
                  {all.length === 0 ? 'Departures appear here once HR or a manager records them, or your directory reports a leave date.' : 'No departures match this filter.'}
                </p>
                {all.length === 0 && canInitiate && (
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => setIsSideSheetOpen(true)}>
                    Record a departure
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="type-meta border-b border-rule text-ink-3">
                      <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Person</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Leaves</th>
                      <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">Stage</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Handover</th>
                      <th scope="col" className="py-2.5 pl-3 pr-3 font-medium">Status</th>
                      <th scope="col" className="w-12 py-2.5 pr-4">
                        <span className="sr-only">Show handover</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {rows.map((dep) => {
                      const status = departureStatus(dep);
                      const pct = dep.assetsTotal > 0 ? (dep.assetsHandedOver / dep.assetsTotal) * 100 : 0;
                      const left = dep.group === 'departed';
                      const open = expanded.has(dep.id);
                      return (
                        <React.Fragment key={dep.id}>
                        <tr className={cn('group relative transition-colors hover:bg-surface-sunken/50', left && 'text-ink-2', open && 'bg-surface-sunken/40')}>
                          <td className="py-3 pl-5 pr-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={dep.person.name} className={cn(left && 'opacity-60')} />
                              <div className="min-w-0">
                                {/* The name link covers the row, so the whole row opens the departure. */}
                                <Link
                                  href={`/departures/${dep.id}`}
                                  className={cn('text-sm font-medium after:absolute after:inset-0 after:content-[\'\']', left ? 'text-ink-2' : 'text-ink')}
                                >
                                  {dep.person.name}
                                </Link>
                                <p className="type-meta truncate text-ink-3">
                                  {[dep.role, dep.team].filter(Boolean).join(' · ') || 'Team member'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <time dateTime={dep.leaveDate} title={formatDate(dep.leaveDate)} className="text-sm text-ink">
                              {formatRelative(dep.leaveDate)}
                            </time>
                            <p className="type-meta text-ink-3">{formatDate(dep.leaveDate)}</p>
                          </td>
                          <td className="hidden px-3 py-3 md:table-cell">
                            <StageBar stage={dep.stage} />
                            <p className="type-meta mt-1.5 text-ink-3">{STAGE_LABEL[dep.stage]}</p>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex min-w-[8rem] items-center gap-2.5">
                              <span className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
                                <span className={cn('block h-full rounded-full', dep.hasAlert ? 'bg-amber' : 'bg-st-pass')} style={{ width: `${pct}%` }} />
                              </span>
                              <span className="type-meta whitespace-nowrap text-ink-2">
                                <span className="font-medium text-ink tabular-nums">
                                  {dep.assetsHandedOver} of {dep.assetsTotal}
                                </span>
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pl-3 pr-3">
                            <span className={cn('inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium', STATUS_PILL[status])}>
                              {STATUS_LABEL[status]}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            {/* Above the row-wide link, so it expands instead of navigating. */}
                            <button
                              type="button"
                              onClick={() => toggleRow(dep.id)}
                              aria-expanded={open}
                              aria-label={`${open ? 'Hide' : 'Show'} ${dep.person.name}'s handover`}
                              className="relative z-10 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-control text-ink-3 transition-colors hover:bg-surface hover:text-ink"
                            >
                              <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                        {open && (
                          <tr>
                            <td colSpan={6} className="bg-surface-sunken/40 px-5 pb-4 pt-1">
                              <DepartureRowPreview id={dep.id} name={dep.person.name} />
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
        </>
      )}

      <InitiateDepartureSideSheet open={isSideSheetOpen} onClose={() => setIsSideSheetOpen(false)} onSuccess={() => departuresResource.reload()} />
    </div>
  );
}
