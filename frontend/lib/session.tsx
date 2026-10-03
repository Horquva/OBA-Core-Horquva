'use client';

import * as React from 'react';
import type { Role, Session } from '@/types/view';
import { fetchSession } from './api/session';

export interface SessionContextValue {
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  isDevSession: boolean;
  setDevRole: (role: Role) => void;
  refetchSession: () => Promise<void>;
}

const SessionContext = React.createContext<SessionContextValue | undefined>(undefined);

export interface SessionProviderProps {
  children: React.ReactNode;
  initialSession?: Session | null;
}

export function SessionProvider({ children, initialSession }: SessionProviderProps) {
  const [session, setSession] = React.useState<Session | null>(() => {
    if (initialSession) return initialSession;

    const envRole = process.env.NEXT_PUBLIC_DEV_ROLE as Role | undefined;
    if (process.env.NODE_ENV === 'development' || envRole) {
      return {
        userId: 'usr-dev-admin',
        name: 'Alex Rivera (Dev)',
        email: 'alex.rivera@acme.corp',
        role: envRole || 'admin',
        isHrManager: true,
        title: 'Platform Architect & Admin',
      };
    }
    return null;
  });

  const [isLoading, setIsLoading] = React.useState(!initialSession && !process.env.NEXT_PUBLIC_DEV_ROLE);
  const [error, setError] = React.useState<Error | null>(null);

  const isDevSession = process.env.NODE_ENV === 'development' || Boolean(process.env.NEXT_PUBLIC_DEV_ROLE);

  const refetchSession = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSession();
      setSession(data);
    } catch (err) {
      // In local dev, fallback to dev admin instead of failing hard
      if (isDevSession) {
        setSession({
          userId: 'usr-dev-admin',
          name: 'Alex Rivera (Dev)',
          email: 'alex.rivera@acme.corp',
          role: 'admin',
          isHrManager: true,
          title: 'Platform Architect & Admin',
        });
      } else {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setIsLoading(false);
    }
  }, [isDevSession]);

  React.useEffect(() => {
    if (!initialSession && !session) {
      refetchSession();
    }
  }, [initialSession, session, refetchSession]);

  const setDevRole = React.useCallback((role: Role) => {
    setSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        role,
      };
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

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}
