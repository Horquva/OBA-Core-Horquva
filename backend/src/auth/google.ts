// =============================================================================
// Horquva Continuity Platform — Google Workspace SSO (SRS SEC-01)
// =============================================================================
// Google OIDC. Personal Gmail accounts are refused: the `hd` (hosted domain)
// claim must match GOOGLE_WORKSPACE_DOMAIN. The `hd` authorize param is only a
// UI hint, so the claim is checked after signature verification.
//
// Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_WORKSPACE_DOMAIN
// =============================================================================

import { createRemoteJWKSet, type JWTPayload } from 'jose';
import type { OidcProvider } from './oidc.js';

let googleJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function jwks() {
  googleJwks ??= createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
  return googleJwks;
}

export function googleEmailFromClaims(
  claims: JWTPayload,
  workspaceDomain: string
): { email: string } | { error: string } {
  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : null;
  if (!email) return { error: 'Your Google account did not provide an email address.' };
  if (claims.email_verified !== true) return { error: 'Your Google email address is not verified.' };
  if (typeof claims.hd !== 'string' || claims.hd.toLowerCase() !== workspaceDomain.toLowerCase()) {
    return { error: `Sign in with your ${workspaceDomain} Google Workspace account.` };
  }
  return { email };
}

export function getGoogleProvider(env: NodeJS.ProcessEnv = process.env): OidcProvider | null {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const domain = env.GOOGLE_WORKSPACE_DOMAIN;
  if (!clientId || !clientSecret) return null;
  if (!domain) {
    throw new Error('GOOGLE_WORKSPACE_DOMAIN must be set so personal Google accounts cannot sign in.');
  }

  return {
    id: 'google',
    clientId,
    clientSecret,
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    jwks: jwks(),
    scopes: 'openid email profile',
    extraAuthParams: { hd: domain, prompt: 'select_account' },
    emailFromClaims: (claims) => googleEmailFromClaims(claims, domain),
  };
}
