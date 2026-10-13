'use client';

import * as React from 'react';
import Link from 'next/link';
import { Unplug } from 'lucide-react';
import { EntityKindIcon, kindLabel } from '@/components/ui/EntityKindIcon';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { ErrorState } from '@/components/ui/states';
import { formatNumber } from '@/lib/format';
import type { SpofAsset } from '@/types/view';

export interface SpofPanelProps {
  /** undefined = loading, null = failed to load. */
  assets?: SpofAsset[] | null;
  onRetry?: () => void;
  className?: string;
}

function KindIcon({ kind }: { kind: string }) {
  return (
    <span aria-hidden="true" className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-rule bg-surface-sunken text-ink-2">
      <EntityKindIcon kind={kind} />
    </span>
  );
}

export function SpofPanel({ assets, onRetry, className }: SpofPanelProps) {
  return (
    <Panel className={className} aria-labelledby="spof-heading">
      <PanelHeader
        titleId="spof-heading"
        title="Single points of failure"
        icon={<Unplug />}
        count={assets?.length}
        description="Critical assets that stop if one person or one credential goes away."
        action={{ label: 'All assets', href: '/assets' }}
      />

      {assets === null && (
        <div className="p-5">
          <ErrorState onRetry={onRetry} message="We couldn't load single points of failure." />
        </div>
      )}

      {assets === undefined && (
        <div className="space-y-3 px-5 py-4">
          <span className="skeleton block h-4 w-full" />
          <span className="skeleton block h-4 w-full" />
          <span className="skeleton block h-4 w-2/3" />
        </div>
      )}

      {assets && assets.length === 0 && (
        <div className="px-5 py-10 text-center">
          <p className="type-heading text-ink">No single points of failure</p>
          <p className="type-meta mt-1 text-ink-3">Every critical asset has a backup on record.</p>
        </div>
      )}

      {assets && assets.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="type-meta border-b border-rule text-ink-3">
                <th scope="col" className="w-12 py-2.5 pl-5 pr-2 font-medium">
                  <span className="sr-only">Rank</span>
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">Asset</th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">Why it&apos;s exposed</th>
                <th scope="col" className="py-2.5 pl-3 pr-5 text-right font-medium">Runs per week</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {assets.map((spof, idx) => (
                <tr key={spof.asset.id} className="group relative transition-colors hover:bg-surface-sunken/50">
                  <td className="type-meta py-3 pl-5 pr-2 align-top font-medium text-ink-3 tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex items-start gap-3">
                      <KindIcon kind={spof.asset.kind} />
                      <div className="min-w-0">
                        {/* The asset link covers the whole row (after:inset-0), so the row is one target. */}
                        <Link
                          href={`/assets/${spof.asset.id}`}
                          className="text-sm font-medium text-ink after:absolute after:inset-0 after:content-['']"
                        >
                          {spof.asset.name}
                        </Link>
                        <p className="type-meta mt-0.5 text-ink-3">{kindLabel(spof.asset.kind)}</p>
                        <p className="type-meta mt-1 text-ink-2 md:hidden">{spof.reason}</p>
                      </div>
                    </div>
                  </td>
                  <td className="type-meta hidden px-3 py-3 align-top text-ink-2 md:table-cell">{spof.reason}</td>
                  <td className="py-3 pl-3 pr-5 text-right align-top">
                    {spof.runsPerWeek === null ? (
                      <span className="type-meta text-ink-3">Unknown</span>
                    ) : (
                      <span className="text-sm font-medium text-ink tabular-nums">{formatNumber(spof.runsPerWeek)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
