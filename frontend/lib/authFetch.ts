// SEC-2: the session token is an httpOnly cookie set by the backend. Page
// scripts can no longer read it -- that is the point -- so nothing here stores
// or sends a token. Requests just need `credentials: 'include'` so the browser
// attaches the cookie.
//
// USER_KEY only caches the signed-in user's display profile (name, email,
// role) so the UI can render before /api/auth/me answers. It is not a
// credential; the server decides who is signed in from the cookie alone.
export const USER_KEY = 'horquva-user';

// The key the token used to be stored under. Kept only so a browser that
// signed in before SEC-2 gets the old, script-readable copy wiped.
export const LEGACY_TOKEN_KEY = 'horquva-token';

// The backend refuses cookie-authenticated POST/PUT/PATCH/DELETE requests that
// do not carry this header (CSRF guard, backend/middleware/auth.js). Sending it
// on every request is harmless and keeps callers from having to think about it.
export const CLIENT_HEADER = 'X-Horquva-Client';

// Client-side only -- components doing their own fetch() to the backend should
// spread this into their headers AND pass `credentials: 'include'`.
export function clientHeaders(): Record<string, string> {
  return { [CLIENT_HEADER]: 'web' };
}
