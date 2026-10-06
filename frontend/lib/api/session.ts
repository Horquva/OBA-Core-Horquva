import type { AuthProvider, Session } from '@/types/view';
import { apiUrl, request } from './client';

export function fetchSession(): Promise<Session> {
  return request<Session>('/api/auth/session'); // (planned) B-02
}

export async function fetchAuthProviders(): Promise<AuthProvider[]> {
  const r = await request<{ providers: AuthProvider[] }>('/api/auth/providers'); // (planned) B-02
  return r.providers;
}

export function authStartUrl(provider: AuthProvider): string {
  return apiUrl(`/api/auth/${provider}/start`); // (planned) B-02
}

/** Local dev only: backend answers this only when AUTH_DEV_LOGIN=true and not in production. */
export function devSignIn(email: string): Promise<Session> {
  return request<Session>('/api/auth/dev/sign-in', { method: 'POST', body: JSON.stringify({ email }) });
}

export function signOut(): Promise<void> {
  return request<void>('/api/auth/sign-out', { method: 'POST' }); // (planned) B-02
}
