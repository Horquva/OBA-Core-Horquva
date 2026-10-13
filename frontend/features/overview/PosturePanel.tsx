'use client';

import * as React from 'react';
import Link from 'next/link';
import { Panel } from '@/components/ui/Panel';
import { ShieldCheck } from 'lucide-react';
import { CoverageHistoryChart, type HistoryRange } from './CoverageHistoryChart';
import { useResource } from '@/lib/useResource';
import { fetchCoverageHistory } from '@/lib/api/overview';
import { cn } from '@/lib/cn';
import type { DepartureSummary, HistoryPoint, OverviewCoverage } from '@/types/view';

export interface PosturePanelProps {
  coverage: OverviewCoverage;
  /** undefined = loading, null = failed to load. */
  departures?: DepartureSummary[] | null;
  className?: string;
}

/** 'YYYY-MM-DD' as a local calendar date, e.g. "Oct 6". */
function shortDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(y, m - 1, d));
}

/** A counted change as a tinted badge, coloured by whether that direction is good for this measure. */
function Delta({ value, goodWhen, className }: { value: number; goodWhen: 'up' | 'down'; className?: string }) {
  const base = 'inline-flex h-5 items-center gap-0.5 rounded-full px-1.5 text-xs font-medium tabular-nums';
  if (value === 0) return <span className={cn(base, 'bg-surface-sunken text-ink-3', className)}>No change</span>;
  const good = goodWhen === 'up' ? value > 0 : value < 0;
  return (
    <span
      className={cn(
        base,
        good
          ? 'bg-[color-mix(in_srgb,var(--st-pass)_13%,transparent)] text-st-pass'
          : 'bg-[color-mix(in_srgb,var(--st-fail)_12%,transparent)] text-st-fail',
        className,
      )}
    >
      <span aria-hidden="true">{value > 0 ? '↑' : '↓'}</span>
      {value > 0 ? '+' : '−'}
      {Math.abs(value)}
    </span>
  );
}

/** "Delta badge · since Oct 6", or the fallback text before a week of history exists. */
function SinceLine({ value, goodWhen, since, fallback }: { value?: number; goodWhen: 'up' | 'down'; since: string | null; fallback: string }) {
  if (value === undefined || !since) return <>{fallback}</>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Delta value={value} goodWhen={goodWhen} />
      <span>since {since}</span>
    </span>
  );
}

interface TileProps {
  label: string;
  value: React.ReactNode;
  /** Right of the value: a sparkline or a small meter. */
  aside?: React.ReactNode;
  detail: React.ReactNode;
  href: string;
}

function Tile({ label, value, aside, detail, href }: TileProps) {
  return (
    <Link href={href} className="group block px-6 py-4 transition-colors hover:bg-surface-sunken/50 focus-visible:bg-surface-sunken/50">
      <div className="flex items-center justify-between">
        <span className="type-meta text-ink-3">{label}</span>
        <span aria-hidden="true" className="type-meta text-ink-3 opacity-0 transition-opacity group-hover:opacity-100">→</span>
      </div>
      <div className="mt-1 flex h-8 items-center justify-between gap-4">
        <span className="text-2xl font-semibold tracking-tight text-ink">{value}</span>
        {aside}
      </div>
      <div className="type-meta mt-1.5 text-ink-3">{detail}</div>
    </Link>
  );
}

