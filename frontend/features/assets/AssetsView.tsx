'use client';

import * as React from 'react';
import Link from 'next/link';
import type { AssetRow, CheckStatus, EntityKind } from '@/types/view';
import { Card } from '@/components/ui/Card';
import {
  CriticalityDots,
  EvidenceBadge,
  EvidenceDot,
  CheckStatusBadge,
  NoneValue,
  UnknownValue,
} from '@/components/ui/marks';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchAssets } from '@/lib/api/assets';
import { AssetDrawer } from './AssetDrawer';
import { cn } from '@/lib/cn';

export interface AssetsViewProps {
  initialAssets?: AssetRow[];
  defaultSelectedAssetId?: string | null;
}

type KindTab = 'all' | 'automation' | 'model' | 'credential' | 'vendor' | 'system';

/** Tabs map to backend EntityKind values ('system' covers apps and processes). */
const TAB_KINDS: Record<Exclude<KindTab, 'all'>, string[]> = {
  automation: ['automation'],
  model: ['model'],
  credential: ['credential'],
  vendor: ['vendor'],
  system: ['app', 'process'],
};

function inTab(kind: string, tab: KindTab): boolean {
  return tab === 'all' || TAB_KINDS[tab].includes(kind);
}
type CriticalityFilter = 'all' | 'critical_only';
type StatusFilter = 'all' | 'fail' | 'unknown' | 'pass';

