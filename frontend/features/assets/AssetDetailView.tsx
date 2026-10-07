'use client';

import * as React from 'react';
import Link from 'next/link';
import type { AssetDetail, CheckStatus } from '@/types/view';
import { Card } from '@/components/ui/Card';
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

export interface AssetDetailViewProps {
  id: string;
  initialDetail?: AssetDetail;
}

export function AssetDetailView({ id, initialDetail }: AssetDetailViewProps) {
  const assetResource = useResource<AssetDetail>(
    `asset-standalone-${id}`,
    () => fetchAssetDetail(id),
  );

  const detail =
    assetResource.status === 'ready'
      ? assetResource.data
      : initialDetail;

  if (assetResource.status === 'loading' && !detail) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        <Skeleton variant="text" className="w-1/4 h-5" />
        <Skeleton variant="card" className="h-48" />
        <Skeleton variant="card" className="h-96" />
      </div>
    );
  }

  if (assetResource.status === 'error' && !detail) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <ErrorState
          onRetry={assetResource.reload}
          message="We couldn't load the details for this asset."
          lastLoadedAt={assetResource.lastLoadedAt || undefined}
        />
      </div>
    );
  }

  if (!detail) return null;

  const upperStatus = detail.asset.checkStatus.toUpperCase() as CheckStatus;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Back Link & Header */}
      <div className="space-y-4">
        <Link
          href="/assets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-ink transition-colors"
        >
          <span aria-hidden="true">←</span>
          <span>Back to Assets Catalog</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/50 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
                Asset Specification
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl text-ink font-semibold tracking-tight">
              {detail.asset.name}
            </h1>
            <p className="text-xs text-ink-3 font-mono">
              <span className="capitalize">{detail.asset.kind}</span> · ID: {detail.asset.id}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <CheckStatusBadge status={upperStatus} />
          </div>
        </div>
      </div>

      {/* Facts Card */}
      <Card className="p-6 bg-surface shadow-card space-y-6">
        <h2 className="text-sm font-semibold text-ink">Core Facts & Continuity Attributes</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          <div>
            <p className="text-ink-3 mb-1 font-mono">Criticality Rating</p>
            <div className="flex items-center gap-2">
              <CriticalityDots level={detail.asset.criticality.level} />
              <EvidenceDot grade={detail.asset.criticality.grade} />
            </div>
          </div>

          <div>
            <p className="text-ink-3 mb-1 font-mono">Weekly Execution Volume</p>
            <p className="font-semibold text-ink text-sm">
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
              <EvidenceDot grade={detail.asset.owner.grade} source={detail.asset.owner.source} />
              {detail.asset.owner.state === 'value' ? (
                <span className="font-medium text-ink">{detail.asset.owner.display}</span>
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
              <EvidenceDot grade={detail.asset.backup.grade} source={detail.asset.backup.source} />
              {detail.asset.backup.state === 'value' ? (
                <span className="font-medium text-ink">{detail.asset.backup.display}</span>
              ) : detail.asset.backup.state === 'unknown' ? (
                <UnknownValue />
              ) : (
                <NoneValue />
              )}
            </div>
          </div>

          <div>
            <p className="text-ink-3 mb-1 font-mono">Documentation Link</p>
            <div className="flex items-center gap-1.5">
              <EvidenceDot grade={detail.asset.documented.grade} />
              {detail.asset.documented.state === 'value' ? (
                <span className="text-ink truncate">{detail.asset.documented.display}</span>
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
                <span className="text-ink truncate">{detail.asset.fallback.display}</span>
              ) : detail.asset.fallback.state === 'unknown' ? (
                <UnknownValue />
              ) : (
                <NoneValue />
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Continuity Checks Breakdown */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-ink">
          Continuity Check Results ({detail.checks.length})
        </h2>

        {detail.checks.length === 0 ? (
          <p className="text-xs text-ink-3 italic">No check results recorded.</p>
        ) : (
          <div className="divide-y divide-rule border border-rule rounded-card bg-surface overflow-hidden shadow-xs">
            {detail.checks.map((c) => {
              const st = c.status.toUpperCase() as CheckStatus;
              return (
                <div key={c.checkId} className="p-4 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-ink text-sm">
                      {c.checkId}
                    </span>
                    <CheckStatusBadge status={st} />
                  </div>
                  <p className="text-ink-2 leading-relaxed">{c.reason}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dependencies Topology */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-ink">Dependency Topology</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card className="p-5 bg-surface space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono flex items-center justify-between">
              <span>Upstream Dependencies</span>
              <span>{detail.upstream.length}</span>
            </h3>
            {detail.upstream.length === 0 ? (
              <p className="text-xs text-ink-3 italic">None (root asset)</p>
            ) : (
              <ul className="divide-y divide-rule text-xs">
                {detail.upstream.map((u) => (
                  <li key={u.id} className="py-2 flex items-center justify-between gap-2">
                    <Link
                      href={`/assets/${u.id}`}
                      className="font-medium text-ink hover:text-amber-ink transition-colors truncate"
                    >
                      {u.name}
                    </Link>
                    <span className="px-1.5 py-0.2 rounded-badge bg-surface-sunken text-[10px] font-mono uppercase text-ink-3 shrink-0">
                      {u.kind}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5 bg-surface space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono flex items-center justify-between">
              <span>Downstream Dependents</span>
              <span>{detail.downstream.length}</span>
            </h3>
            {detail.downstream.length === 0 ? (
              <p className="text-xs text-ink-3 italic">None (leaf asset)</p>
            ) : (
              <ul className="divide-y divide-rule text-xs">
                {detail.downstream.map((d) => (
                  <li key={d.id} className="py-2 flex items-center justify-between gap-2">
                    <Link
                      href={`/assets/${d.id}`}
                      className="font-medium text-ink hover:text-amber-ink transition-colors truncate"
                    >
                      {d.name}
                    </Link>
                    <span className="px-1.5 py-0.2 rounded-badge bg-surface-sunken text-[10px] font-mono uppercase text-ink-3 shrink-0">
                      {d.kind}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* SCD2 Fact History Timeline */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-ink">SCD2 Fact History Timeline</h2>

        {detail.history.length === 0 ? (
          <p className="text-xs text-ink-3 italic">No revision history found.</p>
        ) : (
          <div className="border border-rule rounded-card bg-surface overflow-x-auto shadow-xs" tabIndex={0} role="region" aria-label="Fact history">
            <table className="w-full text-left text-xs text-ink">
              <thead className="border-b border-rule bg-surface-sunken/40 font-mono text-[11px] uppercase text-ink-3">
                <tr>
                  <th scope="col" className="px-4 py-3">Attribute</th>
                  <th scope="col" className="px-4 py-3">Value</th>
                  <th scope="col" className="px-4 py-3">Grade</th>
                  <th scope="col" className="px-4 py-3">Source / Actor</th>
                  <th scope="col" className="px-4 py-3">Effective Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule font-sans">
                {detail.history.map((h, i) => (
                  <tr key={`${h.attribute}-${h.validFrom}-${i}`} className="hover:bg-surface-sunken/20">
                    <td className="px-4 py-3 font-mono text-ink-2 font-medium">
                      {h.attribute}
                    </td>
                    <td className="px-4 py-3">
                      {h.state === 'none' ? (
                        <NoneValue />
                      ) : h.state === 'unknown' ? (
                        <UnknownValue />
                      ) : (
                        <span className="font-medium text-ink">{h.display}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EvidenceBadge grade={h.grade} />
                    </td>
                    <td className="px-4 py-3 font-mono text-ink-3 text-[11px]">
                      {h.source || h.changedBy || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-ink-3 text-[11px] whitespace-nowrap">
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
  );
}
