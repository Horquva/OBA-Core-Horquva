import * as React from 'react';
import type { EntityKind, EvidenceGrade } from '@/types/view';
import { cn } from '@/lib/cn';
import { EvidenceDot } from './marks';

export interface EntityChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  id: string;
  name: string;
  kind?: EntityKind;
  grade?: EvidenceGrade;
  onInspect?: (id: string, kind?: EntityKind) => void;
}

export function EntityChip({
  id,
  name,
  kind = 'automation',
  grade = 'stated',
  onInspect,
  className,
  ...props
}: EntityChipProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(e);
    onInspect?.(id, kind);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Inspect ${name} (${kind})`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-2.5 py-0.5 text-xs font-medium text-ink transition-colors',
        'hover:border-ink-2 hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber',
        'select-none cursor-pointer',
        className
      )}
      {...props}
    >
      <EvidenceDot grade={grade} source={`Verified ${kind}`} />
      <span className="font-semibold text-ink">{name}</span>
      <span className="text-[10px] uppercase tracking-wider text-ink-3">({kind})</span>
    </button>
  );
}
