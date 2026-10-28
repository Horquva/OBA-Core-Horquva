'use client';

import * as React from 'react';
import Link from 'next/link';
import { CircleCheck, CircleHelp, CircleX } from 'lucide-react';
import type { AssetRow, CheckResult, CheckStatus, EntityRef, FactHistoryEntry, FactView } from '@/types/view';
import { EntityKindIcon, kindLabel } from '@/components/ui/EntityKindIcon';
import { EvidenceBadge, NoneValue, UnknownValue } from '@/components/ui/marks';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export const STATUS_LABEL: Record<CheckStatus, string> = { PASS: 'Passing', FAIL: 'Failing', UNKNOWN: 'Unknown' };

export const STATUS_PILL: Record<CheckStatus, string> = {
  PASS: 'bg-[color-mix(in_srgb,var(--st-pass)_13%,transparent)] text-st-pass',
  FAIL: 'bg-[color-mix(in_srgb,var(--st-fail)_12%,transparent)] text-st-fail',
  UNKNOWN: 'bg-[color-mix(in_srgb,var(--st-unknown)_14%,transparent)] text-st-unknown',
};

export const upper = (s: string) => s.toUpperCase() as CheckStatus;

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const s = upper(status);
  return (
    <span className={cn('inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium', STATUS_PILL[s], className)}>
      {STATUS_LABEL[s]}
    </span>
  );
}

/** Plain names for the continuity checks (backend domain/checks). */
const CHECK_LABEL: Record<string, string> = {
  C1_UNBACKED_CRITICAL: 'Has a backup',
  C2_DEPARTED_OWNER: 'Owner is still here',
  C3_UNDOCUMENTED_CRITICAL: 'Documented',
  C4_MISSING_FALLBACK: 'Has a fallback',
  C5_KEY_OUTLIVES_OWNER: "Key's owner is still here",
};
export const checkLabel = (id: string) => CHECK_LABEL[id] ?? id;

/** A fact value: the value, "None" or "Unknown". Never shows unknown as no. */
export function FactValue({ fact, className }: { fact: FactView; className?: string }) {
  if (fact.state === 'unknown') return <UnknownValue />;
  if (fact.state === 'none') return <NoneValue />;
  return <span className={cn('font-medium text-ink', className)}>{fact.display}</span>;
}

/** Owner, backup, documentation, fallback and runs as a two-column definition list. */
export function AssetFacts({ asset, columns = 2 }: { asset: AssetRow; columns?: 2 | 3 }) {
  const rows: Array<{ term: string; fact: FactView }> = [
    { term: 'Owner', fact: asset.owner },
    { term: 'Backup', fact: asset.backup },
    { term: 'Documentation', fact: asset.documented },
    { term: 'Fallback', fact: asset.fallback },
    { term: 'Runs per week', fact: asset.runsPerWeek },
  ];
  return (
    <dl className={cn('grid grid-cols-1 gap-px bg-rule sm:grid-cols-2', columns === 3 && 'lg:grid-cols-3')}>
      {rows.map(({ term, fact }) => (
        <div key={term} className="min-w-0 bg-surface px-5 py-3.5">
          <dt className="type-meta flex items-center justify-between gap-2 text-ink-3">
            {term}
            <EvidenceBadge grade={fact.grade} />
          </dt>
          <dd className="mt-1 min-w-0">
            <span className="block truncate text-sm" title={fact.display ?? undefined}>
              <FactValue fact={fact} />
            </span>
            {fact.source && <span className="mt-0.5 block truncate text-[11px] text-ink-3">From {fact.source}</span>}
          </dd>
        </div>
      ))}
      {/* Five facts: one filler cell keeps both 2- and 3-column grids even. */}
      <div aria-hidden="true" className="hidden bg-surface sm:block" />
    </dl>
  );
}

