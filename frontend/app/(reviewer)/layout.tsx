import * as React from 'react';
import { SessionProvider } from '@/lib/session';
import { Brand } from '@/components/shell/Brand';
import { UserMenu } from '@/components/shell/UserMenu';

export default function ReviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
        {/* Slim Header */}
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-rule bg-surface/90 px-4 sm:px-8 backdrop-blur-md">
          <Brand />
          <div className="flex items-center gap-3">
            <UserMenu compact />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
