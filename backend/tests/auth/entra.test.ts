// =============================================================================
// Horquva Continuity Platform — Entra ID SSO Vitest Suite (SRS SEC-01)
// =============================================================================
// Drives the full OIDC code + PKCE flow against a fake Entra: a local RSA key
// signs ID tokens and a stubbed token endpoint returns them. Covers the happy
// path plus every rejection: state, nonce, signature, audience, unknown user.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import http from 'node:http';
import express from 'express';
import { SignJWT, exportJWK, generateKeyPair, createLocalJWKSet, type JWTPayload } from 'jose';
import { createAuthRouter } from '../../src/routes/auth.js';
import { entraEmailFromClaims, getEntraProvider } from '../../src/auth/entra.js';
import type { OidcProvider } from '../../src/auth/oidc.js';

const TENANT = '11111111-2222-3333-4444-555555555555';
const ISSUER = `https://login.microsoftonline.com/${TENANT}/v2.0`;
const CLIENT_ID = 'horquva-test-client';

type Keys = Awaited<ReturnType<typeof generateKeyPair>>;
let trusted: Keys;
let untrusted: Keys;
let provider: OidcProvider;

/** What the fake token endpoint should put in the next ID token. */
let nextToken: { claims: JWTPayload; key: 'trusted' | 'untrusted' } | null = null;
let lastTokenRequest: URLSearchParams | null = null;

async function signIdToken(claims: JWTPayload, keys: Keys) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(keys.privateKey);
}

