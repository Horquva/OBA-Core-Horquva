'use client';

import * as React from 'react';
import Link from 'next/link';
import type { Holding } from '@/types/view';
import { EntityKindIcon } from '@/components/ui/EntityKindIcon';
import { CriticalityDots, EvidenceBadge, NoneValue, UnknownValue } from '@/components/ui/marks';
import { cn } from '@/lib/cn';
import { RELATION_LABEL, RELATION_PILL } from './peopleFacts';

/** What one person holds: asset, their relation to it, criticality and the backup on record. */
export function HoldingsTable({ holdings, label, compact = false }: { holdings: Holding[]; label: string; compact?: boolean }) {
  const pad = compact ? 'py-2.5' : 'py-3';
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={label}>
      <table className="w-full text-left">
        <thead>
          <tr className="type-meta border-b border-rule text-ink-3">
            <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Asset</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Their role</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Criticality</th>
            <th scope="col" className="py-2.5 pl-3 pr-5 font-medium">Backup on record</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {holdings.map((h) => (
            <tr key={`${h.asset.id}-${h.relation}`} className="transition-colors hover:bg-surface-sunken/40">
              <td className={cn(pad, 'pl-5 pr-3')}>
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-rule bg-surface-sunken text-ink-2">
                    <EntityKindIcon kind={h.asset.kind} />
                  </span>
                  <Link href={`/assets/${h.asset.id}`} className="text-sm font-medium text-ink transition-colors hover:text-amber-ink">
                    {h.asset.name}
                  </Link>
                </div>
              </td>
              <td className={cn(pad, 'px-3')}>
                <span className={cn('inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium', RELATION_PILL[h.relation])}>
                  {RELATION_LABEL[h.relation]}
                </span>
              </td>
              <td className={cn(pad, 'px-3')}>
                <CriticalityDots level={h.criticality} />
              </td>
              <td className={cn(pad, 'whitespace-nowrap pl-3 pr-5')}>
                <div className="type-meta flex items-center gap-1.5">
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
