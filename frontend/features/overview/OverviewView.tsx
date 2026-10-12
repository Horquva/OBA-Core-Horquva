'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeroGreeting } from './HeroGreeting';
import { UpcomingDeparturesCard } from './UpcomingDeparturesCard';
import { TopSpofCard } from './TopSpofCard';
import { BriefingCard } from './BriefingCard';
import { CoverageStrip } from '@/components/ui/CoverageStrip';
import { PriorityCard } from '@/components/ui/PriorityCard';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { Button } from '@/components/ui/Button';
import { HeroArt } from '@/components/ui/HeroArt';
import { useResource } from '@/lib/useResource';
import { fetchCoverage, fetchChangeSummary, fetchSpofAssets, fetchBriefing } from '@/lib/api/overview';
import { fetchActions } from '@/lib/api/actions';
import { fetchDepartures } from '@/lib/api/departures';
import type { ActionView, CoverageMetrics, ChangeSummary, SpofAsset, DepartureSummary } from '@/types/view';

export function OverviewView() {
  const router = useRouter();

  // Resources. No .catch() fallbacks: a failed request shows its error state,
  // never fabricated "no changes" / "zero failing checks" / empty lists.
  const coverageResource = useResource<CoverageMetrics>('overview-coverage', () => fetchCoverage());
  const changeSummaryResource = useResource<ChangeSummary>('overview-changes', () => fetchChangeSummary());
  const actionsResource = useResource<ActionView[]>('overview-actions', () => fetchActions({ limit: 3, status: 'open' }));
  const departuresResource = useResource<DepartureSummary[]>('overview-departures', () => fetchDepartures());
  const spofResource = useResource<SpofAsset[]>('overview-spof', () => fetchSpofAssets(5));
  const briefingResource = useResource<string>('overview-briefing', () => fetchBriefing());

  // HeroGreeting: undefined = loading, null = failed.
  const changeSummary =
    changeSummaryResource.status === 'ready' ? changeSummaryResource.data
      : changeSummaryResource.status === 'error' ? null
        : undefined;

  // First-run / Empty state detection (no assets or total === 0)
  const isFirstRun = coverageResource.status === 'ready' && coverageResource.data.total === 0;

  if (isFirstRun) {
    return (
      <div className="space-y-8">
        <HeroGreeting changeSummary={changeSummary} />

        <div className="relative overflow-hidden rounded-card border border-rule bg-surface p-8 sm:p-12 shadow-card">
          <div className="relative z-10 max-w-xl space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-ink">
              First-run Setup
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-ink leading-tight">
              See your n8n exposure in a few minutes.
            </h2>
            <p className="text-sm text-ink-2 leading-relaxed font-sans">
              Connect your automation orchestrators and identity directory to automatically discover unbacked critical automations, personal credential dependencies, and succession gaps.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Button
                variant="primary"
                onClick={() => router.push('/settings/connections/n8n-check')}
              >
                Run n8n Ownership Scan
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push('/settings/connections')}
              >
                Connect n8n
              </Button>
            </div>
          </div>

          {/* Faint Hero Artwork in background */}
          <div className="absolute right-0 bottom-0 w-80 h-80 opacity-20 pointer-events-none">
            <HeroArt />
          </div>
        </div>
      </div>
    );
  }

  const categoryFromType = (type: ActionView['type']): string => {
    switch (type) {
      case 'assign_backup': return 'Single Point of Failure';
      case 'confirm_facts': return 'Unconfirmed Facts';
      case 'name_successor': return 'Succession Gap';
      case 'move_credential': return 'Credential Binding';
      case 'document': return 'Undocumented Asset';
      case 'add_fallback': return 'Outage Fragility';
      default: return 'Continuity Risk';
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Greeting */}
      <HeroGreeting changeSummary={changeSummary} />

      {/* Coverage Strip */}
      {coverageResource.status === 'loading' && (
        <Skeleton variant="card" className="h-32" />
      )}
      {coverageResource.status === 'error' && (
        <ErrorState
          onRetry={coverageResource.reload}
          message="We couldn't load continuity coverage metrics."
          lastLoadedAt={coverageResource.lastLoadedAt || undefined}
        />
      )}
      {coverageResource.status === 'ready' && (
        <CoverageStrip
          total={coverageResource.data.total}
          covered={coverageResource.data.covered}
          exposed={coverageResource.data.exposed}
          unknown={coverageResource.data.unknown}
          definition={coverageResource.data.definition}
        />
      )}

      {/* Top 3 Priority Actions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Priority Actions</h2>
          <Link
            href="/actions"
            className="text-xs font-semibold text-amber-ink hover:underline inline-flex items-center gap-1"
          >
            <span>See all actions</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {actionsResource.status === 'loading' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton variant="card" className="h-44" />
            <Skeleton variant="card" className="h-44" />
            <Skeleton variant="card" className="h-44" />
          </div>
        )}

        {actionsResource.status === 'error' && (
          <ErrorState onRetry={actionsResource.reload} message="We couldn't load priority actions." />
        )}

        {actionsResource.status === 'ready' && (!actionsResource.data || actionsResource.data.length === 0) && (
          <EmptyState
            title="Zero failing checks"
            description="All critical continuity invariants are currently satisfied."
          />
        )}

        {actionsResource.status === 'ready' && actionsResource.data && actionsResource.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {actionsResource.data.slice(0, 3).map((action, idx) => (
              <PriorityCard
                key={action.id}
                rank={String(idx + 1).padStart(2, '0')}
                category={categoryFromType(action.type)}
                problem={action.problem}
                criticalAssetsAffected={action.criticalAssetsAffected}
                href={`/actions?id=${encodeURIComponent(action.id)}`}
                onReview={() => router.push(`/actions?id=${encodeURIComponent(action.id)}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Two Column Layout: Upcoming Departures & Top SPOFs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <UpcomingDeparturesCard
          departures={departuresResource.status === 'ready' ? departuresResource.data : []}
          isLoading={departuresResource.status === 'loading'}
          error={departuresResource.status === 'error' ? departuresResource.error : null}
          onRetry={departuresResource.reload}
        />

        <TopSpofCard
          assets={spofResource.status === 'ready' ? spofResource.data : []}
          isLoading={spofResource.status === 'loading'}
          error={spofResource.status === 'error' ? spofResource.error : null}
          onRetry={spofResource.reload}
        />
      </div>

      {/* Weekly Briefing Card */}
      <BriefingCard
        briefingText={briefingResource.status === 'ready' ? briefingResource.data : null}
        isLoading={briefingResource.status === 'loading'}
        error={briefingResource.status === 'error'}
      />
    </div>
  );
}
