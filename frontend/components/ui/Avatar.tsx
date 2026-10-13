import * as React from 'react';
import { cn } from '@/lib/cn';

/** Brand tints only (never status colours): the same name always gets the same tint. */
const TINTS = [
  'bg-[color-mix(in_srgb,var(--bronze)_20%,transparent)] text-bronze-ink',
  'bg-[color-mix(in_srgb,var(--amber)_18%,transparent)] text-amber-ink',
  'bg-[color-mix(in_srgb,var(--bronze-deep)_16%,transparent)] text-bronze-deep',
  'bg-surface-sunken text-ink-2',
];

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function tintFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function Avatar({ name, size = 32, className }: { name: string; size?: 28 | 32 | 36 | 56; className?: string }) {
  const dims = { 28: 'h-7 w-7 text-[11px]', 32: 'h-8 w-8 text-xs', 36: 'h-9 w-9 text-[13px]', 56: 'h-14 w-14 text-lg' }[size];
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold', dims, tintFor(name), className)}
    >
      {initialsOf(name)}
    </span>
  );
}
