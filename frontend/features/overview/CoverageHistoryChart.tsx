'use client';

import * as React from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/cn';
import type { HistoryPoint } from '@/types/view';

export const HISTORY_RANGES = [30, 60, 90] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

export interface CoverageHistoryChartProps {
  /** undefined while the first load is in flight. */
  points?: HistoryPoint[];
  failed: boolean;
  onRetry: () => void;
  range: HistoryRange;
  onRangeChange: (range: HistoryRange) => void;
  className?: string;
}

/** 'YYYY-MM-DD' as a local calendar date. */
function parseDay(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}
const shortDay = (ymd: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(parseDay(ymd));
const longDay = (ymd: string) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(parseDay(ymd));

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: HistoryPoint }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const rows = [
    { label: 'Covered', value: p.covered, swatch: 'bg-st-pass' },
    { label: 'Exposed', value: p.exposed, swatch: 'bg-st-fail' },
    { label: 'Unknown', value: p.unknown, swatch: 'bg-st-unknown' },
  ];
  return (
    <div className="min-w-44 rounded-control border border-rule bg-surface px-3 py-2.5 shadow-panel">
      <p className="type-meta font-medium text-ink">{longDay(p.date)}</p>
      <ul className="mt-1.5 space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="type-meta flex items-center justify-between gap-6 text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-[2px]', r.swatch)} aria-hidden="true" />
              {r.label}
            </span>
            <span className="font-medium text-ink tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
      <p className="type-meta mt-1.5 border-t border-rule pt-1.5 text-ink-3">of {p.total} critical assets</p>
    </div>
  );
}

/**
 * Fully covered critical assets per day, from the daily snapshots. One series (no legend box:
 * the caption names it) over a hairline step of total critical assets for scale.
 */
export function CoverageHistoryChart({ points, failed, onRetry, range, onRangeChange, className }: CoverageHistoryChartProps) {
  const maxTotal = points ? Math.max(1, ...points.map((p) => p.total)) : 1;

  return (
    <div className={cn('relative flex min-w-0 flex-col', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="type-meta text-ink-3">
          <span className="mr-1.5 inline-block h-0.5 w-3 rounded-full bg-st-pass align-middle" aria-hidden="true" />
          Fully covered, per day
          <span className="mx-1.5 text-rule" aria-hidden="true">|</span>
          <span className="mr-1.5 inline-block h-px w-3 bg-ink-3 align-middle" aria-hidden="true" />
          Critical assets
        </p>
        <div role="group" aria-label="History range" className="inline-flex rounded-control border border-rule p-0.5">
          {HISTORY_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => onRangeChange(r)}
              className={cn(
                'type-meta cursor-pointer rounded-[7px] px-2 py-0.5 font-medium tabular-nums transition-colors',
                range === r ? 'bg-surface-sunken text-ink' : 'text-ink-3 hover:text-ink',
              )}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-3 h-40 w-full">
        {failed && !points && (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="type-meta text-ink-2">We couldn&apos;t load coverage history.</p>
            <button type="button" onClick={onRetry} className="type-meta cursor-pointer font-medium text-amber-ink hover:underline">
              Retry
            </button>
          </div>
        )}
        {!points && !failed && <div className="skeleton h-full w-full rounded-control" />}
        {points && points.length < 2 && (
          <div className="flex h-full items-center justify-center text-center">
            <p className="type-meta max-w-xs text-ink-3">History builds up from one snapshot a day. The line appears after the second day.</p>
          </div>
        )}
        {points && points.length >= 2 && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="coverage-wash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--st-pass)" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="var(--st-pass)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--rule)" strokeWidth={1} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDay}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                tick={{ fill: 'var(--ink-3)', fontSize: 12 }}
                dy={6}
              />
              <YAxis
                domain={[0, maxTotal]}
                allowDecimals={false}
                tickCount={Math.min(5, maxTotal + 1)}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--ink-3)', fontSize: 12 }}
                width={40}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--ink-3)', strokeWidth: 1 }} isAnimationActive={false} />
              <Line type="stepAfter" dataKey="total" stroke="var(--ink-3)" strokeWidth={1} dot={false} activeDot={false} isAnimationActive={false} />
              <Area
                type="monotone"
                dataKey="covered"
                stroke="var(--st-pass)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="url(#coverage-wash)"
                dot={false}
                activeDot={{ r: 4, fill: 'var(--st-pass)', stroke: 'var(--surface)', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      {points && points.length >= 2 && (
        <p className="sr-only">
          {`Fully covered critical assets went from ${points[0].covered} on ${longDay(points[0].date)} to ${points[points.length - 1].covered} today, out of ${points[points.length - 1].total}.`}
        </p>
      )}
    </div>
  );
}
