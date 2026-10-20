// =============================================================================
// Horquva Continuity Platform — Demo login Vitest Suite
// =============================================================================
// The shared demo-deployment login: off unless DEMO_LOGIN_EMAIL and
// DEMO_LOGIN_PASSWORD are both set, works with NODE_ENV=production, signs in
// only as the seeded user it names, and throttles repeated wrong passwords.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import http from 'node:http';
import express from 'express';
import { createAuthRouter } from '../../src/routes/auth.js';
import { DataService } from '../../src/services/dataService.js';
import { demoLoginConfig, resetDemoLoginThrottle } from '../../src/auth/demoLogin.js';

const PASSWORD = 'correct-horse-battery-staple';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  DataService.resetInstance();
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter({ providers: () => [] }));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${(server.address() as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

afterEach(() => {
  delete process.env.DEMO_LOGIN_EMAIL;
  delete process.env.DEMO_LOGIN_PASSWORD;
  resetDemoLoginThrottle();
});

function enable(email = 'alex@acme.com', password = PASSWORD) {
  process.env.DEMO_LOGIN_EMAIL = email;
  process.env.DEMO_LOGIN_PASSWORD = password;
}

function signIn(email: string, password: string) {
  return fetch(`${baseUrl}/api/auth/demo/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

describe('demo login', () => {
  it('is off, and not advertised, until both variables are set', async () => {
    process.env.DEMO_LOGIN_EMAIL = 'alex@acme.com';
    expect((await signIn('alex@acme.com', PASSWORD)).status).toBe(404);
    const body = (await (await fetch(`${baseUrl}/api/auth/providers`)).json()) as { demoLogin: boolean };
    expect(body.demoLogin).toBe(false);
  });

  it('is advertised once configured', async () => {
    enable();
    const body = (await (await fetch(`${baseUrl}/api/auth/providers`)).json()) as { demoLogin: boolean };
    expect(body.demoLogin).toBe(true);
  });

  it('signs in as the seeded user with the right password (email case-insensitive)', async () => {
    enable();
    const res = await signIn('Alex@Acme.com', PASSWORD);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ userId: 'user:admin', role: 'admin' });

    const cookie = res.headers.getSetCookie().find((c) => c.startsWith('horquva_session='))!.split(';')[0];
    const session = await fetch(`${baseUrl}/api/auth/session`, { headers: { cookie } });
    expect(session.status).toBe(200);
  });

  it('works with NODE_ENV=production', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = 'test-session-secret-for-production-mode';
    try {
      enable();
      expect((await signIn('alex@acme.com', PASSWORD)).status).toBe(200);
    } finally {
      process.env.NODE_ENV = prev;
      delete process.env.SESSION_SECRET;
    }
  });

  it('rejects a wrong password or another user, without setting a cookie', async () => {
    enable();
    const wrong = await signIn('alex@acme.com', 'not-the-password');
    expect(wrong.status).toBe(401);
    expect(wrong.headers.getSetCookie()).toEqual([]);
    expect((await signIn('maya@acme.com', PASSWORD)).status).toBe(401);
  });

  it('refuses when the demo email has no account in this deployment', async () => {
    enable('nobody@acme.com');
    expect((await signIn('nobody@acme.com', PASSWORD)).status).toBe(403);
  });

  it('locks out after repeated wrong passwords, even for the right one', async () => {
    enable();
    for (let i = 0; i < 10; i++) expect((await signIn('alex@acme.com', 'nope')).status).toBe(401);
    expect((await signIn('alex@acme.com', PASSWORD)).status).toBe(429);
  });
});

describe('demo login config', () => {
  it('rejects a short password so a weak one never reaches production', () => {
    expect(() => demoLoginConfig({ DEMO_LOGIN_EMAIL: 'a@b.c', DEMO_LOGIN_PASSWORD: 'short' })).toThrow(/at least 12/);
  });

  it('is null when either variable is missing', () => {
    expect(demoLoginConfig({ DEMO_LOGIN_EMAIL: 'a@b.c' })).toBeNull();
    expect(demoLoginConfig({ DEMO_LOGIN_PASSWORD: PASSWORD })).toBeNull();
  });
});
