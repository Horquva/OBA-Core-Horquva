'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import {
  MessageSquareText,
  LayoutDashboard,
  UserMinus,
  Users,
  Layers,
  Network,
  Sliders,
  CheckSquare,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Brand } from './Brand';
import { NavItem } from './NavItem';
import { UserMenu } from './UserMenu';

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  compact?: boolean;
  departuresCount?: number;
  actionsCount?: number;
  settingsCount?: number;
}

export function Sidebar({
  compact = false,
  departuresCount,
  actionsCount,
  settingsCount,
  className,
  ...props
}: SidebarProps) {
  const pathname = usePathname();

  const isNavActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const navItems = [
    {
      href: '/',
      label: 'Ask OBA',
      icon: <MessageSquareText className="h-4 w-4" />,
    },
    {
      href: '/overview',
      label: 'Overview',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      href: '/departures',
      label: 'Departures',
      icon: <UserMinus className="h-4 w-4" />,
      count: departuresCount,
    },
    {
      href: '/people',
      label: 'People & Teams',
      icon: <Users className="h-4 w-4" />,
    },
    {
      href: '/assets',
      label: 'Assets',
      icon: <Layers className="h-4 w-4" />,
    },
    {
      href: '/map',
      label: 'Map',
      icon: <Network className="h-4 w-4" />,
    },
    {
      href: '/what-if',
      label: 'What-If',
      icon: <Sliders className="h-4 w-4" />,
    },
    {
      href: '/actions',
      label: 'Actions',
      icon: <CheckSquare className="h-4 w-4" />,
      count: actionsCount,
    },
  ];

  return (
    <aside
      aria-label="Main sidebar"
      className={cn(
        'hidden md:flex flex-col h-screen select-none border-r border-rule bg-canvas transition-[width] duration-200 shrink-0 sticky top-0',
        compact ? 'w-[72px]' : 'w-[248px]',
        className
      )}
      {...props}
    >
      {/* Brand Header */}
      <div className={cn('h-16 flex items-center border-b border-rule/60 px-4', compact && 'justify-center px-2')}>
        <Brand compact={compact} />
      </div>

      {/* Primary Navigation */}
      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            count={item.count}
            isActive={isNavActive(item.href)}
            compact={compact}
          />
        ))}
      </nav>

      {/* Pinned Bottom Footer: Settings & User Menu */}
      <div className="border-t border-rule/70 p-3 space-y-2 bg-canvas/80 backdrop-blur-xs">
        <NavItem
          href="/settings"
          label="Settings"
          icon={<Settings className="h-4 w-4" />}
          count={settingsCount}
          isActive={isNavActive('/settings')}
          compact={compact}
        />

        <div className="pt-1">
          <UserMenu compact={compact} />
        </div>
      </div>
    </aside>
  );
}