const fakeFetch = async (_url: string, init: RequestInit) => {
  lastTokenRequest = new URLSearchParams(String(init.body));
  if (!nextToken) return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 });
  const id_token = await signIdToken(nextToken.claims, nextToken.key === 'trusted' ? trusted : untrusted);
  return new Response(JSON.stringify({ id_token, token_type: 'Bearer' }), { status: 200 });
};

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  process.env.FRONTEND_URL = 'http://app.test';
  trusted = await generateKeyPair('RS256');
  untrusted = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(trusted.publicKey)), kid: 'k1', alg: 'RS256' };

  provider = {
    id: 'microsoft',
    clientId: CLIENT_ID,
    clientSecret: 'secret',
    authorizationEndpoint: `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
    issuer: ISSUER,
    jwks: createLocalJWKSet({ keys: [jwk] }),
    scopes: 'openid profile email',
    emailFromClaims: entraEmailFromClaims,
  };

  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter({ providers: () => [provider], fetchImpl: fakeFetch }));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${(server.address() as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  delete process.env.FRONTEND_URL;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

afterEach(() => {
  nextToken = null;
  lastTokenRequest = null;
  delete process.env.AUTH_DEV_LOGIN;
});

function cookieFrom(res: Response, name: string): string | null {
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(';');
    const [k, v] = pair.split('=');
    if (k === name && v) return `${k}=${v}`;
  }
  return null;
}

/** Runs /start and returns what a browser would carry back to /callback. */
async function startFlow(returnTo = '/departures') {
  const res = await fetch(`${baseUrl}/api/auth/microsoft/start?returnTo=${encodeURIComponent(returnTo)}`, {
    redirect: 'manual',
  });
  const authorize = new URL(res.headers.get('location')!);
  return {
    res,
    authorize,
    flowCookie: cookieFrom(res, 'horquva_oidc')!,
    state: authorize.searchParams.get('state')!,
    nonce: authorize.searchParams.get('nonce')!,
  };
}

function callback(flowCookie: string | null, query: Record<string, string>) {
  return fetch(`${baseUrl}/api/auth/microsoft/callback?${new URLSearchParams(query)}`, {
    redirect: 'manual',
    headers: flowCookie ? { cookie: flowCookie } : {},
  });
}

function validClaims(nonce: string, overrides: JWTPayload = {}): JWTPayload {
  return { iss: ISSUER, aud: CLIENT_ID, sub: 'entra-oid-1', nonce, preferred_username: 'Alex@Acme.com', ...overrides };
}

describe('Entra ID SSO (SEC-01)', () => {
  it('lists Microsoft as a configured provider', async () => {
    const body = (await (await fetch(`${baseUrl}/api/auth/providers`)).json()) as any;
    expect(body.providers).toEqual(['microsoft']);
    expect(body.devLogin).toBe(false);
  });

  it('start redirects to the tenant authorize endpoint with PKCE, state and nonce', async () => {
    const { res, authorize, flowCookie } = await startFlow();
    expect(res.status).toBe(302);
    expect(authorize.origin + authorize.pathname).toBe(provider.authorizationEndpoint);
    expect(authorize.searchParams.get('client_id')).toBe(CLIENT_ID);
    expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorize.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(authorize.searchParams.get('redirect_uri')).toBe(`${baseUrl}/api/auth/microsoft/callback`);
    expect(flowCookie).toBeTruthy();
    expect(res.headers.getSetCookie()[0]).toMatch(/HttpOnly/i);
  });

  it('completes sign-in: verified token → session cookie → /session returns the user', async () => {
    const { flowCookie, state, nonce } = await startFlow('/departures');
    nextToken = { claims: validClaims(nonce), key: 'trusted' };

    const res = await callback(flowCookie, { code: 'auth-code-1', state });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://app.test/departures');
    expect(lastTokenRequest?.get('code')).toBe('auth-code-1');
    expect(lastTokenRequest?.get('code_verifier')).toBeTruthy();

    const session = cookieFrom(res, 'horquva_session');
    expect(session).toBeTruthy();

    const me = await fetch(`${baseUrl}/api/auth/session`, { headers: { cookie: session! } });
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ userId: 'user:admin', email: 'alex@acme.com', role: 'admin' });
  });

  it('rejects a callback whose state does not match the flow cookie', async () => {
    const { flowCookie, nonce } = await startFlow();
    nextToken = { claims: validClaims(nonce), key: 'trusted' };
    const res = await callback(flowCookie, { code: 'c', state: 'forged' });
    expect(res.headers.get('location')).toBe('http://app.test/sign-in?error=invalid_state');
    expect(cookieFrom(res, 'horquva_session')).toBeNull();
  });

  it('rejects a callback with no flow cookie (CSRF / expired)', async () => {
    const { state } = await startFlow();
    const res = await callback(null, { code: 'c', state });
    expect(res.headers.get('location')).toContain('error=invalid_state');
  });

  it('rejects an ID token with the wrong nonce (replay)', async () => {
    const { flowCookie, state } = await startFlow();
    nextToken = { claims: validClaims('some-other-nonce'), key: 'trusted' };
    const res = await callback(flowCookie, { code: 'c', state });
    expect(res.headers.get('location')).toContain('error=invalid_id_token');
  });

  it('rejects an ID token signed by an unknown key', async () => {
    const { flowCookie, state, nonce } = await startFlow();
    nextToken = { claims: validClaims(nonce), key: 'untrusted' };
    const res = await callback(flowCookie, { code: 'c', state });
    expect(res.headers.get('location')).toContain('error=invalid_id_token');
  });

  it('rejects an ID token issued for another app or tenant', async () => {
    for (const bad of [{ aud: 'someone-else' }, { iss: 'https://login.microsoftonline.com/other-tenant/v2.0' }]) {
      const { flowCookie, state, nonce } = await startFlow();
      nextToken = { claims: validClaims(nonce, bad), key: 'trusted' };
      const res = await callback(flowCookie, { code: 'c', state });
      expect(res.headers.get('location')).toContain('error=invalid_id_token');
    }
  });

  it('refuses identities with no OBA account', async () => {
    const { flowCookie, state, nonce } = await startFlow();
    nextToken = { claims: validClaims(nonce, { preferred_username: 'stranger@elsewhere.com' }), key: 'trusted' };
    const res = await callback(flowCookie, { code: 'c', state });
    expect(res.headers.get('location')).toContain('error=not_provisioned');
    expect(cookieFrom(res, 'horquva_session')).toBeNull();
  });

  it('surfaces a rejected code exchange as token_exchange_failed', async () => {
    const { flowCookie, state } = await startFlow();
    const res = await callback(flowCookie, { code: 'c', state }); // nextToken null → 400
    expect(res.headers.get('location')).toContain('error=token_exchange_failed');
  });

  it('never redirects off-site after sign-in', async () => {
    for (const evil of ['//evil.com', 'https://evil.com', '/\\evil.com']) {
      const { flowCookie, state, nonce } = await startFlow(evil);
      nextToken = { claims: validClaims(nonce), key: 'trusted' };
      const res = await callback(flowCookie, { code: 'c', state });
      expect(res.headers.get('location')).toBe('http://app.test/');
    }
  });

  it('/session is 401 without a valid cookie, and sign-out clears it', async () => {
    expect((await fetch(`${baseUrl}/api/auth/session`)).status).toBe(401);
    expect((await fetch(`${baseUrl}/api/auth/session`, { headers: { cookie: 'horquva_session=garbage' } })).status).toBe(401);

    const out = await fetch(`${baseUrl}/api/auth/sign-out`, { method: 'POST' });
    expect(out.status).toBe(204);
    expect(out.headers.getSetCookie().join()).toMatch(/horquva_session=;/);
  });

  it('dev sign-in is off unless AUTH_DEV_LOGIN=true', async () => {
    const post = () =>
      fetch(`${baseUrl}/api/auth/dev/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'maya@acme.com' }),
      });
    expect((await post()).status).toBe(404);

    process.env.AUTH_DEV_LOGIN = 'true';
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ userId: 'user:maya', role: 'viewer' });
  });
});

describe('Entra provider config', () => {
  it('is disabled until tenant, client id and secret are all set', () => {
    expect(getEntraProvider({ ENTRA_TENANT_ID: TENANT, ENTRA_CLIENT_ID: 'x' })).toBeNull();
    const p = getEntraProvider({ ENTRA_TENANT_ID: TENANT, ENTRA_CLIENT_ID: 'x', ENTRA_CLIENT_SECRET: 'y' });
    expect(p?.issuer).toBe(ISSUER);
  });

  it('refuses multi-tenant aliases so the issuer stays pinned', () => {
    expect(() =>
      getEntraProvider({ ENTRA_TENANT_ID: 'common', ENTRA_CLIENT_ID: 'x', ENTRA_CLIENT_SECRET: 'y' })
    ).toThrow(/specific tenant/);
  });

  it('prefers the email claim and falls back to the UPN', () => {
    expect(entraEmailFromClaims({ email: 'A@acme.com', preferred_username: 'b@acme.com' })).toEqual({ email: 'a@acme.com' });
    expect(entraEmailFromClaims({ preferred_username: 'B@acme.com' })).toEqual({ email: 'b@acme.com' });
    expect(entraEmailFromClaims({ preferred_username: 'not-an-email' })).toHaveProperty('error');
  });
});
