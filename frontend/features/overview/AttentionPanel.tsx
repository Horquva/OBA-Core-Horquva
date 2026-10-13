'use client';

import * as React from 'react';
import Link from 'next/link';
import { ListTodo } from 'lucide-react';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { cn } from '@/lib/cn';
import { ErrorState } from '@/components/ui/states';
import type { ActionView } from '@/types/view';

export interface AttentionPanelProps {
  /** undefined = loading, null = failed to load. */
  actions?: ActionView[] | null;
  onRetry?: () => void;
  className?: string;
}

const CATEGORY: Record<ActionView['type'], string> = {
  assign_backup: 'Single point of failure',
  confirm_facts: 'Unconfirmed facts',
  name_successor: 'Succession gap',
  move_credential: 'Personal credential',
  document: 'Undocumented',
  add_fallback: 'No fallback',
};

/**
 * Problems arrive as "Category: detail"; the category is shown on the meta line, so the
 * title keeps only the detail ("Unbacked critical asset …", not "Single point of failure: …").
 */
export function problemDetail(problem: string): string {
  const idx = problem.indexOf(': ');
  if (idx <= 0 || idx > 40) return problem;
  const rest = problem.slice(idx + 2).trim();
  return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : problem;
}

function RowSkeleton() {
  return (
    <li className="flex items-center gap-4 px-5 py-3.5">
      <span className="skeleton h-4 w-5" />
      <div className="flex-1 space-y-2">
        <span className="skeleton block h-4 w-3/4" />
        <span className="skeleton block h-3 w-1/3" />
      </div>
      <span className="skeleton h-6 w-6" />
    </li>
  );
}

export function AttentionPanel({ actions, onRetry, className }: AttentionPanelProps) {
  return (
    <Panel className={cn('flex flex-col', className)} aria-labelledby="attention-heading">
      <PanelHeader
        titleId="attention-heading"
        title="Needs your attention"
        icon={<ListTodo />}
        description="Open actions, ranked by the critical assets they put at risk."
        action={{ label: 'All actions', href: '/actions' }}
      />

      {actions === null && (
        <div className="p-5">
          <ErrorState onRetry={onRetry} message="We couldn't load priority actions." />
        </div>
      )}

      {actions === undefined && (
        <ul className="divide-y divide-rule">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </ul>
      )}

      {actions && actions.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
          <p className="type-heading text-ink">Nothing needs attention</p>
          <p className="type-meta mt-1 text-ink-3">Every continuity check on a critical asset is passing.</p>
        </div>
      )}

      {actions && actions.length > 0 && (
        <ol className="divide-y divide-rule">
          {actions.map((action, idx) => (
            <li key={action.id}>
              <Link
                href={`/actions?id=${encodeURIComponent(action.id)}`}
                className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-sunken/50"
              >
                <span className="type-meta w-5 shrink-0 font-medium text-ink-3 tabular-nums">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink" title={action.problem}>{problemDetail(action.problem)}</p>
                  <p className="type-meta mt-0.5 truncate text-ink-3">
                    <span className="text-bronze-ink">{CATEGORY[action.type] ?? 'Continuity risk'}</span>
                    <span aria-hidden="true"> · </span>
                    {action.asset.name}
                  </p>
                </div>
                <div className="shrink-0 text-right" title="Critical assets affected">
                  <span className="block text-base font-semibold leading-5 text-ink tabular-nums">
                    {action.criticalAssetsAffected}
                  </span>
                  <span className="block text-[11px] leading-4 text-ink-3">
                    critical {action.criticalAssetsAffected === 1 ? 'asset' : 'assets'}
                  </span>
                </div>
                <span aria-hidden="true" className="text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
