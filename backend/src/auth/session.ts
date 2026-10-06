// =============================================================================
// Horquva Continuity Platform — Session Tokens & Cookies (SRS SEC-01)
// =============================================================================
// SSO is the only way in (no local passwords). After a provider callback
// succeeds we issue our own short HS256 session JWT in an httpOnly cookie.
// The token carries only the user id; role and profile are re-read from the
// user store on every request so role changes apply immediately.
// =============================================================================

import { SignJWT, jwtVerify } from 'jose';
import type { CookieOptions, Request, Response } from 'express';

export const SESSION_COOKIE = 'horquva_session';
export const OIDC_FLOW_COOKIE = 'horquva_oidc';

const SESSION_TTL_SECONDS = parseInt(process.env.SESSION_TTL_SECONDS || '28800', 10); // 8h
const FLOW_TTL_SECONDS = 600; // 10 min to complete the provider round-trip

const DEV_SECRET = 'horquva-dev-session-secret-not-for-production';

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set in production.');
    }
    return new TextEncoder().encode(DEV_SECRET);
  }
  return new TextEncoder().encode(secret);
}

export function cookieOptions(maxAgeSeconds: number): CookieOptions {
  const crossSite = process.env.COOKIE_CROSS_SITE === 'true';
  return {
    httpOnly: true,
    secure: crossSite || process.env.COOKIE_SECURE === 'true',
    sameSite: crossSite ? 'none' : 'lax',
    path: '/',
    maxAge: maxAgeSeconds * 1000,
  };
}

export interface SessionClaims {
  userId: string;
  provider: string;
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ provider: claims.provider })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId)
    .setAudience('horquva-session')
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      audience: 'horquva-session',
      algorithms: ['HS256'],
    });
    if (!payload.sub) return null;
    return { userId: payload.sub, provider: String(payload.provider ?? '') };
  } catch {
    return null;
  }
}

/** State carried across the provider redirect (CSRF state, replay nonce, PKCE verifier). */
export interface OidcFlowState {
  provider: string;
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
}

export async function signFlowState(flow: OidcFlowState): Promise<string> {
  return new SignJWT({ ...flow })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience('horquva-oidc-flow')
    .setIssuedAt()
    .setExpirationTime(`${FLOW_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifyFlowState(token: string): Promise<OidcFlowState | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      audience: 'horquva-oidc-flow',
      algorithms: ['HS256'],
    });
    const { provider, state, nonce, codeVerifier, returnTo } = payload as Record<string, unknown>;
    if ([provider, state, nonce, codeVerifier, returnTo].some((v) => typeof v !== 'string')) return null;
    return { provider, state, nonce, codeVerifier, returnTo } as OidcFlowState;
  } catch {
    return null;
  }
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

export async function setSessionCookie(res: Response, claims: SessionClaims): Promise<void> {
  res.cookie(SESSION_COOKIE, await signSession(claims), cookieOptions(SESSION_TTL_SECONDS));
}

export function clearSessionCookie(res: Response): void {
  const { maxAge: _ignored, ...opts } = cookieOptions(0);
  res.clearCookie(SESSION_COOKIE, opts);
}

export { FLOW_TTL_SECONDS };
