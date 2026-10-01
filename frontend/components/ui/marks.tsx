import * as React from 'react';
import type { EvidenceGrade, CheckStatus, CriticalityLevel } from '@/types/view';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';

export interface EvidenceDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  grade: EvidenceGrade;
  source?: string | null;
  observedAt?: string | null;
}

export function EvidenceDot({ grade, source, observedAt, className, ...props }: EvidenceDotProps) {
  const gradeLabel = grade.charAt(0).toUpperCase() + grade.slice(1);
  const timeLabel = observedAt ? `synced ${formatTime(observedAt)}` : null;
  const parts = [gradeLabel, source, timeLabel].filter(Boolean);
  const tooltip = parts.join(' · ');

  const colorClass = {
    stated: 'bg-ev-stated',
    inferred: 'bg-ev-inferred',
    confirmed: 'bg-ev-confirmed',
    unknown: 'bg-ev-unknown',
  }[grade];

  return (
    <span
      role="img"
      aria-label={tooltip}
      title={tooltip}
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', colorClass, className)}
      {...props}
    />
  );
}

export interface EvidenceBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  grade: EvidenceGrade;
}

export function EvidenceBadge({ grade, className, children, ...props }: EvidenceBadgeProps) {
  const colorClasses = {
    stated: 'bg-ev-stated/10 text-ev-stated',
    inferred: 'bg-ev-inferred/10 text-ev-inferred',
    confirmed: 'bg-ev-confirmed/10 text-ev-confirmed',
    unknown: 'bg-ev-unknown/10 text-ev-unknown',
  }[grade];

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-badge',
        colorClasses,
        className,
      )}
      {...props}
    >
      {children ?? (grade.charAt(0).toUpperCase() + grade.slice(1))}
    </span>
  );
}

export interface CheckStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: CheckStatus;
}

export function CheckStatusBadge({ status, className, children, ...props }: CheckStatusBadgeProps) {
  const colorClasses = {
    PASS: 'bg-st-pass/10 text-st-pass',
    FAIL: 'bg-st-fail/10 text-st-fail',
    UNKNOWN: 'bg-st-unknown/10 text-st-unknown',
  }[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-badge',
        colorClasses,
        className,
      )}
      {...props}
    >
      {children ?? status}
    </span>
  );
}

export interface CriticalityDotsProps extends React.HTMLAttributes<HTMLSpanElement> {
  level: CriticalityLevel | 'unknown';
}

export function CriticalityDots({ level, className, ...props }: CriticalityDotsProps) {
  const config = {
    critical: { dots: '●●●●', label: 'Critical', textClass: 'text-ink-2' },
    high: { dots: '●●●○', label: 'High', textClass: 'text-ink-2' },
    medium: { dots: '●●○○', label: 'Medium', textClass: 'text-ink-2' },
    low: { dots: '●○○○', label: 'Low', textClass: 'text-ink-2' },
    unknown: { dots: '○○○○', label: 'Unknown', textClass: 'text-ev-unknown' },
  }[level] ?? { dots: '○○○○', label: 'Unknown', textClass: 'text-ev-unknown' };

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-sm tabular-nums', config.textClass, className)}
      aria-label={`Criticality: ${config.label}`}
      {...props}
    >
      <span className="tracking-tighter select-none font-mono" aria-hidden="true">
        {config.dots}
      </span>{' '}
      <span>{config.label}</span>
    </span>
  );
}

export interface UnknownValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  onAskOwner?: () => void;
  askOwnerLabel?: string;
}

export function UnknownValue({ onAskOwner, askOwnerLabel = 'Ask owner', className, ...props }: UnknownValueProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} {...props}>
      <span className="inline-flex items-center px-1.5 py-0.5 text-xs border border-dashed border-ev-unknown text-ev-unknown rounded-badge">
        Unknown
      </span>
      {onAskOwner && (
        <button
          type="button"
          onClick={onAskOwner}
          className="text-xs text-amber-ink hover:underline cursor-pointer focus:outline-none"
        >
          {askOwnerLabel}
        </button>
      )}
    </span>
  );
}

export interface NoneValueProps extends React.HTMLAttributes<HTMLSpanElement> {}

export function NoneValue({ className, ...props }: NoneValueProps) {
  return (
    <span className={cn('text-sm font-semibold text-st-fail', className)} {...props}>
      None
    </span>
  );
}
