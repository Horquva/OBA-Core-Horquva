import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  isActive?: boolean;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

export function NavItem({
  href,
  label,
  icon,
  count,
  isActive = false,
  compact = false,
  onClick,
  className,
}: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      title={compact ? label : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber',
        isActive
          ? 'bg-surface font-medium text-ink shadow-xs border border-rule/50'
          : 'text-ink-2 hover:bg-surface-sunken hover:text-ink font-normal',
        compact && 'justify-center px-2',
        className
      )}
    >
      <span
        className={cn(
          'shrink-0 h-5 w-5 flex items-center justify-center transition-colors',
          isActive ? 'text-amber-ink' : 'text-ink-3 group-hover:text-ink-2'
        )}
        aria-hidden="true"
      >
        {icon}
      </span>

      {!compact && (
        <span className="flex-1 truncate leading-none">{label}</span>
      )}

      {!compact && typeof count === 'number' && count > 0 && (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-mono font-medium tabular-nums leading-none',
            isActive ? 'bg-amber/15 text-amber-ink' : 'bg-surface-sunken text-ink-3 group-hover:text-ink'
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}

      {/* Amber dot at the right edge for active nav item per UX §7.2 */}
      {isActive && !compact && (!count || count <= 0) && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-amber shrink-0 ml-1"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
