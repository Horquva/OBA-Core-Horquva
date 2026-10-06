'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

interface SettingsTab {
  href: string;
  label: string;
}

const tabs: SettingsTab[] = [
  { href: '/settings/connections', label: 'Connections & Sync' },
  { href: '/settings/identity', label: 'Identity Queue' },
  { href: '/settings/users', label: 'Users & Roles' },
  { href: '/settings/organization', label: 'Organization' },
  { href: '/settings/audit-log', label: 'Audit Trail' },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-rule/50">
        <h1 className="font-serif text-3xl md:text-4xl text-ink font-normal">
          Settings
        </h1>
        <p className="text-sm text-ink-3 mt-1">
          Manage system connectors, identity resolution, team thresholds, and immutable audit logs.
        </p>

        {/* Settings Navigation Tabs */}
        <nav
          aria-label="Settings sections"
          className="flex items-center gap-1 overflow-x-auto pt-6"
        >
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'rounded-control px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber',
                  isActive
                    ? 'bg-amber/15 text-amber-ink font-semibold border border-amber/30'
                    : 'text-ink-2 hover:bg-surface-sunken hover:text-ink'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div>{children}</div>
    </div>
  );
}