const CHECK_ICON: Record<CheckStatus, React.ReactNode> = {
  PASS: <CircleCheck className="h-4 w-4 text-st-pass" aria-hidden="true" />,
  FAIL: <CircleX className="h-4 w-4 text-st-fail" aria-hidden="true" />,
  UNKNOWN: <CircleHelp className="h-4 w-4 text-st-unknown" aria-hidden="true" />,
};

export function CheckList({ checks }: { checks: CheckResult[] }) {
  if (checks.length === 0) return <p className="type-meta px-5 py-5 text-ink-3">No check results recorded for this asset.</p>;
  return (
    <ul className="divide-y divide-rule">
      {checks.map((c) => {
        const s = upper(c.status);
        return (
          <li key={c.checkId} className="flex gap-3 px-5 py-3.5">
            <span className="mt-0.5 shrink-0">{CHECK_ICON[s]}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">{checkLabel(c.checkId)}</p>
                <StatusPill status={s} />
              </div>
              <p className="type-meta mt-0.5 text-ink-2">{c.reason}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** A clickable list of related assets. */
export function DependencyList({ items, empty, onSelect }: { items: EntityRef[]; empty: string; onSelect?: (id: string) => void }) {
  if (items.length === 0) return <p className="type-meta px-5 py-5 text-ink-3">{empty}</p>;
  return (
    <ul className="divide-y divide-rule">
      {items.map((d) => {
        const inner = (
          <>
            <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-rule bg-surface-sunken text-ink-2">
              <EntityKindIcon kind={d.kind} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{d.name}</span>
              <span className="block text-[11px] text-ink-3">{kindLabel(d.kind)}</span>
            </span>
          </>
        );
        const cls = 'flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-surface-sunken/50';
        return (
          <li key={d.id}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(d.id)} className={cn(cls, 'cursor-pointer')}>
                {inner}
              </button>
            ) : (
              <Link href={`/assets/${d.id}`} className={cls}>
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const ATTRIBUTE_LABEL: Record<string, string> = {
  owner: 'Owner',
  owns: 'Owner',
  backup: 'Backup',
  backs_up: 'Backup',
  criticality: 'Criticality',
  documented: 'Documentation',
  documentation: 'Documentation',
  fallback: 'Fallback',
  runsPerWeek: 'Runs per week',
  runs_per_week: 'Runs per week',
};
const attributeLabel = (a: string) => ATTRIBUTE_LABEL[a] ?? a.charAt(0).toUpperCase() + a.slice(1).replace(/_/g, ' ');

/** Every recorded change to this asset's facts, newest first, as a vertical timeline. */
export function HistoryTimeline({ history }: { history: FactHistoryEntry[] }) {
  if (history.length === 0) return <p className="type-meta px-5 py-5 text-ink-3">No changes recorded yet.</p>;
  const sorted = [...history].sort((a, b) => b.validFrom.localeCompare(a.validFrom));
  return (
    <ol className="px-5 py-4">
      {sorted.map((h, i) => (
        <li key={`${h.attribute}-${h.validFrom}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
          {i < sorted.length - 1 && <span className="absolute left-[3.5px] top-3 h-full w-px bg-rule" aria-hidden="true" />}
          <span className={cn('relative mt-1.5 h-2 w-2 shrink-0 rounded-full', h.validTo ? 'bg-ink-3' : 'bg-amber')} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="type-meta text-ink-2">
                <span className="font-medium text-ink">{attributeLabel(h.attribute)}</span> set to{' '}
                {h.state === 'value' ? <span className="font-medium text-ink">{h.display}</span> : h.state === 'unknown' ? <UnknownValue /> : <NoneValue />}
              </p>
              <time dateTime={h.validFrom} className="text-[11px] text-ink-3">
                {formatDate(h.validFrom)}
              </time>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
              <EvidenceBadge grade={h.grade} />
              {h.source && <span>{h.source}</span>}
              {h.changedBy && h.changedBy !== h.source && <span>· by {h.changedBy}</span>}
              <span>· {h.validTo ? `until ${formatDate(h.validTo)}` : 'Current'}</span>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
