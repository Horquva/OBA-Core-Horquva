import * as React from 'react';
import type { CoverageMetrics, Holding, TeamSummary } from '@/types/view';
import { cn } from '@/lib/cn';

export type TeamStatus = 'exposed' | 'covered' | 'no_critical' | 'rolled_up';

/** One status per team, from counted coverage only. Teams are never scored. */
export function teamStatus(team: TeamSummary, minGroupSize: number): TeamStatus {
  if (team.rolledUp || team.memberCount < minGroupSize) return 'rolled_up';
  if (team.coverage.total === 0) return 'no_critical';
  return team.coverage.exposed > 0 ? 'exposed' : 'covered';
}

export const TEAM_STATUS_LABEL: Record<TeamStatus, (t: TeamSummary) => string> = {
  exposed: (t) => `${t.coverage.exposed} exposed`,
  covered: () => 'All covered',
  no_critical: () => 'No critical assets',
  rolled_up: () => 'Rolled up',
};

export const TEAM_STATUS_PILL: Record<TeamStatus, string> = {
  exposed: 'bg-[color-mix(in_srgb,var(--st-fail)_12%,transparent)] text-st-fail',
  covered: 'bg-[color-mix(in_srgb,var(--st-pass)_13%,transparent)] text-st-pass',
  no_critical: 'bg-surface-sunken text-ink-3',
  rolled_up: 'bg-surface-sunken text-ink-3',
};

export function TeamStatusPill({ team, minGroupSize }: { team: TeamSummary; minGroupSize: number }) {
  const status = teamStatus(team, minGroupSize);
  return (
    <span className={cn('inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium', TEAM_STATUS_PILL[status])}>
      {TEAM_STATUS_LABEL[status](team)}
    </span>
  );
}

/** The fewest people who together hold a majority of the team's critical assets (aggregate, never a ranking). */
export function majority(concentration: TeamSummary['concentration']): { people: number; held: number; total: number } | null {
  if (!concentration || concentration.total === 0) return null;
  let held = 0;
  let people = 0;
  for (const h of concentration.holders) {
    held += h.count;
    people++;
    if (held * 2 > concentration.total) break;
  }
  return { people, held, total: concentration.total };
}

/** One person holds most of the team's critical assets. */
export const isConcentrated = (team: TeamSummary) => !team.rolledUp && majority(team.concentration)?.people === 1;

/** Covered / exposed / unknown as one segmented bar. Green and red sit apart, with a neutral gap. */
export function CoverageBar({ coverage, className }: { coverage: CoverageMetrics; className?: string }) {
  const unknown = coverage.unknown ?? 0;
  const exposed = Math.max(0, coverage.exposed - unknown);
  const segs = [
    { n: coverage.covered, cls: 'bg-st-pass' },
    { n: unknown, cls: 'bg-st-unknown' },
    { n: exposed, cls: 'bg-st-fail' },
  ].filter((s) => s.n > 0);
  return (
    <span className={cn('flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-sunken', className)} aria-hidden="true">
      {coverage.total > 0 &&
        segs.map((s, i) => <span key={i} className={cn('h-full first:rounded-l-full last:rounded-r-full', s.cls)} style={{ width: `${(s.n / coverage.total) * 100}%` }} />)}
    </span>
  );
}

export const RELATION_LABEL: Record<Holding['relation'], string> = {
  owns: 'Owner',
  backs_up: 'Backup',
  credential: 'Runs on their credentials',
};

export const RELATION_PILL: Record<Holding['relation'], string> = {
  owns: 'bg-surface-sunken text-ink-2',
  backs_up: 'bg-[color-mix(in_srgb,var(--st-pass)_13%,transparent)] text-st-pass',
  credential: 'bg-[color-mix(in_srgb,var(--amber)_16%,transparent)] text-amber-ink',
};

/** Counted holdings for one person. "No backup" = assets they own or that run on them with no backup on record. */
export function holdingCounts(holdings: Holding[]) {
  return {
    owns: holdings.filter((h) => h.relation === 'owns').length,
    backsUp: holdings.filter((h) => h.relation === 'backs_up').length,
    credential: holdings.filter((h) => h.relation === 'credential').length,
    noBackup: new Set(holdings.filter((h) => h.relation !== 'backs_up' && h.backup.state === 'none').map((h) => h.asset.id)).size,
  };
}

/** A counted figure in a gap-px summary strip. */
export function StatTile({ label, value, detail, tone }: { label: string; value: React.ReactNode; detail?: React.ReactNode; tone?: 'fail' | 'warn' }) {
  return (
    <div className="bg-surface px-6 py-4">
      <p className="type-meta text-ink-3">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tracking-tight tabular-nums', tone === 'fail' ? 'text-st-fail' : tone === 'warn' ? 'text-amber-ink' : 'text-ink')}>{value}</p>
      {detail && <div className="type-meta mt-1 text-ink-3">{detail}</div>}
    </div>
  );
}
