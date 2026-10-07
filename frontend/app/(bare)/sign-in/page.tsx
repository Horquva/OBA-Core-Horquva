'use client';

import * as React from 'react';
import { HeroArt } from '@/components/ui/HeroArt';
import { Brand } from '@/components/shell/Brand';
import { Button } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { DEV_USERS } from '@/lib/session';
import { navigate, replace } from '@/lib/navigation';
import {
  authStartUrl,
  devSignIn,
  fetchAuthOptions,
  fetchSession,
  safeReturnTo,
  type AuthOptions,
} from '@/lib/api/session';
import type { AuthProvider, Role } from '@/types/view';

/** Codes the backend callback sends back as ?error= (routes/auth.ts, auth/oidc.ts). */
const ERROR_MESSAGES: Record<string, string> = {
  not_provisioned: "You signed in, but there's no OBA account for that email. Ask your OBA admin to add you.",
  account_rejected: 'That account type cannot sign in to OBA. Use your work account.',
  provider_denied: 'Sign-in was cancelled at your identity provider.',
  invalid_state: 'Your sign-in session expired or was opened in another tab. Please try again.',
  missing_code: 'Your identity provider did not complete sign-in. Please try again.',
  provider_not_configured: 'That sign-in method is not set up for this workspace.',
  token_exchange_failed: 'We could not confirm your sign-in with your identity provider. Please try again.',
  invalid_id_token: 'We could not verify your identity token. Please try again.',
};
const FALLBACK_ERROR = 'Sign-in did not complete. Please try again.';

const PROVIDER_ORDER: AuthProvider[] = ['microsoft', 'google'];

type OptionsState = { status: 'loading' } | { status: 'ready'; data: AuthOptions } | { status: 'error' };

const noSubscribe = () => () => {};

export default function SignInPage() {
  // The query string, read without useSearchParams (which would force a Suspense
  // boundary on this static page); empty during prerender.
  const search = React.useSyncExternalStore(noSubscribe, () => window.location.search, () => '');
  const params = new URLSearchParams(search);
  const returnTo = safeReturnTo(params.get('returnTo'));
  const errorCode = params.get('error');
  const callbackError = errorCode ? (ERROR_MESSAGES[errorCode] ?? FALLBACK_ERROR) : null;

  const [options, setOptions] = React.useState<OptionsState>({ status: 'loading' });
  const [devError, setDevError] = React.useState<string | null>(null);

  const fetchOptions = React.useCallback(() => {
    fetchAuthOptions().then(
      (data) => setOptions({ status: 'ready', data }),
      () => setOptions({ status: 'error' })
    );
  }, []);

  const retryOptions = () => {
    setOptions({ status: 'loading' });
    fetchOptions();
  };

  React.useEffect(() => {
    // Already signed in (e.g. back button after sign-in): go straight on.
    const target = safeReturnTo(new URLSearchParams(window.location.search).get('returnTo'));
    fetchSession().then(() => replace(target), () => {});
    fetchOptions();
  }, [fetchOptions]);

  const handleSignIn = (provider: AuthProvider) => {
    navigate(authStartUrl(provider, returnTo));
  };

  const handleDevSignIn = async (role: Role) => {
    setDevError(null);
    try {
      await devSignIn(DEV_USERS[role]);
      navigate(returnTo);
    } catch (err) {
      setDevError(err instanceof Error ? err.message : 'Dev sign-in failed.');
    }
  };

  const configured = options.status === 'ready' ? options.data.providers : [];

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-canvas">
      {/* Left Column: Brand & Hero Art */}
      <div className="relative flex-1 flex flex-col justify-between p-8 md:p-16 border-b md:border-b-0 md:border-r border-rule overflow-hidden bg-surface-sunken/30">
        <Brand />

        <div className="my-auto py-12 max-w-md z-10">
          <h1 className="text-3xl text-ink font-semibold tracking-tight leading-tight">
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
            <h2 className="text-3xl text-ink font-semibold">
              Sign in to OBA
            </h2>
            <p className="text-xs text-ink-3">
              Single sign-on via your corporate identity provider.
            </p>
          </div>

          {callbackError && (
            <div role="alert" className="rounded-control border border-st-fail/30 bg-st-fail/10 px-3 py-2 text-xs text-ink">
              {callbackError}
            </div>
          )}

          <div className="space-y-3 pt-2">
            {options.status === 'loading' && (
              <div aria-busy="true" aria-label="Loading sign-in options" className="space-y-3">
                <Skeleton variant="row" />
                <Skeleton variant="row" />
              </div>
            )}

            {options.status === 'error' && (
              <ErrorState message="We couldn't reach OBA to load sign-in options." onRetry={retryOptions} />
            )}

            {options.status === 'ready' && configured.length === 0 && !options.data.devLogin && (
              <p role="status" className="rounded-control border border-dashed border-rule px-3 py-3 text-xs text-ink-2">
                No sign-in method is set up for this workspace yet. Ask your OBA admin to connect Microsoft Entra or
                Google Workspace.
              </p>
            )}

            {PROVIDER_ORDER.filter((p) => configured.includes(p)).map((provider) => (
              <Button
                key={provider}
                variant="secondary"
                className="w-full justify-center py-2.5"
                onClick={() => handleSignIn(provider)}
              >
                {provider === 'microsoft' ? (
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                    <path fill="#81bc06" d="M12 1h10v10H12z"/>
                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                  </svg>
                ) : (
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                )}
                <span>{provider === 'microsoft' ? 'Continue with Microsoft Entra' : 'Continue with Google Workspace'}</span>
              </Button>
            ))}

            {options.status === 'ready' && options.data.devLogin && (
              <div className="space-y-2 rounded-control border border-dashed border-rule p-3">
                <p className="text-[11px] text-ink-3">Local development only: sign in as a seeded user.</p>
                <div className="flex gap-2">
                  {(Object.keys(DEV_USERS) as Role[]).map((role) => (
                    <Button key={role} variant="ghost" className="flex-1 justify-center capitalize" onClick={() => handleDevSignIn(role)}>
                      {role}
                    </Button>
                  ))}
                </div>
                {devError && <p role="alert" className="text-[11px] text-st-fail">{devError}</p>}
              </div>
            )}
          </div>

          <p className="text-[11px] text-ink-3 text-center leading-normal">
            By signing in, you access company-sanctioned operational intelligence governed by internal RBAC policies.
          </p>
        </div>
      </div>
    </div>
  );
}
