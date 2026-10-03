'use client';

import * as React from 'react';
import Link from 'next/link';
import type { AssetDetail, CheckStatus } from '@/types/view';
import { Drawer } from '@/components/ui/Drawer';
import {
  CriticalityDots,
  EvidenceBadge,
  EvidenceDot,
  CheckStatusBadge,
  NoneValue,
  UnknownValue,
} from '@/components/ui/marks';
import { Skeleton, ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchAssetDetail } from '@/lib/api/assets';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface AssetDrawerProps {
  assetId: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialDetail?: AssetDetail;
  onSelectDependency?: (id: string) => void;
}

export function AssetDrawer({
  assetId,
  isOpen,
  onClose,
  initialDetail,
  onSelectDependency,
}: AssetDrawerProps) {
  const detailResource = useResource<AssetDetail | null>(
    assetId ? `asset-detail-${assetId}` : 'asset-detail-none',
    () => (assetId ? fetchAssetDetail(assetId) : Promise.resolve(null)),
  );

  const detail =
    detailResource.status === 'ready' && detailResource.data
      ? detailResource.data
      : initialDetail;

  if (!assetId || !isOpen) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        detail ? (
          <div className="flex items-center gap-2.5">
            <span className="font-serif text-xl text-ink font-normal">
              {detail.asset.name}
            </span>
          </div>
        ) : (
          'Asset Details'
        )
      }
      description={
        detail ? (
          <div className="flex items-center gap-2 mt-1 font-mono text-xs">
            <span className="px-2 py-0.5 rounded-badge bg-surface-sunken text-ink capitalize">
              {detail.asset.kind}
            </span>
            <span className="text-ink-3">ID: {detail.asset.id}</span>
          </div>
        ) : undefined
      }
      footer={
        detail ? (
          <div className="flex items-center justify-between gap-4">
            <Link
              href={`/assets/${detail.asset.id}`}
              className="text-xs font-semibold text-amber-ink hover:underline inline-flex items-center gap-1"
            >
              <span>Open standalone view</span>
              <span aria-hidden="true">→</span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : undefined
      }
    >
      {detailResource.status === 'loading' && !detail ? (
        <div className="space-y-6">
          <Skeleton variant="card" className="h-28" />
          <Skeleton variant="card" className="h-44" />
          <Skeleton variant="card" className="h-48" />
        </div>
      ) : detailResource.status === 'error' && !detail ? (
        <div className="py-8">
          <ErrorState
            onRetry={detailResource.reload}
            message="Could not load asset details and timeline."
          />
        </div>
      ) : !detail ? null : (
        <div className="space-y-8 text-ink">
          {/* Header Overview Card */}
          <div className="rounded-card border border-rule bg-surface p-4 space-y-4 shadow-xs">
            <div className="flex items-center justify-between gap-2 border-b border-rule/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
                  Criticality & Health
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckStatusBadge
                  status={detail.asset.checkStatus.toUpperCase() as CheckStatus}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-ink-3 mb-1 font-mono">Criticality Rating</p>
                <div className="flex items-center gap-2">
                  <CriticalityDots level={detail.asset.criticality.level} />
                  <EvidenceDot grade={detail.asset.criticality.grade} />
                </div>
              </div>

              <div>
                <p className="text-ink-3 mb-1 font-mono">Execution Volume</p>
                <p className="font-semibold text-ink">
                  {detail.asset.runsPerWeek.state === 'value'
                    ? `${detail.asset.runsPerWeek.display} runs/wk`
                    : detail.asset.runsPerWeek.state === 'unknown'
                    ? 'Unknown'
                    : 'None'}
                </p>
              </div>

              <div>
                <p className="text-ink-3 mb-1 font-mono">Designated Owner</p>
                <div className="flex items-center gap-1.5">
                  <EvidenceDot
                    grade={detail.asset.owner.grade}
                    source={detail.asset.owner.source}
                  />
                  {detail.asset.owner.state === 'value' ? (
                    <span className="font-medium text-ink">
                      {detail.asset.owner.display}
                    </span>
                  ) : detail.asset.owner.state === 'unknown' ? (
                    <UnknownValue />
                  ) : (
                    <NoneValue />
                  )}
                </div>
              </div>

              <div>
                <p className="text-ink-3 mb-1 font-mono">Backup Operator</p>
                <div className="flex items-center gap-1.5">
                  <EvidenceDot
                    grade={detail.asset.backup.grade}
                    source={detail.asset.backup.source}
                  />
                  {detail.asset.backup.state === 'value' ? (
                    <span className="font-medium text-ink">
                      {detail.asset.backup.display}
                    </span>
                  ) : detail.asset.backup.state === 'unknown' ? (
                    <UnknownValue />
                  ) : (
                    <NoneValue />
                  )}
                </div>
              </div>

              <div>
                <p className="text-ink-3 mb-1 font-mono">Documentation</p>
                <div className="flex items-center gap-1.5">
                  <EvidenceDot grade={detail.asset.documented.grade} />
                  {detail.asset.documented.state === 'value' ? (
                    <span className="text-ink truncate">
                      {detail.asset.documented.display}
                    </span>
                  ) : detail.asset.documented.state === 'unknown' ? (
                    <UnknownValue />
                  ) : (
                    <NoneValue />
                  )}
                </div>
              </div>

              <div>
                <p className="text-ink-3 mb-1 font-mono">Fallback Procedure</p>
                <div className="flex items-center gap-1.5">
                  <EvidenceDot grade={detail.asset.fallback.grade} />
                  {detail.asset.fallback.state === 'value' ? (
                    <span className="text-ink truncate">
                      {detail.asset.fallback.display}
                    </span>
                  ) : detail.asset.fallback.state === 'unknown' ? (
                    <UnknownValue />
                  ) : (
                    <NoneValue />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Continuity Checks Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
                Continuity Checks ({detail.checks.length})
              </h3>
            </div>

            {detail.checks.length === 0 ? (
              <p className="text-xs text-ink-3 italic">
                No active check results recorded for this asset.
              </p>
            ) : (
              <div className="divide-y divide-rule border border-rule rounded-card bg-surface overflow-hidden">
                {detail.checks.map((c) => {
                  const upperStatus = c.status.toUpperCase() as CheckStatus;
                  return (
                    <div key={c.checkId} className="p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-ink">
                          {c.checkId}
                        </span>
                        <CheckStatusBadge status={upperStatus} />
                      </div>
                      <p className="text-ink-2 leading-relaxed">{c.reason}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dependencies (Graph Relies On / Depended On By) */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
              Dependency Topology
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Upstream */}
              <div className="rounded-card border border-rule bg-surface p-3 space-y-2">
                <p className="text-xs font-semibold text-ink flex items-center justify-between">
                  <span>Upstream Dependencies</span>
                  <span className="font-mono text-ink-3 text-[11px]">
                    {detail.upstream.length}
                  </span>
                </p>
                {detail.upstream.length === 0 ? (
                  <p className="text-xs text-ink-3 italic">
                    None (standalone or root)
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {detail.upstream.map((u) => (
                      <li key={u.id} className="flex items-center justify-between gap-2">
                        <span className="truncate text-ink">{u.name}</span>
                        <span className="px-1.5 py-0.2 rounded-badge bg-surface-sunken text-[10px] font-mono uppercase text-ink-3 shrink-0">
                          {u.kind}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Downstream */}
              <div className="rounded-card border border-rule bg-surface p-3 space-y-2">
                <p className="text-xs font-semibold text-ink flex items-center justify-between">
                  <span>Downstream Dependents</span>
                  <span className="font-mono text-ink-3 text-[11px]">
                    {detail.downstream.length}
                  </span>
                </p>
                {detail.downstream.length === 0 ? (
                  <p className="text-xs text-ink-3 italic">
                    None (leaf asset)
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {detail.downstream.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2">
                        <span className="truncate text-ink">{d.name}</span>
                        <span className="px-1.5 py-0.2 rounded-badge bg-surface-sunken text-[10px] font-mono uppercase text-ink-3 shrink-0">
                          {d.kind}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* SCD2 Fact History Timeline */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
              SCD2 Fact History Timeline
            </h3>

            {detail.history.length === 0 ? (
              <p className="text-xs text-ink-3 italic">
                No historical revisions recorded.
              </p>
            ) : (
              <div className="border border-rule rounded-card bg-surface overflow-x-auto">
                <table className="w-full text-left text-xs text-ink">
                  <thead className="border-b border-rule bg-surface-sunken/40 font-mono text-[11px] uppercase text-ink-3">
                    <tr>
                      <th scope="col" className="px-3 py-2">Attribute</th>
                      <th scope="col" className="px-3 py-2">Value</th>
                      <th scope="col" className="px-3 py-2">Grade</th>
                      <th scope="col" className="px-3 py-2">Source / Actor</th>
                      <th scope="col" className="px-3 py-2">Valid Period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule font-sans">
                    {detail.history.map((h, i) => (
                      <tr key={`${h.attribute}-${h.validFrom}-${i}`} className="hover:bg-surface-sunken/20">
                        <td className="px-3 py-2.5 font-mono text-ink-2 font-medium">
                          {h.attribute}
                        </td>
                        <td className="px-3 py-2.5">
                          {h.state === 'none' ? (
                            <NoneValue />
                          ) : h.state === 'unknown' ? (
                            <UnknownValue />
                          ) : (
                            <span className="font-medium text-ink">{h.display}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <EvidenceBadge grade={h.grade} />
                        </td>
                        <td className="px-3 py-2.5 font-mono text-ink-3 text-[11px]">
                          {h.source || h.changedBy || '—'}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-ink-3 text-[11px] whitespace-nowrap">
                          {formatDate(h.validFrom)} → {h.validTo ? formatDate(h.validTo) : 'Current'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
