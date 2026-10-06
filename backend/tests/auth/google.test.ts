// =============================================================================
// Horquva Continuity Platform — Google Workspace SSO + Combined Auth Middleware
// =============================================================================
// Runs the shared OIDC flow against a fake Google (local RSA key, stubbed
// token endpoint) and proves the session it issues is honoured by the
// provider-agnostic requireAuth / attachUser middleware (SRS SEC-01).
// =============================================================================

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import http from 'node:http';
import express from 'express';
import { SignJWT, exportJWK, generateKeyPair, createLocalJWKSet, type JWTPayload } from 'jose';
import { createAuthRouter } from '../../src/routes/auth.js';
import { getGoogleProvider, googleEmailFromClaims } from '../../src/auth/google.js';
import { attachUser, requireAuth } from '../../src/auth/middleware.js';
import type { OidcProvider } from '../../src/auth/oidc.js';

const CLIENT_ID = 'horquva-google-test.apps.googleusercontent.com';
const DOMAIN = 'acme.com';

let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let provider: OidcProvider;
let nextClaims: JWTPayload | null = null;

const fakeFetch = async () => {
  if (!nextClaims) return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 });
  const id_token = await new SignJWT(nextClaims)
    .setProtectedHeader({ alg: 'RS256', kid: 'g1' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(keys.privateKey);
  return new Response(JSON.stringify({ id_token }), { status: 200 });
};

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  process.env.FRONTEND_URL = 'http://app.test';
  keys = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(keys.publicKey)), kid: 'g1', alg: 'RS256' };
  const real = getGoogleProvider({ GOOGLE_CLIENT_ID: CLIENT_ID, GOOGLE_CLIENT_SECRET: 's', GOOGLE_WORKSPACE_DOMAIN: DOMAIN })!;
  provider = { ...real, jwks: createLocalJWKSet({ keys: [jwk] }) };

  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter({ providers: () => [provider], fetchImpl: fakeFetch }));
  app.get('/api/protected', requireAuth, (req, res) => res.json({ userId: req.user!.id }));
  app.get('/api/optional', attachUser, (req, res) => res.json({ userId: req.user?.id ?? null }));
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
  nextClaims = null;
});

function cookieFrom(res: Response, name: string): string | null {
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(';');
    const [k, v] = pair.split('=');
    if (k === name && v) return `${k}=${v}`;
  }
  return null;
}

/** Full browser round-trip; returns the callback response. */
async function signIn(claims: (nonce: string) => JWTPayload) {
  const start = await fetch(`${baseUrl}/api/auth/google/start`, { redirect: 'manual' });
  const authorize = new URL(start.headers.get('location')!);
  nextClaims = claims(authorize.searchParams.get('nonce')!);
  return fetch(
    `${baseUrl}/api/auth/google/callback?code=c&state=${authorize.searchParams.get('state')}`,
    { redirect: 'manual', headers: { cookie: cookieFrom(start, 'horquva_oidc')! } }
  );
}

const good = (overrides: JWTPayload = {}) => (nonce: string): JWTPayload => ({
  iss: 'https://accounts.google.com',
  aud: CLIENT_ID,
  sub: 'google-uid-1',
  nonce,
  email: 'Chen@acme.com',
  email_verified: true,
  hd: DOMAIN,
  ...overrides,
});

describe('Google Workspace SSO (SEC-01)', () => {
  it('start sends the workspace domain hint and account chooser to Google', async () => {
    const res = await fetch(`${baseUrl}/api/auth/google/start`, { redirect: 'manual' });
    const authorize = new URL(res.headers.get('location')!);
    expect(authorize.origin).toBe('https://accounts.google.com');
    expect(authorize.searchParams.get('hd')).toBe(DOMAIN);
    expect(authorize.searchParams.get('prompt')).toBe('select_account');
    expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('signs in a verified workspace user under either Google issuer spelling', async () => {
    for (const iss of ['https://accounts.google.com', 'accounts.google.com']) {
      const res = await signIn(good({ iss }));
      expect(res.headers.get('location')).toBe('http://app.test/');
      const session = cookieFrom(res, 'horquva_session')!;
      const me = await fetch(`${baseUrl}/api/auth/session`, { headers: { cookie: session } });
      expect(await me.json()).toMatchObject({ userId: 'user:chen', role: 'reviewer' });
    }
  });

  it('refuses personal Gmail and other workspaces even with a valid signature', async () => {
    for (const hd of [undefined, 'evil.com']) {
      const res = await signIn(good({ hd }));
      expect(res.headers.get('location')).toBe('http://app.test/sign-in?error=account_rejected');
      expect(cookieFrom(res, 'horquva_session')).toBeNull();
    }
  });

  it('refuses unverified email addresses', async () => {
    const res = await signIn(good({ email_verified: false }));
    expect(res.headers.get('location')).toContain('error=account_rejected');
  });

  it('rejects tokens from a non-Google issuer', async () => {
    const res = await signIn(good({ iss: 'https://accounts.evil.com' }));
    expect(res.headers.get('location')).toContain('error=invalid_id_token');
  });
});

describe('Combined auth middleware', () => {
  it('requireAuth rejects anonymous and tampered sessions with 401', async () => {
    expect((await fetch(`${baseUrl}/api/protected`)).status).toBe(401);
    const tampered = await fetch(`${baseUrl}/api/protected`, { headers: { cookie: 'horquva_session=eyJhbGciOiJub25lIn0.e30.' } });
    expect(tampered.status).toBe(401);
  });

  it('requireAuth accepts a session issued by Google sign-in', async () => {
    const session = cookieFrom(await signIn(good()), 'horquva_session')!;
    const res = await fetch(`${baseUrl}/api/protected`, { headers: { cookie: session } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: 'user:chen' });
  });

  it('attachUser passes anonymous requests through without a user', async () => {
    expect(await (await fetch(`${baseUrl}/api/optional`)).json()).toEqual({ userId: null });
  });
});

describe('Google provider config', () => {
  it('is disabled without client credentials', () => {
    expect(getGoogleProvider({})).toBeNull();
  });

  it('refuses to start without a workspace domain', () => {
    expect(() => getGoogleProvider({ GOOGLE_CLIENT_ID: 'x', GOOGLE_CLIENT_SECRET: 'y' })).toThrow(/GOOGLE_WORKSPACE_DOMAIN/);
  });

  it('maps claims case-insensitively', () => {
    expect(googleEmailFromClaims({ email: 'A@Acme.com', email_verified: true, hd: 'ACME.com' }, 'acme.com')).toEqual({
      email: 'a@acme.com',
    });
  });
});
