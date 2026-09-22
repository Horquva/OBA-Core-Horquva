'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/lib/AuthContext';
import GlobalNotificationPanel from '@/components/global/GlobalNotificationPanel';
import GlobalSearchOverlay from '@/components/global/GlobalSearchOverlay';
import CommandBar from '@/components/global/CommandBar';
import DeepLinkFocus from '@/components/global/DeepLinkFocus';
import { AgentProvider } from '../agent/AgentProvider';
import AgentPanel from '../agent/AgentPanel';

const AUTH_ROUTES = ['/login'];

// Task 12.4's flag requirement -- when the backend has the agent disabled,
// the frontend hides the panel entirely rather than showing a broken one.
const AGENT_ENABLED = process.env.NEXT_PUBLIC_AGENT_ENABLED === 'true';

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

  if (isAuthRoute) return <>{children}</>;

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
        Loading...
      </div>
    );
  }

  return (
    <AgentProvider>
      <div className="flex h-full">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
          <CommandBar />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
        </div>
        <GlobalNotificationPanel />
        <GlobalSearchOverlay />
        <DeepLinkFocus />
        {AGENT_ENABLED && <AgentPanel slot="shell" />}
      </div>
    </AgentProvider>
  );
}

export default AppShell;