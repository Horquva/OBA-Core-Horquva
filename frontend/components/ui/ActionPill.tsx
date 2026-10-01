import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface ActionPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  icon?: React.ReactNode;
}

export const ActionPill = React.forwardRef<HTMLButtonElement, ActionPillProps>(function ActionPill(
  { children, className, href, icon, ...props },
  ref
) {
  const baseClasses = cn(
    'inline-flex h-8 items-center gap-1.5 rounded-control border border-rule bg-surface px-3 text-xs font-medium text-ink transition-colors',
    'hover:border-ink-2 hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber',
    'select-none cursor-pointer',
    className
  );

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {icon && <span className="shrink-0 text-ink-3" aria-hidden="true">{icon}</span>}
        <span>{children}</span>
      </Link>
    );
  }

  return (
    <button ref={ref} type="button" className={baseClasses} {...props}>
      {icon && <span className="shrink-0 text-ink-3" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </button>
  );
});
