import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * Panel: the content container for polished screens. A hairline-bordered surface with an
 * optional header bar; rows inside are divided by hairlines rather than boxed.
 */
export function Panel({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn('rounded-panel border border-rule bg-surface shadow-panel', className)}
      {...props}
    >
      {children}
    </section>
  );
}

export interface PanelHeaderProps {
  title: string;
  /** A 16px lucide icon, drawn faint before the title. */
  icon?: React.ReactNode;
  /** Rendered beside the title in muted tabular figures, e.g. a row count. */
  count?: number;
  description?: string;
  action?: { label: string; href: string };
  /** Id for the title, so the panel can be labelled by it. */
  titleId?: string;
  className?: string;
}

export function PanelHeader({ title, icon, count, description, action, titleId, className }: PanelHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4 border-b border-rule px-5 py-3', className)}>
      <div className="min-w-0">
        <h2 id={titleId} className="type-heading flex items-center gap-2 text-ink">
          {icon && (
            <span aria-hidden="true" className="inline-flex text-ink-3 [&_svg]:h-4 [&_svg]:w-4">
              {icon}
            </span>
          )}
          <span>{title}</span>
          {count !== undefined && <span className="font-medium text-ink-3 tabular-nums">{count}</span>}
        </h2>
        {description && <p className={cn('type-meta mt-0.5 text-ink-3', icon && 'pl-6')}>{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="type-meta group inline-flex shrink-0 items-center gap-1 font-medium text-ink-2 transition-colors hover:text-ink"
        >
          {action.label}
          <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
        </Link>
      )}
    </div>
  );
}

export function PanelBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-4', className)} {...props}>
      {children}
    </div>
  );
}
