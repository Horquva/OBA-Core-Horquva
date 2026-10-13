'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Fingerprint, Plug, ScrollText, Users, type LucideIcon } from 'lucide-react';
import type { IdentityQueueItemView } from '@/types/view';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session';
import { canManageSettings } from '@/lib/permissions';
import { useResource } from '@/lib/useResource';
import { fetchIdentityQueue } from '@/lib/api/settings';

interface SettingsTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

const tabs: SettingsTab[] = [
  { href: '/settings/connections', label: 'Connections', icon: Plug },
  { href: '/settings/identity', label: 'Identity review', icon: Fingerprint },
  { href: '/settings/users', label: 'Users & roles', icon: Users },
  { href: '/settings/organization', label: 'Organization', icon: Building2 },
  { href: '/settings/audit-log', label: 'Audit log', icon: ScrollText },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, isLoading } = useSession();
  // Every settings API is admin-only (RBAC); show that instead of five error states.
  const allowed = canManageSettings(session);
  // Same cache key as the Identity review page, so the count and the list agree.
  const queue = useResource<IdentityQueueItemView[]>(allowed ? 'settings-identity-queue' : null, fetchIdentityQueue);
  const waiting = queue.status === 'ready' ? queue.data.length : 0;

  return (
    <div className="space-y-6 pb-16">
      <header className="pt-2">
        <h1 className="type-title text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-2">Connectors, identity review, users, privacy rules and the audit log.</p>
      </header>

      {allowed ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
          <nav aria-label="Settings sections" className="-mx-1 overflow-x-auto lg:mx-0 lg:overflow-visible">
            <ul className="flex gap-1 px-1 lg:sticky lg:top-6 lg:flex-col lg:px-0">
              {tabs.map((tab) => {
                const isActive = pathname.startsWith(tab.href);
                const Icon = tab.icon;
                return (
                  <li key={tab.href}>
                    <Link
                      href={tab.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'type-meta flex items-center gap-2.5 whitespace-nowrap rounded-control px-3 py-2 font-medium transition-colors',
                        isActive ? 'bg-surface-sunken text-ink' : 'text-ink-3 hover:bg-surface-sunken/60 hover:text-ink',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-ink' : 'text-ink-3')} aria-hidden="true" />
                      <span className="flex-1">{tab.label}</span>
                      {tab.href === '/settings/identity' && waiting > 0 && (
                        <span className="rounded-full bg-[color-mix(in_srgb,var(--amber)_18%,transparent)] px-1.5 text-[11px] font-semibold tabular-nums text-amber-ink">
                          <span className="sr-only">, </span>
                          {waiting}
                          <span className="sr-only"> waiting</span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="min-w-0">{children}</div>
        </div>
      ) : isLoading ? null : (
        <p role="status" className="type-meta rounded-panel border border-rule bg-surface px-5 py-4 text-ink-3">
          Settings are managed by admins. Ask an OBA admin if something here needs changing.
        </p>
      )}
    </div>
  );
}
