// =============================================================================
// Horquva Continuity Platform — Microsoft Entra ID SSO (SRS SEC-01)
// =============================================================================
// Single-tenant OIDC against the customer's Entra tenant (one deployment per
// org). Issuer is pinned to the configured tenant, so tokens from any other
// tenant fail verification.
//
// Env: ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET
// =============================================================================

import { createRemoteJWKSet, type JWTPayload } from 'jose';
import type { OidcProvider } from './oidc.js';

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function tenantJwks(tenantId: string) {
  let jwks = jwksCache.get(tenantId);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`));
    jwksCache.set(tenantId, jwks);
  }
  return jwks;
}

/** Entra puts the mailbox in `email` when the optional claim is configured; otherwise the UPN in `preferred_username`. */
export function entraEmailFromClaims(claims: JWTPayload): { email: string } | { error: string } {
  const candidate = [claims.email, claims.preferred_username].find(
    (v): v is string => typeof v === 'string' && v.includes('@')
  );
  if (!candidate) return { error: 'Your Microsoft account did not provide an email address.' };
  return { email: candidate.toLowerCase() };
}

export function getEntraProvider(env: NodeJS.ProcessEnv = process.env): OidcProvider | null {
  const tenantId = env.ENTRA_TENANT_ID;
  const clientId = env.ENTRA_CLIENT_ID;
  const clientSecret = env.ENTRA_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) return null;

  // Multi-tenant aliases would make the issuer unpinnable.
  if (['common', 'organizations', 'consumers'].includes(tenantId.toLowerCase())) {
    throw new Error('ENTRA_TENANT_ID must be a specific tenant id, not a multi-tenant alias.');
  }

  const base = `https://login.microsoftonline.com/${tenantId}`;
  return {
    id: 'microsoft',
    clientId,
    clientSecret,
    authorizationEndpoint: `${base}/oauth2/v2.0/authorize`,
    tokenEndpoint: `${base}/oauth2/v2.0/token`,
    issuer: `${base}/v2.0`,
    jwks: tenantJwks(tenantId),
    scopes: 'openid profile email',
    emailFromClaims: entraEmailFromClaims,
  };
}
