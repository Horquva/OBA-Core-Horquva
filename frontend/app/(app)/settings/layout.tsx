'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session';
import { canManageSettings } from '@/lib/permissions';

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
  const { session, isLoading } = useSession();
  // Every settings API is admin-only (RBAC); show that instead of five error states.
  const allowed = canManageSettings(session);

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-rule/50">
        <h1 className="text-2xl sm:text-3xl text-ink font-semibold">
          Settings
        </h1>
        <p className="text-sm text-ink-3 mt-1">
          Connectors, identity review, users, team thresholds, and the audit log.
        </p>

        {/* Settings Navigation Tabs */}
        {allowed && <nav
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
        </nav>}
      </div>

      {allowed ? (
        <div>{children}</div>
      ) : isLoading ? null : (
        <p role="status" className="rounded-card border border-rule bg-surface p-5 text-sm text-ink-3">
          Settings are managed by admins. Ask an OBA admin if something here needs changing.
        </p>
      )}
    </div>
  );
}
