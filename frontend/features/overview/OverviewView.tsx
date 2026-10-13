'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { OverviewHeader } from './OverviewHeader';
import { AttentionPanel } from './AttentionPanel';
import { DeparturesPanel } from './DeparturesPanel';
import { SpofPanel } from './SpofPanel';
import { ExposureCausesPanel } from './ExposureCausesPanel';
import { TeamCoveragePanel } from './TeamCoveragePanel';
import { PosturePanel } from './PosturePanel';
import { Skeleton, ErrorState } from '@/components/ui/states';
import { Button } from '@/components/ui/Button';
import { HeroArt } from '@/components/ui/HeroArt';
import { Panel } from '@/components/ui/Panel';
import { useResource } from '@/lib/useResource';
import { fetchCoverage, fetchChangeSummary, fetchSpofAssets } from '@/lib/api/overview';
import { fetchActions } from '@/lib/api/actions';
import { fetchDepartures } from '@/lib/api/departures';
import { fetchTeams } from '@/lib/api/people';
import type { ActionView, OverviewCoverage, ChangeSummary, SpofAsset, DepartureSummary, TeamSummary } from '@/types/view';

export function OverviewView() {
  const router = useRouter();

  // Resources. No .catch() fallbacks: a failed request shows its error state,
  // never fabricated "no changes" / "zero failing checks" / empty lists.
  const coverageResource = useResource<OverviewCoverage>('overview-coverage', () => fetchCoverage());
  const changeSummaryResource = useResource<ChangeSummary>('overview-changes', () => fetchChangeSummary());
  const actionsResource = useResource<ActionView[]>('overview-actions', () => fetchActions({ limit: 5, status: 'open' }));
  const departuresResource = useResource<DepartureSummary[]>('overview-departures', () => fetchDepartures());
  const spofResource = useResource<SpofAsset[]>('overview-spof', () => fetchSpofAssets(5));
  const teamsResource = useResource<TeamSummary[]>('overview-teams', async () => (await fetchTeams()).teams);

  // OverviewHeader: undefined = loading, null = failed.
  const changeSummary =
    changeSummaryResource.status === 'ready' ? changeSummaryResource.data
      : changeSummaryResource.status === 'error' ? null
        : undefined;

  // Shared by the posture tiles and the departures panel: undefined = loading, null = failed.
  const departures =
    departuresResource.status === 'ready' ? departuresResource.data
      : departuresResource.status === 'error' ? null
        : undefined;

  // First-run / Empty state detection (no assets or total === 0)
  const isFirstRun = coverageResource.status === 'ready' && coverageResource.data.total === 0;

  if (isFirstRun) {
    return (
      <div className="space-y-8">
        <OverviewHeader changeSummary={changeSummary} />

        <Panel className="relative overflow-hidden p-8 sm:p-10">
          <div className="relative z-10 max-w-xl space-y-3">
            <span className="type-meta font-medium text-amber-ink">Get started</span>
            <h2 className="type-title text-ink">
              See your n8n exposure in a few minutes
            </h2>
            <p className="text-sm leading-relaxed text-ink-2">
              Connect your automation orchestrators and identity directory to automatically discover unbacked critical automations, personal credential dependencies, and succession gaps.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="primary"
                onClick={() => router.push('/settings/connections/n8n-check')}
              >
                Run n8n ownership check
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
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <OverviewHeader changeSummary={changeSummary} />

      {/* Posture: coverage headline, trend and stat tiles */}
      {coverageResource.status === 'loading' && (
        <Skeleton variant="card" className="h-[17rem] rounded-panel" />
      )}
      {coverageResource.status === 'error' && (
        <Panel className="p-5">
          <ErrorState
            onRetry={coverageResource.reload}
            message="We couldn't load continuity coverage metrics."
            lastLoadedAt={coverageResource.lastLoadedAt || undefined}
          />
        </Panel>
      )}
      {coverageResource.status === 'ready' && (
        <PosturePanel
          coverage={coverageResource.data}
          departures={departures}
        />
      )}

      {/* Needs your attention + upcoming departures */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <AttentionPanel
          className="lg:col-span-7"
          actions={actionsResource.status === 'ready' ? actionsResource.data : actionsResource.status === 'error' ? null : undefined}
          onRetry={actionsResource.reload}
        />
        <DeparturesPanel
          className="lg:col-span-5"
          departures={departures}
          onRetry={departuresResource.reload}
        />
      </div>

      {/* Why we're exposed + where it sits by team */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {coverageResource.status === 'ready' ? (
          <ExposureCausesPanel className="lg:col-span-7" causes={coverageResource.data.exposureByCause} totalCritical={coverageResource.data.total} />
        ) : (
          <Skeleton variant="card" className="h-64 rounded-panel lg:col-span-7" />
        )}
        <TeamCoveragePanel
          className="lg:col-span-5"
          teams={teamsResource.status === 'ready' ? teamsResource.data : teamsResource.status === 'error' ? null : undefined}
          onRetry={teamsResource.reload}
        />
      </div>

      {/* Top single points of failure */}
      <SpofPanel
        assets={spofResource.status === 'ready' ? spofResource.data : spofResource.status === 'error' ? null : undefined}
        onRetry={spofResource.reload}
      />
    </div>
  );
}
