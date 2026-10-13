'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomTabBar } from './BottomTabBar';
import { useResource } from '@/lib/useResource';
import { fetchChanges, acknowledgeChange, acknowledgeAllChanges, fetchFreshness, type DataFreshness } from '@/lib/api/changes';
import { toApiError } from '@/lib/api/client';
import { canEdit } from '@/lib/permissions';
import { useSession } from '@/lib/session';
import { OnboardingGuideBanner } from '@/components/onboarding/OnboardingGuideBanner';
import { fetchNavCounts } from '@/lib/api/overview';
import type { ChangeEventView, NavCounts } from '@/types/view';

export interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  const pathname = usePathname();
  const { session } = useSession();

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
  // A failed load is shown as a failure in the bell, never as "All caught up".
  const changesResource = useResource<ChangeEventView[]>('shell-changes', fetchChanges);
  const freshnessResource = useResource<DataFreshness>('shell-freshness', fetchFreshness);
  const [ackError, setAckError] = React.useState<string | null>(null);

  // Nav badge counts. On failure badges are hidden (undefined), not shown as 0.
  const navCountsResource = useResource<NavCounts>('shell-nav-counts', () => fetchNavCounts());

  const events = changesResource.status === 'ready' ? changesResource.data : undefined;
  const eventsError =
    changesResource.status === 'error' ? `Could not load changes: ${changesResource.error.message}` : ackError;
  const freshness =
    freshnessResource.status === 'ready' ? freshnessResource.data : freshnessResource.status === 'error' ? null : undefined;
  const navCounts = navCountsResource.status === 'ready' ? navCountsResource.data : undefined;

  const handleAcknowledge = async (id: string) => {
    setAckError(null);
    try {
      await acknowledgeChange(id);
      changesResource.reload();
    } catch (e) {
      setAckError(`Could not acknowledge: ${toApiError(e).message}`);
    }
  };

  const handleAcknowledgeAll = async () => {
    setAckError(null);
    try {
      await acknowledgeAllChanges();
      changesResource.reload();
    } catch (e) {
      setAckError(`Could not acknowledge: ${toApiError(e).message}`);
    }
  };

  const isFullWidthPage = pathname === '/map' || pathname === '/what-if';

  return (
    <div className={cn('flex h-screen w-full bg-canvas overflow-hidden font-sans', className)}>
      {/* Desktop / Tablet Sidebar */}
      <Sidebar
        departuresCount={navCounts?.departuresSoon}
        actionsCount={navCounts?.openCriticalActions}
        settingsCount={navCounts?.identityPending ?? undefined}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar
          title={getPageTitle(pathname)}
          events={events}
          eventsError={eventsError}
          onRetryEvents={() => {
            setAckError(null);
            changesResource.reload();
          }}
          freshness={freshness}
          // Acknowledging needs edit rights (RBAC); viewers just read the feed.
          onAcknowledgeEvent={canEdit(session) ? handleAcknowledge : undefined}
          onAcknowledgeAllEvents={canEdit(session) ? handleAcknowledgeAll : undefined}
        />

        <main
          className={cn(
            'relative flex-1 overflow-y-auto min-w-0 pb-20 md:pb-6',
            isFullWidthPage ? 'p-0' : 'p-4 md:p-8'
          )}
        >
          <div className={cn(isFullWidthPage ? 'w-full h-full' : 'max-w-[1280px] mx-auto w-full')}>
            {!isFullWidthPage && <OnboardingGuideBanner />}
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