export function PosturePanel({ coverage: c, departures, className }: PosturePanelProps) {
  const [showDefinition, setShowDefinition] = React.useState(false);
  const definitionId = React.useId();
  const trend = c.trend;
  const since = trend ? shortDate(trend.comparedTo) : null;

  const unknownCount = c.unknown ?? 0;
  const segments = [
    { key: 'covered', count: c.covered, label: 'covered', color: 'bg-st-pass' },
    { key: 'exposed', count: c.exposed, label: 'exposed', color: 'bg-st-fail' },
    { key: 'unknown', count: unknownCount, label: 'unknown', color: 'bg-st-unknown' },
  ];

  const active = departures ? departures.filter((d) => d.group !== 'departed') : null;
  const needSuccessor = active ? active.filter((d) => d.hasAlert).length : 0;
  const handedOver = active ? active.reduce((n, d) => n + d.assetsHandedOver, 0) : 0;
  const toHandOver = active ? active.reduce((n, d) => n + d.assetsTotal, 0) : 0;

  // Coverage history for the chart; the range toggle lives in the chart.
  const [range, setRange] = React.useState<HistoryRange>(30);
  const history = useResource<HistoryPoint[]>(`overview-history-${range}`, () => fetchCoverageHistory(range));
  // Keep the previous line on screen while a new range loads.
  const points = history.status === 'ready' ? history.data : history.lastData;

  return (
    <Panel className={className} aria-labelledby="posture-heading">
      <div className="grid grid-cols-1 gap-8 px-6 pb-5 pt-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center justify-between gap-4">
            <span className="type-meta inline-flex items-center gap-1.5 font-medium text-ink-3">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Continuity coverage
            </span>
            <button
              type="button"
              aria-expanded={showDefinition}
              aria-controls={definitionId}
              onClick={() => setShowDefinition((v) => !v)}
              className="type-meta cursor-pointer text-ink-3 underline decoration-rule underline-offset-4 transition-colors hover:text-ink hover:decoration-ink-3"
            >
              What counts as covered?
            </button>
          </div>

          <h2 id="posture-heading" className="mt-3 text-ink">
            <span className="type-display block text-[2.75rem] leading-[3rem]">
              {c.covered} of {c.total}
            </span>{' '}
            <span className="mt-1 block text-base font-medium text-ink-2">critical assets fully covered</span>
          </h2>
          <p className="type-meta mt-2.5 text-ink-3">
            <SinceLine value={trend?.covered} goodWhen="up" since={since} fallback="Week-on-week change appears after 7 days of history" />
          </p>

          <div className="mt-auto pt-6">
            <div
              role="img"
              aria-label={`${c.covered} covered, ${c.exposed} exposed, ${unknownCount} unknown, of ${c.total} critical assets`}
              className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-surface-sunken"
            >
              {segments.map((s) =>
                s.count > 0 && c.total > 0 ? (
                  <div key={s.key} className={cn('h-full first:rounded-l-full last:rounded-r-full', s.color)} style={{ width: `${(s.count / c.total) * 100}%` }} />
                ) : null,
              )}
            </div>
            <ul className="type-meta mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-ink-2">
              {segments.map((s) => (
                <li key={s.key} className="inline-flex items-center gap-1.5">
                  <span className={cn('h-2 w-2 rounded-[2px]', s.color)} aria-hidden="true" />
                  <span className="font-medium text-ink tabular-nums">{s.key === 'unknown' && c.unknown === null ? '—' : s.count}</span>
                  {s.label}
                </li>
              ))}
            </ul>
          </div>

          {showDefinition && (
            <p id={definitionId} className="type-meta mt-4 rounded-control border border-rule bg-surface-sunken px-3 py-2.5 text-ink-2">
              {c.definition}
            </p>
          )}
        </div>

        <CoverageHistoryChart
          points={points}
          failed={history.status === 'error'}
          onRetry={history.reload}
          range={range}
          onRangeChange={setRange}
          className="lg:border-l lg:border-rule lg:pl-8"
        />
      </div>

      <div className="grid grid-cols-1 divide-y divide-rule border-t border-rule sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Tile
          label="Exposed"
          href="/assets"
          value={c.exposed}
          detail={<SinceLine value={trend?.exposed} goodWhen="down" since={since} fallback="Critical assets with a known gap" />}
        />
        <Tile
          label="Unknown"
          href="/actions"
          value={c.unknown === null ? <span className="text-ink-3">Not tracked</span> : c.unknown}
          detail={
            <SinceLine value={c.unknown === null ? undefined : trend?.unknown} goodWhen="down" since={since} fallback="Facts still to be confirmed" />
          }
        />
        <Tile
          label="Active departures"
          href="/departures"
          value={
            departures === undefined ? <span className="skeleton inline-block h-7 w-8 align-middle" />
              : active === null ? <span className="text-ink-3">—</span>
                : active.length
          }
          aside={
            active && toHandOver > 0 ? (
              <span className="flex w-28 flex-col items-end gap-1" title={`${handedOver} of ${toHandOver} critical assets handed over`}>
                <span className="text-[11px] leading-none text-ink-3 tabular-nums">
                  {handedOver} of {toHandOver} handed over
                </span>
                <span className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                  <span
                    className={cn('block h-full rounded-full', needSuccessor > 0 ? 'bg-amber' : 'bg-st-pass')}
                    style={{ width: `${(handedOver / toHandOver) * 100}%` }}
                  />
                </span>
              </span>
            ) : null
          }
          detail={
            departures === null ? (
              "Couldn't load departures"
            ) : departures === undefined ? (
              'Loading…'
            ) : needSuccessor > 0 ? (
              <span className="font-medium text-st-fail">{needSuccessor} without an accepted successor</span>
            ) : active && active.length > 0 ? (
              'All critical assets have a successor'
            ) : (
              'No one is leaving'
            )
          }
        />
      </div>
    </Panel>
  );
}
