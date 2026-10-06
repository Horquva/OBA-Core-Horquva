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

export function signOut(): Promise<void> {
  return request<void>('/api/auth/sign-out', { method: 'POST' }); // (planned) B-02
}
