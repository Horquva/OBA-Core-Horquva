import * as React from 'react';
import { SessionProvider } from '@/lib/session';
import { AppShell } from '@/components/shell/AppShell';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
