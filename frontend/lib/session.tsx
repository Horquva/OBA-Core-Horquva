'use client';

import * as React from 'react';
import type { Role, Session } from '@/types/view';
import { devSignIn, fetchSession } from './api/session';
import { ApiError } from './api/client';
import { navigate } from './navigation';

/** Production, no session: full-page trip to sign-in, coming back to where the user was. */
export function redirectToSignIn(returnTo: string): void {
  navigate(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
}

export interface SessionContextValue {
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  isDevSession: boolean;
  setDevRole: (role: Role) => void;
  refetchSession: () => Promise<void>;
}

const SessionContext = React.createContext<SessionContextValue | undefined>(undefined);

/**
 * Dev mode signs in for real, as a seeded backend user per role, through
 * POST /api/auth/dev/sign-in (backend needs AUTH_DEV_LOGIN=true). The backend
 * then enforces the same role the UI shows. Production never uses this.
 */
export const DEV_USERS: Record<Role, string> = {
  admin: 'alex@acme.com',
  reviewer: 'chen@acme.com',
  viewer: 'maya@acme.com',
};

/** Shown only until the dev sign-in answers, or if the backend is not running. */
function offlineDevSession(role: Role): Session {
  return {
    userId: 'usr-dev-offline',
    name: 'Dev user (backend offline)',
    email: DEV_USERS[role],
    role,
    isHrManager: role === 'admin',
    title: null,
  };
}

export interface SessionProviderProps {
  children: React.ReactNode;
  initialSession?: Session | null;
  isDevSession?: boolean;
  /** Called with the current path when production finds no session (default: go to /sign-in). */
  onSignedOut?: (returnTo: string) => void;
}

export function SessionProvider({
  children,
  initialSession,
  isDevSession: isDevProp,
  onSignedOut = redirectToSignIn,
}: SessionProviderProps) {
  const envRole = process.env.NEXT_PUBLIC_DEV_ROLE as Role | undefined;
  const isDevSession =
    isDevProp ?? (process.env.NODE_ENV !== 'production' || Boolean(envRole));
  const startRole: Role = envRole && envRole in DEV_USERS ? envRole : 'admin';

  const [session, setSession] = React.useState<Session | null>(() => {
    if (initialSession) return initialSession;
    return isDevSession ? offlineDevSession(startRole) : null;
  });

  const [isLoading, setIsLoading] = React.useState(!initialSession && !isDevSession);
  const [error, setError] = React.useState<Error | null>(null);
  // Hold the screens until the session settles. Dev: their first API calls would
  // race the sign-in cookie. Production: signed-out users never see a screen.
  const [ready, setReady] = React.useState(Boolean(initialSession));

  const refetchSession = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setSession(await fetchSession());
      setReady(true);
    } catch (err) {
      if (!isDevSession) {
        if (err instanceof ApiError && err.status === 401) {
          onSignedOut(window.location.pathname + window.location.search);
          return; // stay not-ready: the page is navigating away
        }
        setError(err instanceof Error ? err : new Error(String(err)));
        setReady(true);
        return;
      }
      // No session cookie yet: sign in as the dev user for the starting role.
      try {
        setSession(await devSignIn(DEV_USERS[startRole]));
      } catch (devErr) {
        console.warn(
          '[dev] Could not sign in to the backend. Is it running with AUTH_DEV_LOGIN=true? API calls will return 401.',
          devErr
        );
      }
      setReady(true);
    } finally {
      setIsLoading(false);
    }
  }, [isDevSession, startRole, onSignedOut]);

  React.useEffect(() => {
    if (!initialSession) {
      refetchSession();
    }
  }, [initialSession, refetchSession]);

  const setDevRole = React.useCallback((role: Role) => {
    // Optimistic so the UI switches at once; then become that role's backend user.
    setSession((prev) => (prev ? { ...prev, role } : null));
    devSignIn(DEV_USERS[role]).then(setSession, () => {
      // Backend offline or dev login disabled: UI-only role switch.
    });
  }, []);

  const value = React.useMemo(
    () => ({
      session,
      isLoading,
      error,
      isDevSession,
      setDevRole,
      refetchSession,
    }),
    [session, isLoading, error, isDevSession, setDevRole, refetchSession]
  );

  return <SessionContext.Provider value={value}>{ready ? children : null}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}
