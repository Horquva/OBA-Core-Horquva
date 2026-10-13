'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { AssetDetail } from '@/types/view';
import { Drawer } from '@/components/ui/Drawer';
import { EntityKindIcon, kindLabel } from '@/components/ui/EntityKindIcon';
import { CriticalityDots } from '@/components/ui/marks';
import { ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchAssetDetail } from '@/lib/api/assets';
import { AssetFacts, CheckList, DependencyList, HistoryTimeline, StatusPill } from './assetParts';

export interface AssetDrawerProps {
  assetId: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialDetail?: AssetDetail;
  /** Open a related asset in this drawer instead of navigating away. */
  onSelectDependency?: (id: string) => void;
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-panel border border-rule bg-surface">
      <h3 className="type-meta flex items-center gap-2 border-b border-rule px-5 py-2.5 font-medium text-ink">
        {title}
        {count !== undefined && <span className="tabular-nums text-ink-3">{count}</span>}
      </h3>
      {children}
    </section>
  );
}

export function AssetDrawer({ assetId, isOpen, onClose, initialDetail, onSelectDependency }: AssetDrawerProps) {
  const detailResource = useResource<AssetDetail | null>(
    assetId ? `asset-detail-${assetId}` : 'asset-detail-none',
    () => (assetId ? fetchAssetDetail(assetId) : Promise.resolve(null)),
  );
  const detail = detailResource.status === 'ready' && detailResource.data ? detailResource.data : initialDetail;

  if (!assetId || !isOpen) return null;
  const asset = detail?.asset;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        asset ? (
          <span className="flex items-center gap-3">
            <span aria-hidden="true" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-rule bg-surface-sunken text-ink-2">
              <EntityKindIcon kind={asset.kind} className="h-4 w-4" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-ink">{asset.name}</span>
          </span>
        ) : (
          'Asset'
        )
      }
      description={
        asset ? (
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <StatusPill status={asset.checkStatus} />
            <span className="type-meta text-ink-3">{kindLabel(asset.kind)}</span>
            <span className="type-meta inline-flex items-center gap-1.5 text-ink-3">
              <CriticalityDots level={asset.criticality.level} />
            </span>
          </span>
        ) : undefined
      }
      footer={
        asset ? (
          <div className="flex items-center justify-between gap-4">
            <Link href={`/assets/${asset.id}`} className="type-meta inline-flex items-center gap-1 font-medium text-ink-2 transition-colors hover:text-ink">
              Open full page <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="type-meta h-8 cursor-pointer rounded-control border border-rule bg-surface px-3 font-medium text-ink transition-colors hover:bg-surface-sunken"
            >
              Close
            </button>
          </div>
        ) : undefined
      }
    >
      {detailResource.status === 'loading' && !detail ? (
        <div className="space-y-4" aria-label="Loading asset">
          <span className="skeleton block h-40 rounded-panel" />
          <span className="skeleton block h-32 rounded-panel" />
          <span className="skeleton block h-48 rounded-panel" />
        </div>
      ) : detailResource.status === 'error' && !detail ? (
        <div className="py-8">
          <ErrorState onRetry={detailResource.reload} message="We couldn't load this asset." />
        </div>
      ) : !detail ? null : (
        <div className="space-y-4">
          <Section title="Facts">
            <AssetFacts asset={detail.asset} />
          </Section>

          <Section title="Checks" count={detail.checks.length}>
            <CheckList checks={detail.checks} />
          </Section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Section title="Relies on" count={detail.upstream.length}>
              <DependencyList items={detail.upstream} empty="Relies on nothing on record." onSelect={onSelectDependency} />
            </Section>
            <Section title="Depended on by" count={detail.downstream.length}>
              <DependencyList items={detail.downstream} empty="Nothing depends on it." onSelect={onSelectDependency} />
            </Section>
          </div>

          <Section title="Change history" count={detail.history.length}>
            <HistoryTimeline history={detail.history} />
          </Section>
        </div>
      )}
    </Drawer>
  );
}
