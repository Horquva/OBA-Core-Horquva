import type { AuthProvider, Session } from '@/types/view';
import { apiUrl, request } from './client';

export function fetchSession(): Promise<Session> {
  return request<Session>('/api/auth/session');
}

export interface AuthOptions {
  /** SSO providers the backend has credentials for; unconfigured ones are absent. */
  providers: AuthProvider[];
  /** Local dev sign-in is enabled (AUTH_DEV_LOGIN=true, never in production). */
  devLogin: boolean;
  /** Shared demo-deployment login (DEMO_LOGIN_EMAIL/PASSWORD on the backend); works in production. */
  demoLogin?: boolean;
}

export function fetchAuthOptions(): Promise<AuthOptions> {
  return request<AuthOptions>('/api/auth/providers');
}

/** Full-page navigation target: the backend redirects on to the provider (PKCE). */
export function authStartUrl(provider: AuthProvider, returnTo = '/'): string {
  return apiUrl(`/api/auth/${provider}/start?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`);
}

/** Same-app relative paths only; mirrors the backend so a bad link never becomes an open redirect. */
export function safeReturnTo(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || raw.startsWith('/sign-in')) return '/';
  return raw;
}

/** Local dev only: backend answers this only when AUTH_DEV_LOGIN=true and not in production. */
export function devSignIn(email: string): Promise<Session> {
  return request<Session>('/api/auth/dev/sign-in', { method: 'POST', body: JSON.stringify({ email }) });
}

/** Demo deployments only: the backend answers this only when its demo login is configured. */
export function demoSignIn(email: string, password: string): Promise<Session> {
  return request<Session>('/api/auth/demo/sign-in', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function signOut(): Promise<void> {
  return request<void>('/api/auth/sign-out', { method: 'POST' });
}