export function AssetsView({
  initialAssets,
  defaultSelectedAssetId = null,
}: AssetsViewProps) {
  const assetsResource = useResource<AssetRow[]>(
    'assets-catalog-list',
    fetchAssets,
  );

  const assetsData =
    assetsResource.status === 'ready'
      ? assetsResource.data
      : initialAssets || [];

  const [activeTab, setActiveTab] = React.useState<KindTab>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [criticalityFilter, setCriticalityFilter] =
    React.useState<CriticalityFilter>('all');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [onlyUnknownFacts, setOnlyUnknownFacts] = React.useState(false);

  const [selectedAssetId, setSelectedAssetId] = React.useState<string | null>(
    defaultSelectedAssetId,
  );

  // Filter logic
  const filteredAssets = React.useMemo(() => {
    return assetsData.filter((asset) => {
      // Kind Tab
      if (!inTab(asset.kind, activeTab)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = asset.name.toLowerCase().includes(q);
        const matchesOwner =
          asset.owner.display?.toLowerCase().includes(q) || false;
        const matchesBackup =
          asset.backup.display?.toLowerCase().includes(q) || false;
        const matchesId = asset.id.toLowerCase().includes(q);
        if (!matchesName && !matchesOwner && !matchesBackup && !matchesId) {
          return false;
        }
      }

      // Criticality
      if (criticalityFilter === 'critical_only' && !asset.isCritical) {
        return false;
      }

      // Status
      if (statusFilter !== 'all') {
        const upper = asset.checkStatus.toUpperCase();
        if (statusFilter === 'fail' && upper !== 'FAIL') return false;
        if (statusFilter === 'unknown' && upper !== 'UNKNOWN') return false;
        if (statusFilter === 'pass' && upper !== 'PASS') return false;
      }

      // Has unknown facts
      if (onlyUnknownFacts) {
        const hasUnknown =
          asset.owner.state === 'unknown' ||
          asset.backup.state === 'unknown' ||
          asset.documented.state === 'unknown' ||
          asset.fallback.state === 'unknown' ||
          asset.runsPerWeek.state === 'unknown';
        if (!hasUnknown) return false;
      }

      return true;
    });
  }, [
    assetsData,
    activeTab,
    searchQuery,
    criticalityFilter,
    statusFilter,
    onlyUnknownFacts,
  ]);

  // Strict Invariant Sort:
  // 1. Failing critical
  // 2. Unknown critical
  // 3. Covered critical
  // 4. Non-critical
  // Secondary: Alphabetical by name
  const sortedAssets = React.useMemo(() => {
    return [...filteredAssets].sort((a, b) => {
      const getPriority = (item: AssetRow) => {
        const upper = item.checkStatus.toUpperCase();
        if (item.isCritical) {
          if (upper === 'FAIL') return 1;
          if (upper === 'UNKNOWN') return 2;
          if (upper === 'PASS') return 3;
        }
        return 4;
      };

      const pA = getPriority(a);
      const pB = getPriority(b);

      if (pA !== pB) return pA - pB;
      return a.name.localeCompare(b.name);
    });
  }, [filteredAssets]);

  // Metric counts
  const counts = React.useMemo(() => {
    const total = assetsData.length;
    const critical = assetsData.filter((a) => a.isCritical).length;
    const failing = assetsData.filter((a) => a.checkStatus.toUpperCase() === 'FAIL').length;
    // Same definition as the "Has unknown facts" filter, so the counter and the filter agree.
    const unknown = assetsData.filter(
      (a) =>
        a.owner.state === 'unknown' ||
        a.backup.state === 'unknown' ||
        a.documented.state === 'unknown' ||
        a.fallback.state === 'unknown' ||
        a.runsPerWeek.state === 'unknown',
    ).length;

    return { total, critical, failing, unknown };
  }, [assetsData]);

  const tabs: Array<{ id: KindTab; label: string }> = [
    { id: 'all', label: 'All Assets' },
    { id: 'automation', label: 'Automations' },
    { id: 'model', label: 'AI Models' },
    { id: 'credential', label: 'Credentials' },
    { id: 'vendor', label: 'Vendors' },
    { id: 'system', label: 'Systems' },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/50 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
              System Inventory
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl text-ink font-semibold tracking-tight">
            Assets Catalog
          </h1>
          <p className="text-sm text-ink-3 mt-1">
            Automations, AI models, credentials, vendors, and core systems.
          </p>
        </div>

        {/* Fact Metric Counters */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="rounded-control bg-surface border border-rule px-3 py-1.5 shadow-xs">
            <span className="text-ink-3">Total: </span>
            <strong className="text-ink tabular-nums">{counts.total}</strong>
          </div>
          <div className="rounded-control bg-surface border border-rule px-3 py-1.5 shadow-xs">
            <span className="text-ink-3">Critical: </span>
            <strong className="text-ink tabular-nums">{counts.critical}</strong>
          </div>
          <div className="rounded-control bg-surface border border-rule px-3 py-1.5 shadow-xs">
            <span className="text-ink-3">Failing Checks: </span>
            <strong className="text-st-fail tabular-nums">{counts.failing}</strong>
          </div>
          <div className="rounded-control bg-surface border border-rule px-3 py-1.5 shadow-xs">
            <span className="text-ink-3">Unknown Facts: </span>
            <strong className="text-ev-unknown tabular-nums">{counts.unknown}</strong>
          </div>
        </div>
      </div>

      {/* Tabs by Asset Kind */}
      <div className="flex items-center gap-1 border-b border-rule overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const count =
            tab.id === 'all'
              ? assetsData.length
              : assetsData.filter((a) => inTab(a.kind, tab.id)).length;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2',
                isActive
                  ? 'border-amber text-amber-ink font-semibold'
                  : 'border-transparent text-ink-3 hover:text-ink hover:border-rule',
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-badge text-[11px] font-mono',
                  isActive
                    ? 'bg-amber/15 text-amber-ink'
                    : 'bg-surface-sunken text-ink-3',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="w-full md:w-80">
          <input
            type="search"
            aria-label="Search assets catalog"
            placeholder="Search assets, owners, backups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-control border border-rule bg-surface px-3 py-1.5 text-xs text-ink placeholder:text-ink-3 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Criticality */}
          <div className="flex items-center gap-1 border border-rule rounded-control p-0.5 bg-surface">
            <button
              type="button"
              onClick={() => setCriticalityFilter('all')}
              className={cn(
                'px-2 py-1 rounded-control transition-colors cursor-pointer',
                criticalityFilter === 'all'
                  ? 'bg-amber text-on-amber font-semibold'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              All Criticalities
            </button>
            <button
              type="button"
              onClick={() => setCriticalityFilter('critical_only')}
              className={cn(
                'px-2 py-1 rounded-control transition-colors cursor-pointer',
                criticalityFilter === 'critical_only'
                  ? 'bg-amber text-on-amber font-semibold'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              Critical Only
            </button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1 border border-rule rounded-control p-0.5 bg-surface">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={cn(
                'px-2 py-1 rounded-control transition-colors cursor-pointer',
                statusFilter === 'all'
                  ? 'bg-surface-sunken font-semibold text-ink'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('fail')}
              className={cn(
                'px-2 py-1 rounded-control transition-colors cursor-pointer',
                statusFilter === 'fail'
                  ? 'bg-st-fail/15 text-st-fail font-semibold'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              Failing
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('unknown')}
              className={cn(
                'px-2 py-1 rounded-control transition-colors cursor-pointer',
                statusFilter === 'unknown'
                  ? 'bg-st-unknown/15 text-st-unknown font-semibold'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              Unknown
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pass')}
              className={cn(
                'px-2 py-1 rounded-control transition-colors cursor-pointer',
                statusFilter === 'pass'
                  ? 'bg-st-pass/15 text-st-pass font-semibold'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              Passing
            </button>
          </div>

          {/* Has Unknown Facts Toggle */}
          <button
            type="button"
            onClick={() => setOnlyUnknownFacts(!onlyUnknownFacts)}
            aria-pressed={onlyUnknownFacts}
            className={cn(
              'px-2.5 py-1 rounded-control border transition-colors cursor-pointer flex items-center gap-1.5',
              onlyUnknownFacts
                ? 'border-ev-unknown bg-ev-unknown/10 text-ev-unknown font-semibold'
                : 'border-rule bg-surface text-ink-3 hover:text-ink',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                onlyUnknownFacts ? 'bg-ev-unknown' : 'bg-ink-3/40',
              )}
              aria-hidden="true"
            />
            <span>Has Unknown Facts</span>
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      {assetsResource.status === 'loading' && !initialAssets ? (
        <div className="space-y-4">
          <Skeleton variant="card" className="h-12" />
          <Skeleton variant="card" className="h-12" />
          <Skeleton variant="card" className="h-12" />
          <Skeleton variant="card" className="h-12" />
          <Skeleton variant="card" className="h-12" />
        </div>
      ) : assetsResource.status === 'error' && !initialAssets ? (
        <div className="max-w-xl mx-auto py-12">
          <ErrorState
            onRetry={assetsResource.reload}
            message="We couldn't load the system assets inventory."
          />
        </div>
      ) : sortedAssets.length === 0 ? (
        <EmptyState
          title="No assets match your filters"
          description="Try adjusting your search criteria, criticality filter, or type category tab."
          actionLabel="Reset all filters"
          onAction={() => {

            setActiveTab('all');
            setSearchQuery('');
            setCriticalityFilter('all');
            setStatusFilter('all');
            setOnlyUnknownFacts(false);
          }}
        />
      ) : (
        <div className="border border-rule rounded-card bg-surface shadow-xs overflow-x-auto" tabIndex={0} role="region" aria-label="Assets table">
          <table className="w-full text-left text-xs text-ink" aria-label="Assets Catalog Table">
            <thead className="border-b border-rule bg-surface-sunken/40 font-mono text-[11px] uppercase text-ink-3">
              <tr>
                <th scope="col" className="px-4 py-3">Asset</th>
                <th scope="col" className="px-3 py-3">Type</th>
                <th scope="col" className="px-3 py-3">Criticality</th>
                <th scope="col" className="px-3 py-3">Check Status</th>
                <th scope="col" className="px-3 py-3">Owner</th>
                <th scope="col" className="px-3 py-3">Backup</th>
                <th scope="col" className="px-3 py-3">Runs / Wk</th>
                <th scope="col" className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule font-sans">
              {sortedAssets.map((asset) => {
                const upperStatus = asset.checkStatus.toUpperCase() as CheckStatus;

                return (
                  <tr
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Inspect ${asset.name}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedAssetId(asset.id);
                      }
                    }}
                    className={cn(
                      'h-12 transition-colors hover:bg-surface-sunken/40 cursor-pointer focus:outline-none focus:bg-surface-sunken/60',
                      selectedAssetId === asset.id && 'bg-surface-sunken/70',
                    )}
                  >
                    {/* Asset Name */}
                    <td className="px-4 py-2.5 font-medium text-ink">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[220px] sm:max-w-[280px]">
                          {asset.name}
                        </span>
                      </div>
                    </td>

                    {/* Type / Kind */}
                    <td className="px-3 py-2.5">
                      <span className="px-1.5 py-0.5 rounded-badge bg-surface-sunken text-[10px] font-mono capitalize text-ink-3">
                        {asset.kind}
                      </span>
                    </td>

                    {/* Criticality */}
                    <td className="px-3 py-2.5">
                      <CriticalityDots level={asset.criticality.level} />
                    </td>

                    {/* Check Status */}
                    <td className="px-3 py-2.5">
                      <CheckStatusBadge status={upperStatus} />
                    </td>

                    {/* Owner */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <EvidenceDot
                          grade={asset.owner.grade}
                          source={asset.owner.source}
                        />
                        {asset.owner.state === 'value' ? (
                          <span className="truncate max-w-[120px]">
                            {asset.owner.display}
                          </span>
                        ) : asset.owner.state === 'unknown' ? (
                          <UnknownValue />
                        ) : (
                          <NoneValue />
                        )}
                      </div>
                    </td>

                    {/* Backup */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <EvidenceDot
                          grade={asset.backup.grade}
                          source={asset.backup.source}
                        />
                        {asset.backup.state === 'value' ? (
                          <span className="truncate max-w-[120px]">
                            {asset.backup.display}
                          </span>
                        ) : asset.backup.state === 'unknown' ? (
                          <UnknownValue />
                        ) : (
                          <NoneValue />
                        )}
                      </div>
                    </td>

                    {/* Runs / Wk */}
                    <td className="px-3 py-2.5 font-mono text-ink-3 tabular-nums">
                      {asset.runsPerWeek.state === 'value' ? (
                        asset.runsPerWeek.display
                      ) : asset.runsPerWeek.state === 'unknown' ? (
                        <UnknownValue />
                      ) : (
                        '0'
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-amber-ink hover:underline font-semibold text-xs inline-flex items-center gap-1">
                        <span>Inspect</span>
                        <span aria-hidden="true">→</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer (560px) */}
      <AssetDrawer
        assetId={selectedAssetId}
        isOpen={!!selectedAssetId}
        onClose={() => setSelectedAssetId(null)}
      />
    </div>
  );
}
