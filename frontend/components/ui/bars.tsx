import * as React from 'react';
import Link from 'next/link';
import type { EntityRef } from '@/types/view';
import { cn } from '@/lib/cn';

export interface SegmentItem {
  count: number;
  label: string;
  colorClass: string;
  href?: string;
}

export interface SegmentedBarProps extends React.HTMLAttributes<HTMLDivElement> {
  segments: SegmentItem[];
  total?: number;
  label?: string;
}

export function SegmentedBar({ segments, total: explicitTotal, label = 'Distribution breakdown', className, ...props }: SegmentedBarProps) {
  const sum = segments.reduce((acc, s) => acc + s.count, 0);
  const total = explicitTotal ?? (sum > 0 ? sum : 1);

  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={sum}
        className="flex h-3 w-full overflow-hidden rounded-full bg-surface-sunken"
      >
        {segments.map((seg, idx) => {
          const pct = Math.max(0, Math.min(100, (seg.count / total) * 100));
          if (pct === 0) return null;
          return (
            <div
              key={idx}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${seg.count}`}
              className={cn('h-full transition-all duration-300', seg.colorClass)}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-ink-2">
        {segments.map((seg, idx) => {
          const content = (
            <span key={idx} className="inline-flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full shrink-0', seg.colorClass)} aria-hidden="true" />
              <span>
                <strong className="font-semibold text-ink tabular-nums">{seg.count}</strong> {seg.label}
              </span>
            </span>
          );
          if (seg.href) {
            return (
              <Link
                key={idx}
                href={seg.href}
                className="hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-amber"
              >
                {content}
              </Link>
            );
          }
          return content;
        })}
      </div>
    </div>
  );
}

export interface NamedShareHolder {
  person: EntityRef;
  sharePct: number;
}

export interface NamedShareBarProps extends React.HTMLAttributes<HTMLDivElement> {
  holders: NamedShareHolder[];
}

export function NamedShareBar({ holders, className, ...props }: NamedShareBarProps) {
  const colors = ['bg-bronze', 'bg-bronze-deep', 'bg-amber', 'bg-ink-3', 'bg-ev-stated'];

  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-sunken">
        {holders.map((holder, idx) => (
          <div
            key={holder.person.id}
            style={{ width: `${holder.sharePct}%` }}
            title={`${holder.person.name}: ${holder.sharePct}%`}
            className={cn('h-full transition-all', colors[idx % colors.length])}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {holders.map((holder, idx) => (
          <span key={holder.person.id} className="inline-flex items-center gap-1.5 text-ink-2">
            <span className={cn('h-2 w-2 rounded-full shrink-0', colors[idx % colors.length])} aria-hidden="true" />
            <span className="font-medium text-ink">{holder.person.name}</span>
            <span className="text-ink-3 tabular-nums font-mono">{holder.sharePct}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
