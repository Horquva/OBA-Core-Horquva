'use client';

import * as React from 'react';
import type { Role, Session } from '@/types/view';
import { devSignIn, fetchSession } from './api/session';
import { API_BASE, ApiError } from './api/client';
import { ErrorState } from '@/components/ui/states';
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
 * Dev mode signs in for real, as a test-org user per role, through
 * POST /api/auth/dev/sign-in (backend needs AUTH_DEV_LOGIN=true). The backend
 * then enforces the same role the UI shows. Production never uses this.
 *
 * The users come from NEXT_PUBLIC_DEV_{ADMIN,REVIEWER,VIEWER}_EMAIL; a role
 * with no email is not offered. Read at call time, with literal names so
 * Next inlines them.
 */
export function devUsers(): Partial<Record<Role, string>> {
  const users: Partial<Record<Role, string>> = {};
  const admin = process.env.NEXT_PUBLIC_DEV_ADMIN_EMAIL?.trim();
  const reviewer = process.env.NEXT_PUBLIC_DEV_REVIEWER_EMAIL?.trim();
  const viewer = process.env.NEXT_PUBLIC_DEV_VIEWER_EMAIL?.trim();
  if (admin) users.admin = admin;
  if (reviewer) users.reviewer = reviewer;
  if (viewer) users.viewer = viewer;
  return users;
}

/** Roles the dev switcher offers, in a fixed order. */
export function devRoles(): Role[] {
  const users = devUsers();
  return (['admin', 'reviewer', 'viewer'] as Role[]).filter((r) => users[r]);
}

/** Why the dev session could not start, in words the developer can act on. */
function devSignInError(err: unknown): Error {
  if (err instanceof ApiError && err.status === 0) return new Error(`Backend not reachable at ${API_BASE}`);
  const detail = err instanceof Error ? err.message : String(err);
  return new Error(`Dev sign-in failed: ${detail}`);
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
  const roles = devRoles();
  const startRole: Role | undefined = envRole && roles.includes(envRole) ? envRole : roles[0];

  const [session, setSession] = React.useState<Session | null>(initialSession ?? null);

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
      // Without one there is no session at all: never a made-up user.
      if (err instanceof ApiError && err.status === 0) {
        setError(devSignInError(err));
      } else if (!startRole) {
        setError(new Error('No dev user configured: set NEXT_PUBLIC_DEV_ADMIN_EMAIL (or the reviewer or viewer email) in frontend/.env.local.'));
      } else {
        try {
          setSession(await devSignIn(devUsers()[startRole]!));
        } catch (devErr) {
          setError(devSignInError(devErr));
        }
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
    const email = devUsers()[role];
    if (!email) return;
    // Become that role's backend user; the UI follows the session the backend returns.
    devSignIn(email).then(
      (next) => {
        setError(null);
        setSession(next);
      },
      (err) => setError(devSignInError(err)),
    );
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

  // Dev with no session: say why, instead of rendering screens for nobody.
  const devBlocked = ready && isDevSession && !session && error;
  return (
    <SessionContext.Provider value={value}>
      {devBlocked ? (
        <div className="mx-auto max-w-md p-8">
          <ErrorState
            message={error.message.startsWith('Backend not reachable') ? `${error.message}. Start the backend, then retry.` : error.message}
            onRetry={() => void refetchSession()}
          />
        </div>
      ) : ready ? (
        children
      ) : null}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}

/** For purely cosmetic uses (e.g. marking "You" in a list) where rendering without a provider is fine. */
export function useOptionalSession(): SessionContextValue | null {
  return React.useContext(SessionContext) ?? null;
}
