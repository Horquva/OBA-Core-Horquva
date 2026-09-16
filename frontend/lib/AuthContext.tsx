'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE, authApi } from '@/lib/api';
import { clientHeaders, LEGACY_TOKEN_KEY, USER_KEY } from '@/lib/authFetch';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  org?: string;
}

// SEC-2: there is no `token` here any more. The session is an httpOnly cookie
// that page scripts cannot read; `user` being non-null is what "signed in"
// means on the client, and the server re-checks the cookie on every request.
interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<string>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.resolve().then(() => {
      let u: string | null = null;
      try {
        // SEC-2: wipe any token a pre-SEC-2 login left in script-readable storage.
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        u = localStorage.getItem(USER_KEY);
        if (u) setUser(JSON.parse(u));
      } catch {}
      setLoading(false);

      // F-10: the cached profile is only a display hint. This ping confirms
      // the session cookie is still accepted server-side; a missing, expired
      // or revoked cookie 401s, and request()'s global handler (lib/api.ts)
      // clears the cached profile and sends the user to /login from there.
      if (u) authApi.me().catch(() => {});
    });
  }, []);

  const persist = useCallback((u: AuthUser) => {
    setUser(u);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {}
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      // SEC-2: lets the browser store the httpOnly session cookie the
      // backend sets on a cross-origin response.
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...clientHeaders() },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Login failed');
    persist(data.user);
  }, [persist]);

  // Replaces the old resetPassword(email, password), which posted an arbitrary
  // email to an unauthenticated endpoint and could overwrite anyone's password.
  // This changes only the signed-in user's own, and the server retires the
  // current token on success — callers must send the user back to /login.
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const data = await authApi.changePassword(currentPassword, newPassword);
    return data?.message || 'Password updated.';
  }, []);

  const logout = useCallback(() => {
    // Server-side revocation + cookie clearing. Only the backend can remove
    // an httpOnly cookie. Fire-and-forget: must never block or fail the local
    // logout (e.g. if the backend happens to be down when the user clicks
    // Log Out).
    fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { ...clientHeaders() },
    }).catch(() => {});
    setUser(null);
    try {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, changePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
