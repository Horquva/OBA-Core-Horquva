'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/lib/AuthContext';
import GlobalNotificationPanel from '@/components/global/GlobalNotificationPanel';
import GlobalSearchOverlay from '@/components/global/GlobalSearchOverlay';
import CommandBar from '@/components/global/CommandBar';
import DeepLinkFocus from '@/components/global/DeepLinkFocus';
import { AGENT_FROM_ROUTE_KEY } from '@/lib/agentClient';

const AUTH_ROUTES = ['/login'];
const AGENT_ROUTE = '/agent';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isAuthRoute) {
      router.replace('/login');
    }
  }, [user, loading, isAuthRoute, router]);

  // The agent's starter questions are tailored to the page the user came
  // from (EmptyState -> /api/agent/suggestions?from=...), so remember the
  // last non-agent page. Per-tab convenience only -- losing it just means
  // general questions.
  useEffect(() => {
    if (isAuthRoute || pathname === AGENT_ROUTE) return;
    try {
      sessionStorage.setItem(AGENT_FROM_ROUTE_KEY, pathname);
    } catch {
      // Storage blocked -- the agent falls back to general questions.
    }
  }, [pathname, isAuthRoute]);

  if (isAuthRoute) return <>{children}</>;

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
        <CommandBar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
      <GlobalNotificationPanel />
      <GlobalSearchOverlay />
      <DeepLinkFocus />
    </div>
  );
}

export default AppShell;
