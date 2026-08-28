// Every /api/* route except /api/auth/* now requires a bearer token
// (see backend/index.js). Key must match AuthContext.tsx's TOKEN_KEY.
// Client-side only — components doing their own fetch() to the backend
// should spread this into their headers instead of hand-rolling it.
export function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('horquva-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
