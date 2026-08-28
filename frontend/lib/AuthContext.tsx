'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE, authApi } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  org?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<string>;
  logout: () => void;
}

const TOKEN_KEY = 'horquva-token';
const USER_KEY = 'horquva-user';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const t = localStorage.getItem(TOKEN_KEY);
        const u = localStorage.getItem(USER_KEY);
        if (t) setToken(t);
        if (u) setUser(JSON.parse(u));
      } catch {}
      setLoading(false);
    });
  }, []);

  const persist = useCallback((t: string, u: AuthUser) => {
    setToken(t);
    setUser(u);
    try {
      localStorage.setItem(TOKEN_KEY, t);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {}
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Login failed');
    persist(data.token, data.user);
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
    // Best-effort server-side revocation so the token can't be replayed after
    // logout — fire-and-forget, must never block or fail the local logout
    // (e.g. if the backend happens to be down when the user clicks Log Out).
    if (token) {
      fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
    router.push('/login');
  }, [router, token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, changePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
