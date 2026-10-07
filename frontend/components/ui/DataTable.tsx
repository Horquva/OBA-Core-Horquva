'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';
import { EmptyState } from './states';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
}

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  sort?: SortState;
  onSort?: (key: string, direction: SortDirection) => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  ariaLabel?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  sort,
  onSort,
  onRowClick,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching this criteria.',
  emptyAction,
  ariaLabel = 'Data table',
  className,
}: DataTableProps<T>) {
  const handleSort = (col: Column<T>) => {
    if (!col.sortable || !onSort) return;
    const isCurrent = sort?.key === col.key;
    const nextDir: SortDirection = isCurrent && sort?.direction === 'asc' ? 'desc' : 'asc';
    onSort(col.key, nextDir);
  };

  if (data.length === 0) {
    return (
      <div className={cn('w-full border border-rule rounded-card bg-surface overflow-hidden', className)}>
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyAction?.label}
          onAction={emptyAction?.onClick}
        />
      </div>
    );
  }

  return (
    <div tabIndex={0} role="region" aria-label={ariaLabel} className={cn('w-full overflow-x-auto border border-rule rounded-card bg-surface', className)}>
      <table className="w-full text-left text-sm border-collapse" aria-label={ariaLabel}>
        <thead className="sticky top-0 z-10 bg-surface-sunken/80 backdrop-blur-xs border-b border-rule">
          <tr>
            {columns.map((col) => {
              const isSorted = sort?.key === col.key;
              const ariaSort = !col.sortable
                ? undefined
                : isSorted
                ? sort?.direction === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none';

              return (
                <th
                  key={col.key}
                  scope="col"
                  style={{ width: col.width }}
                  aria-sort={ariaSort}
                  className={cn(
                    'h-10 px-4 text-xs font-semibold uppercase tracking-wider text-ink-3 select-none',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.sortable && 'cursor-pointer hover:text-ink'
                  )}
                  onClick={() => handleSort(col)}
                >
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      col.align === 'right' && 'justify-end',
                      col.align === 'center' && 'justify-center'
                    )}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-[10px] text-ink-3" aria-hidden="true">
                        {isSorted ? (sort?.direction === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-rule font-normal text-ink">
          {data.map((row, idx) => (
            <tr
              key={keyExtractor(row, idx)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'h-12 transition-colors hover:bg-surface-sunken/50',
                onRowClick && 'cursor-pointer'
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-4 align-middle text-sm whitespace-nowrap',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center'
                  )}
                >
                  {col.render ? col.render(row, idx) : (row as Record<string, any>)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
