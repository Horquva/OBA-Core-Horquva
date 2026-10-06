// =============================================================================
// Horquva Continuity Platform — Generic OIDC Authorization Code + PKCE Flow
// =============================================================================
// Shared by the Entra ID and Google providers. Each provider supplies its
// endpoints, JWKS and claim mapping; this module builds the authorize URL,
// exchanges the code, and validates the ID token (signature, issuer,
// audience, expiry, nonce).
// =============================================================================

import crypto from 'node:crypto';
import { jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';

export type AuthProviderId = 'microsoft' | 'google';

export interface OidcProvider {
  id: AuthProviderId;
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  /** Google signs with two equivalent issuer spellings, hence the array form. */
  issuer: string | string[];
  jwks: JWTVerifyGetKey;
  scopes: string;
  /** Extra authorize-URL params (e.g. Google's `hd` domain hint). */
  extraAuthParams?: Record<string, string>;
  /** Maps verified ID-token claims to a sign-in email, or explains why not. */
  emailFromClaims(claims: JWTPayload): { email: string } | { error: string };
}

export class AuthFlowError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'AuthFlowError';
  }
}

function base64url(buf: Buffer): string {
  return buf.toString('base64url');
}

export function randomToken(bytes = 32): string {
  return base64url(crypto.randomBytes(bytes));
}

export function pkceChallenge(verifier: string): string {
  return base64url(crypto.createHash('sha256').update(verifier).digest());
}

export function buildAuthorizeUrl(
  provider: OidcProvider,
  params: { redirectUri: string; state: string; nonce: string; codeVerifier: string }
): string {
  const url = new URL(provider.authorizationEndpoint);
  const q = url.searchParams;
  q.set('client_id', provider.clientId);
  q.set('response_type', 'code');
  q.set('redirect_uri', params.redirectUri);
  q.set('scope', provider.scopes);
  q.set('state', params.state);
  q.set('nonce', params.nonce);
  q.set('code_challenge', pkceChallenge(params.codeVerifier));
  q.set('code_challenge_method', 'S256');
  q.set('response_mode', 'query');
  for (const [k, v] of Object.entries(provider.extraAuthParams ?? {})) q.set(k, v);
  return url.toString();
}

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** Exchanges the authorization code and returns the verified ID-token claims. */
export async function exchangeCodeForClaims(
  provider: OidcProvider,
  params: { code: string; redirectUri: string; codeVerifier: string; nonce: string },
  fetchImpl: FetchLike = fetch
): Promise<JWTPayload> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    code_verifier: params.codeVerifier,
  });

  let res: Response;
  try {
    res = await fetchImpl(provider.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
  } catch (err) {
    throw new AuthFlowError('token_exchange_failed', `Token endpoint unreachable: ${(err as Error).message}`);
  }

  const json = (await res.json().catch(() => ({}))) as { id_token?: unknown; error?: unknown; error_description?: unknown };
  if (!res.ok || typeof json.id_token !== 'string') {
    const reason = typeof json.error_description === 'string' ? json.error_description : String(json.error ?? res.status);
    throw new AuthFlowError('token_exchange_failed', `Token exchange rejected: ${reason}`);
  }

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(json.id_token, provider.jwks, {
      issuer: provider.issuer,
      audience: provider.clientId,
      algorithms: ['RS256'],
    }));
  } catch (err) {
    throw new AuthFlowError('invalid_id_token', `ID token failed verification: ${(err as Error).message}`);
  }

  if (payload.nonce !== params.nonce) {
    throw new AuthFlowError('invalid_id_token', 'ID token nonce does not match this sign-in attempt.');
  }
  return payload;
}
