// Every /api/* route except /api/auth/* now requires a bearer token
// (see backend/index.js). The one place these localStorage keys are named —
// AuthContext.tsx and api.ts's 401 handler both import them from here, so
// there is exactly one string to get right instead of three copies that can
// drift apart.
export const TOKEN_KEY = 'horquva-token';
export const USER_KEY = 'horquva-user';

// Client-side only — components doing their own fetch() to the backend
// should spread this into their headers instead of hand-rolling it.
export function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}
