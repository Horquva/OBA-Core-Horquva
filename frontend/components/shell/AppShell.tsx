'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomTabBar } from './BottomTabBar';
import { useResource } from '@/lib/useResource';
import { fetchChanges, acknowledgeChange, acknowledgeAllChanges } from '@/lib/api/changes';
import { fetchNavCounts } from '@/lib/api/overview';
import type { ChangeEventView, NavCounts } from '@/types/view';

export interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

const fallbackNavCounts: NavCounts = {
  departuresSoon: 0,
  openCriticalActions: 0,
  identityPending: 0,
};

export function AppShell({ children, className }: AppShellProps) {
  const pathname = usePathname();

  // Dynamic Page Title
  const getPageTitle = (path: string): string => {
    if (path === '/') return 'Overview';
    if (path.startsWith('/briefing')) return 'Weekly Executive Briefing';
    if (path.startsWith('/departures')) return 'Departures & Handover';
    if (path.startsWith('/people')) return 'People & Teams';
    if (path.startsWith('/assets')) return 'Assets Catalog';
    if (path.startsWith('/map')) return 'Dependency Map';
    if (path.startsWith('/what-if')) return 'What-If Continuity Simulator';
    if (path.startsWith('/actions/confirmations/new')) return 'New Confirmation Campaign';
    if (path.startsWith('/actions')) return 'Actions & Confirmations';
    if (path.startsWith('/ask')) return 'Ask OBA';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Horquva OBA';
  };

  // Changes / Alerts resource
  const changesResource = useResource<ChangeEventView[]>('shell-changes', async () => {
    try {
      return await fetchChanges();
    } catch {
      return [];
    }
  });

  // Nav counts resource (e.g. departures, actions, settings)
  const navCountsResource = useResource<NavCounts>('shell-nav-counts', async () => {
    try {
      return await fetchNavCounts();
    } catch {
      return fallbackNavCounts;
    }
  });

  const events = changesResource.status === 'ready' ? changesResource.data : [];
  const navCounts = navCountsResource.status === 'ready' ? navCountsResource.data : undefined;

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeChange(id);
      changesResource.reload();
    } catch (e) {
      console.error('Failed to acknowledge change', e);
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      await acknowledgeAllChanges();
      changesResource.reload();
    } catch (e) {
      console.error('Failed to acknowledge all changes', e);
    }
  };

  const isFullWidthPage = pathname === '/map' || pathname === '/what-if';

  return (
    <div className={cn('flex h-screen w-full bg-canvas overflow-hidden font-sans', className)}>
      {/* Desktop / Tablet Sidebar */}
      <Sidebar
        departuresCount={navCounts?.departuresSoon}
        actionsCount={navCounts?.openCriticalActions}
        settingsCount={navCounts?.identityPending}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar
          title={getPageTitle(pathname)}
          events={events}
          onAcknowledgeEvent={handleAcknowledge}
          onAcknowledgeAllEvents={handleAcknowledgeAll}
        />

        <main
          className={cn(
            'flex-1 overflow-y-auto min-w-0 pb-20 md:pb-6',
            isFullWidthPage ? 'p-0' : 'p-4 md:p-8'
          )}
        >
          <div className={cn(isFullWidthPage ? 'w-full h-full' : 'max-w-[1280px] mx-auto w-full')}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <BottomTabBar
        departuresCount={navCounts?.departuresSoon}
        actionsCount={navCounts?.openCriticalActions}
      />
    </div>
  );
}
