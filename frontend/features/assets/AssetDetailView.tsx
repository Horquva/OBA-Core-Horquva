'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, History, ListChecks, NotebookText } from 'lucide-react';
import type { AssetDetail } from '@/types/view';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { EntityKindIcon, kindLabel } from '@/components/ui/EntityKindIcon';
import { CriticalityDots } from '@/components/ui/marks';
import { ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchAssetDetail } from '@/lib/api/assets';
import { AssetFacts, CheckList, DependencyList, HistoryTimeline, StatusPill, upper } from './assetParts';

export interface AssetDetailViewProps {
  id: string;
  initialDetail?: AssetDetail;
}

export function AssetDetailView({ id, initialDetail }: AssetDetailViewProps) {
  const assetResource = useResource<AssetDetail>(`asset-standalone-${id}`, () => fetchAssetDetail(id));
  const detail = assetResource.status === 'ready' ? assetResource.data : initialDetail;

  if (assetResource.status === 'loading' && !detail) {
    return (
      <div className="space-y-6 pb-16" aria-label="Loading asset">
        <span className="skeleton block h-4 w-28" />
        <span className="skeleton block h-16 w-1/2" />
        <span className="skeleton block h-40 rounded-panel" />
        <span className="skeleton block h-72 rounded-panel" />
      </div>
    );
  }

  if (assetResource.status === 'error' && !detail) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Panel className="p-5">
          <ErrorState onRetry={assetResource.reload} message="We couldn't load this asset." lastLoadedAt={assetResource.lastLoadedAt || undefined} />
        </Panel>
      </div>
    );
  }

  if (!detail) return null;
  const { asset } = detail;
  const failing = detail.checks.filter((c) => upper(c.status) === 'FAIL').length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="space-y-4 pt-2">
        <Link href="/assets" className="type-meta inline-flex items-center gap-1.5 font-medium text-ink-3 transition-colors hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Assets
        </Link>
        <header className="flex items-center gap-4">
          <span aria-hidden="true" className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-panel border border-rule bg-surface-sunken text-ink-2">
            <EntityKindIcon kind={asset.kind} className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="type-title text-ink">{asset.name}</h1>
              <StatusPill status={asset.checkStatus} />
            </div>
            <p className="type-meta mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-3">
              <span>{kindLabel(asset.kind)}</span>
              <span className="inline-flex items-center gap-1.5">
                <CriticalityDots level={asset.criticality.level} />
              </span>
              {failing > 0 && (
                <span className="font-medium text-st-fail">
                  {failing} {failing === 1 ? 'check' : 'checks'} failing
                </span>
              )}
            </p>
          </div>
        </header>
      </div>

      {/* Facts */}
      <Panel aria-labelledby="facts-heading">
        <PanelHeader titleId="facts-heading" title="Facts" icon={<NotebookText />} description="What's on record, with where each fact came from." />
        <AssetFacts asset={asset} columns={3} />
      </Panel>

      {/* Checks + history, equal height */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        <Panel aria-labelledby="checks-heading" className="flex flex-col">
          <PanelHeader titleId="checks-heading" title="Checks" icon={<ListChecks />} count={detail.checks.length} description="The continuity checks this asset is tested against." />
          <div className="flex-1">
            <CheckList checks={detail.checks} />
          </div>
        </Panel>
        <Panel aria-labelledby="history-heading" className="flex flex-col">
          <PanelHeader titleId="history-heading" title="Change history" icon={<History />} count={detail.history.length} description="Every recorded change to its facts, newest first." />
          <div className="flex-1">
            <HistoryTimeline history={detail.history} />
          </div>
        </Panel>
      </div>

      {/* Dependencies, equal height */}
      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
        <Panel aria-labelledby="upstream-heading" className="flex flex-col">
          <PanelHeader titleId="upstream-heading" title="Relies on" icon={<ArrowDownToLine />} count={detail.upstream.length} description="If one of these fails, this asset is affected." />
          <div className="flex-1">
            <DependencyList items={detail.upstream} empty="Relies on nothing on record." />
          </div>
        </Panel>
        <Panel aria-labelledby="downstream-heading" className="flex flex-col">
          <PanelHeader titleId="downstream-heading" title="Depended on by" icon={<ArrowUpFromLine />} count={detail.downstream.length} description="These are affected if this asset fails." />
          <div className="flex-1">
            <DependencyList items={detail.downstream} empty="Nothing depends on it." />
          </div>
        </Panel>
      </div>
    </div>
  );
}
