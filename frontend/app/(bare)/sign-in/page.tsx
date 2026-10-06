'use client';

import * as React from 'react';
import { HeroArt } from '@/components/ui/HeroArt';
import { Brand } from '@/components/shell/Brand';
import { Button } from '@/components/ui/Button';

export default function SignInPage() {
  const handleSignIn = (provider: 'microsoft' | 'google') => {
    // In production, redirects to /api/auth/${provider}/start
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-canvas">
      {/* Left Column: Brand & Hero Art */}
      <div className="relative flex-1 flex flex-col justify-between p-8 md:p-16 border-b md:border-b-0 md:border-r border-rule overflow-hidden bg-surface-sunken/30">
        <Brand />

        <div className="my-auto py-12 max-w-md z-10">
          <h1 className="font-serif text-4xl md:text-5xl text-ink font-normal tracking-tight leading-tight">
            When someone leaves, nothing breaks.
          </h1>
          <p className="mt-4 text-base text-ink-2 leading-relaxed">
            Continuous organizational intelligence, automated single-point-of-failure detection, and verifiable handover workflows.
          </p>
        </div>

        {/* Ambient Decorative Art */}
        <div className="absolute right-0 bottom-0 w-96 h-96 opacity-40 pointer-events-none">
          <HeroArt />
        </div>

        <div className="text-xs text-ink-3">
          © {new Date().getFullYear()} Horquva. Enterprise Continuity Intelligence.
        </div>
      </div>

      {/* Right Column: Sign In Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h2 className="font-serif text-3xl text-ink font-normal">
              Sign in to OBA
            </h2>
            <p className="text-xs text-ink-3">
              Single sign-on via your corporate identity provider.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              variant="secondary"
              className="w-full justify-center py-2.5"
              onClick={() => handleSignIn('microsoft')}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              <span>Continue with Microsoft Entra</span>
            </Button>

            <Button
              variant="secondary"
              className="w-full justify-center py-2.5"
              onClick={() => handleSignIn('google')}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google Workspace</span>
            </Button>
          </div>

          <p className="text-[11px] text-ink-3 text-center leading-normal">
            By signing in, you access company-sanctioned operational intelligence governed by internal RBAC policies.
          </p>
        </div>
      </div>
    </div>
  );
}
