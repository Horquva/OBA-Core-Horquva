'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UserMinus,
  Layers,
  CheckSquare,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export interface BottomTabBarProps extends React.HTMLAttributes<HTMLElement> {
  departuresCount?: number;
  actionsCount?: number;
}

interface TabItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

export function BottomTabBar({
  departuresCount,
  actionsCount,
  className,
  ...props
}: BottomTabBarProps) {
  const pathname = usePathname();

  const tabs: TabItem[] = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/departures', label: 'Departures', icon: UserMinus, count: departuresCount },
    { href: '/assets', label: 'Assets', icon: Layers },
    { href: '/actions', label: 'Actions', icon: CheckSquare, count: actionsCount },
    { href: '/settings', label: 'More', icon: MoreHorizontal },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-rule bg-surface px-2 md:hidden',
        'safe-area-bottom',
        className
      )}
      {...props}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center py-1 transition-colors',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber rounded-control',
              isActive ? 'text-amber-ink' : 'text-ink-3 hover:text-ink'
            )}
          >
            <div className="relative">
              <Icon className={cn('h-5 w-5', isActive ? 'text-amber-ink' : 'text-ink-3')} />
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className="absolute -top-1 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber px-1 text-[10px] font-mono font-semibold text-ink-night tabular-nums"
                  aria-label={`${tab.count} items`}
                >
                  {tab.count > 99 ? '99+' : tab.count}
                </span>
              )}
            </div>
            <span
              className={cn(
                'mt-1 text-[11px] leading-none',
                isActive ? 'font-semibold text-ink' : 'font-normal text-ink-3'
              )}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
