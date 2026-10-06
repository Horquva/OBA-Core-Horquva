// =============================================================================
// Test helper — sign API requests as a seeded user (SEC-01/SEC-02)
// =============================================================================
// Routes are behind RBAC, so tests sign a real session cookie for one of the
// DataService seed users: user:admin (admin, HR), user:reviewer / user:chen
// (reviewer), user:maya (viewer).
// =============================================================================

import { signSession, SESSION_COOKIE } from '../../src/auth/session.js';

export async function sessionCookie(userId = 'user:admin'): Promise<string> {
  return `${SESSION_COOKIE}=${await signSession({ userId, provider: 'test' })}`;
}

/** fetch() signed in as `userId` (admin by default). */
export async function authedFetch(url: string, init: RequestInit = {}, userId = 'user:admin'): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('cookie', await sessionCookie(userId));
  return fetch(url, { ...init, headers });
}
