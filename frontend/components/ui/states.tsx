import * as React from 'react';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'card' | 'row' | 'circular';
}

export function Skeleton({ variant = 'text', className, ...props }: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 w-full rounded-badge',
    card: 'h-32 w-full rounded-card',
    row: 'h-12 w-full rounded-control',
    circular: 'h-10 w-10 rounded-full',
  }[variant];

  return (
    <div
      aria-hidden="true"
      className={cn('skeleton', variantClasses, className)}
      {...props}
    />
  );
}

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
  lastLoadedAt?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  message = "We couldn't reach OBA.",
  lastLoadedAt,
  onRetry,
  retryLabel = 'Retry',
  className,
  ...props
}: ErrorStateProps) {
  const lastSyncText = lastLoadedAt ? `Last successful load ${formatTime(lastLoadedAt)}` : null;

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center bg-surface border border-rule rounded-card',
        className,
      )}
      {...props}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-st-fail/10 text-st-fail mb-3">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      </div>
      <p className="text-base font-medium text-ink mb-1">{message}</p>
      {lastSyncText && <p className="text-xs text-ink-3 mb-4">{lastSyncText}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-control bg-amber text-on-amber hover:opacity-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryAction?: React.ReactNode;
  icon?: React.ReactNode;
  headingLevel?: 'h2' | 'h3' | 'h4';
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  secondaryAction,
  icon,
  headingLevel = 'h2',
  className,
  ...props
}: EmptyStateProps) {
  const HeadingTag = headingLevel;
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center bg-surface border border-rule rounded-card',
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="mb-4 text-bronze">{icon}</div>
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-bronze mb-4">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
      )}
      <HeadingTag className="text-lg font-semibold text-ink mb-1">{title}</HeadingTag>
      <p className="text-sm text-ink-2 max-w-md mb-6">{description}</p>
      {(actionLabel || secondaryAction) && (
        <div className="flex items-center gap-3">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-control bg-amber text-on-amber hover:opacity-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber"
            >
              {actionLabel}
            </button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
