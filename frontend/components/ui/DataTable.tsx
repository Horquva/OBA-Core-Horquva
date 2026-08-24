'use client';

import React, { useState } from 'react';

export interface Column<T> {
  header: string;
  accessorKey: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({ columns, data, emptyMessage = 'No data available' }: DataTableProps<T>) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (idx: number) => {
    if (sortCol === idx) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(idx);
      setSortAsc(true);
    }
  };

  const sortedData = React.useMemo(() => {
    if (sortCol === null) return data;
    const col = columns[sortCol];
    return [...data].sort((a, b) => {
      let valA = typeof col.accessorKey === 'function' ? '' : a[col.accessorKey];
      let valB = typeof col.accessorKey === 'function' ? '' : b[col.accessorKey];
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [data, sortCol, sortAsc, columns]);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 bg-zinc-900/30 rounded-xl border border-zinc-800">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40">
      <table className="w-full text-left text-sm text-zinc-300">
        <thead className="bg-zinc-800/50 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`px-4 py-3 font-semibold ${col.sortable ? 'cursor-pointer hover:text-zinc-200 select-none' : ''}`}
                onClick={() => col.sortable && handleSort(idx)}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortCol === idx && (
                    <span>{sortAsc ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {sortedData.map((row, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-800/20 hover:bg-zinc-800/40 transition-colors'}>
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="px-4 py-3">
                  {typeof col.accessorKey === 'function'
                    ? col.accessorKey(row)
                    : (row[col.accessorKey] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}