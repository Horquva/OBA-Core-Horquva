import * as React from 'react';
import { Brand } from '@/components/shell/Brand';

export default async function AttestTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 border-b border-rule bg-surface/90 px-4 sm:px-8 flex items-center justify-between backdrop-blur-md">
        <Brand />
        <span className="text-xs font-mono text-ink-3">
          Verification Portal
        </span>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-8">
        <div className="rounded-card border border-rule bg-surface p-6 shadow-xs space-y-4">
          <div className="border-b border-rule/50 pb-3">
            <h1 className="font-serif text-2xl text-ink font-normal">
              Asset Ownership Attestation
            </h1>
            <p className="text-xs text-ink-3 mt-1 font-mono truncate">
              Token: {token}
            </p>
          </div>

          <p className="text-sm text-ink-2 leading-relaxed">
            Phone-first 5-question multi-asset attestation form being mounted in Task 31.
          </p>
        </div>
      </main>
    </div>
  );
}
