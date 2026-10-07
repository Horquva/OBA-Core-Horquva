'use client';

import * as React from 'react';
import Link from 'next/link';
import type { PersonDetail as PersonDetailType, Holding } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CriticalityDots, EvidenceBadge, NoneValue, UnknownValue } from '@/components/ui/marks';
import { Skeleton, ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchPerson } from '@/lib/api/people';
import { cn } from '@/lib/cn';

export interface PersonDetailProps {
  id: string;
  initialDetail?: PersonDetailType;
}

export function PersonDetail({ id, initialDetail }: PersonDetailProps) {
  const personResource = useResource<PersonDetailType>(
    `person-detail-${id}`,
    () => fetchPerson(id),
  );

  const detail =
    personResource.status === 'ready'
      ? personResource.data
      : initialDetail;

  const [relationFilter, setRelationFilter] = React.useState<'all' | 'owns' | 'backs_up' | 'credential'>('all');

  if (personResource.status === 'loading' && !detail) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        <Skeleton variant="text" className="w-1/4 h-5" />
        <Skeleton variant="card" className="h-40" />
        <Skeleton variant="card" className="h-96" />
      </div>
    );
  }

  if (personResource.status === 'error' && !detail) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <ErrorState
          onRetry={personResource.reload}
          message="We couldn't load this person's holdings."
          lastLoadedAt={personResource.lastLoadedAt || undefined}
        />
      </div>
    );
  }

  if (!detail) return null;

  const initials = detail.person.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const owned = detail.holdings.filter((h) => h.relation === 'owns');
  const backups = detail.holdings.filter((h) => h.relation === 'backs_up');
  const credentials = detail.holdings.filter((h) => h.relation === 'credential');

  const filteredHoldings = detail.holdings.filter((h) => {
    if (relationFilter === 'all') return true;
    return h.relation === relationFilter;
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header & Back Link */}
      <div className="space-y-4">
        <Link
          href="/people"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-ink transition-colors"
        >
          <span aria-hidden="true">←</span>
          <span>Back to People & Teams</span>
        </Link>

        {/* Person Identity Card (Strictly counted facts, zero subjective score/rank) */}
        <Card className="p-6 sm:p-8 bg-surface shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-rule/50">
            <div className="flex items-start gap-4">
              <span className="h-14 w-14 rounded-full bg-surface-sunken border border-rule text-2xl font-semibold flex items-center justify-center text-ink shrink-0">
                {initials}
              </span>

              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-semibold text-ink">
                  {detail.person.name}
                </h1>
                <p className="text-sm text-ink-3">
                  {detail.title ?? 'Title not on record'}
                  {detail.team && (
                    <span>
                      {' '}·{' '}
                      <Link
                        href={`/people/teams/${detail.team.id}`}
                        className="text-ink hover:text-amber-ink underline decoration-rule hover:decoration-ink"
                      >
                        {detail.team.name}
                      </Link>
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Holdings Summary Stats */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="rounded-control bg-surface-sunken p-2.5 text-center min-w-[80px]">
                <span className="text-lg font-bold text-ink block tabular-nums">
                  {owned.length}
                </span>
                <span className="text-ink-3">Owned</span>
              </div>
              <div className="rounded-control bg-surface-sunken p-2.5 text-center min-w-[80px]">
                <span className="text-lg font-bold text-ink block tabular-nums">
                  {backups.length}
                </span>
                <span className="text-ink-3">Backups</span>
              </div>
              <div className="rounded-control bg-surface-sunken p-2.5 text-center min-w-[80px]">
                <span className="text-lg font-bold text-ink block tabular-nums">
                  {credentials.length}
                </span>
                <span className="text-ink-3">Credentials</span>
              </div>
            </div>
          </div>

          {/* Privacy & Invariant Banner */}
          <div className="rounded-control bg-surface-sunken/60 border border-rule p-3 text-xs text-ink-3 flex items-center justify-between gap-4">
            <span>
              <strong>Fair Assessment Guarantee:</strong> OBA only displays counted system assets and active backup commitments. No subjective risk ranking or individual attrition scores.
            </span>
            <span className="font-mono text-[11px] text-ink-3 shrink-0">
              ID: {detail.person.id}
            </span>
          </div>
        </Card>
      </div>

      {/* Main Sections: Holdings & Workbenches */}
      <div className="space-y-8">
        {/* Holdings Table */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Asset Holdings</h2>
              <p className="text-xs text-ink-3">
                Automations, models, and systems linked to {detail.person.name}.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              {(
                [
                  { id: 'all', label: `All (${detail.holdings.length})` },
                  { id: 'owns', label: `Owned (${owned.length})` },
                  { id: 'backs_up', label: `Backups (${backups.length})` },
                  { id: 'credential', label: `Credentials (${credentials.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRelationFilter(tab.id)}
                  className={cn(
                    'px-3 py-1 rounded-control text-xs font-medium transition-colors cursor-pointer',
                    relationFilter === tab.id
                      ? 'bg-amber text-on-amber font-semibold'
                      : 'bg-surface border border-rule text-ink-2 hover:bg-surface-sunken',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-card border border-rule bg-surface shadow-xs" tabIndex={0} role="region" aria-label="Holdings table">
            <table className="w-full text-left text-xs text-ink">
              <thead className="border-b border-rule bg-surface-sunken/60 font-mono text-[11px] uppercase text-ink-3">
                <tr>
                  <th scope="col" className="p-3.5">Asset</th>
                  <th scope="col" className="p-3.5">Relation</th>
                  <th scope="col" className="p-3.5">Criticality</th>
                  <th scope="col" className="p-3.5">Current Backup</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule font-sans">
                {filteredHoldings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-ink-3">
                      No assets found matching this filter.
                    </td>
                  </tr>
                ) : (
                  filteredHoldings.map((h) => (
                    <tr key={h.asset.id} className="hover:bg-surface-sunken/30 transition-colors">
                      <td className="p-3.5 font-medium">
                        <Link
                          href={`/assets/${h.asset.id}`}
                          className="text-ink hover:text-amber-ink font-semibold transition-colors"
                        >
                          {h.asset.name}
                        </Link>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-badge text-[11px] font-mono',
                            h.relation === 'owns' && 'bg-bronze/10 text-bronze-ink',
                            h.relation === 'backs_up' && 'bg-st-pass/10 text-st-pass',
                            h.relation === 'credential' && 'bg-amber/15 text-amber-ink font-semibold',
                          )}
                        >
                          {h.relation === 'owns'
                            ? 'Owner'
                            : h.relation === 'backs_up'
                            ? 'Secondary Backup'
                            : 'Personal Credential'}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <CriticalityDots level={h.criticality} />
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Handovers & Pending Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Active Handovers */}
          <Card className="p-6 space-y-4 bg-surface">
            <h3 className="text-sm font-semibold text-ink">Active Handover Workbenches</h3>
            {detail.openHandovers.length > 0 ? (
              <ul className="divide-y divide-rule text-xs">
                {detail.openHandovers.map((ho) => (
                  <li key={ho.departureId} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink">
                        Handover from {ho.from.name}
                      </p>
                      <p className="text-ink-3 font-mono">{ho.assetCount} assets in transition</p>
                    </div>

                    <Link
                      href={`/departures/${ho.departureId}`}
                      className="text-xs font-semibold text-amber-ink hover:underline inline-flex items-center gap-1"
                    >
                      <span>Workbench</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ink-3">
                No active offboarding handovers assigned to this person.
              </p>
            )}
          </Card>

          {/* Pending Confirmations */}
          <Card className="p-6 space-y-4 bg-surface">
            <h3 className="text-sm font-semibold text-ink">Pending Ownership Confirmations</h3>
            {detail.pendingConfirmations === null ? (
              <p className="text-xs text-ink-3">
                Confirmation requests aren&apos;t counted on this page yet. See Actions → Confirmations.
              </p>
            ) : detail.pendingConfirmations > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-ink-2 leading-relaxed">
                  <strong>{detail.pendingConfirmations} facts</strong> require ownership or backup confirmation from {detail.person.name}.
                </p>
                <Link
                  href="/actions"
                  className="inline-flex items-center justify-center rounded-control bg-amber text-on-amber px-3.5 py-1.5 text-xs font-semibold hover:bg-amber-hover transition-colors"
                >
                  View Pending Actions
                </Link>
              </div>
            ) : (
              <p className="text-xs text-ink-3">
                All assigned assets and backup roles have been verified.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
