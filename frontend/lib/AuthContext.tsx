'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';

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
  register: (payload: { email: string; password: string; name?: string; role?: string; org?: string }) => Promise<void>;
  resetPassword: (email: string, password: string) => Promise<string>;
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
    try {
      const t = localStorage.getItem(TOKEN_KEY);
      const u = localStorage.getItem(USER_KEY);
      if (t) setToken(t);
      if (u) setUser(JSON.parse(u));
    } catch (_) {}
    setLoading(false);
  }, []);

  const persist = useCallback((t: string, u: AuthUser) => {
    setToken(t);
    setUser(u);
    try {
      localStorage.setItem(TOKEN_KEY, t);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch (_) {}
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

  const register = useCallback(async (payload: { email: string; password: string; name?: string; role?: string; org?: string }) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Registration failed');
    persist(data.token, data.user);
  }, [persist]);

  const resetPassword = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Password reset failed');
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
    } catch (_) {}
    router.push('/login');
  }, [router, token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
