// =============================================================================
// Horquva Continuity Platform — Demo deployment login
// =============================================================================
// One shared email + password for a sales-demo deployment, where there is no
// identity provider to sign in with. Off unless DEMO_LOGIN_EMAIL and
// DEMO_LOGIN_PASSWORD are both set; unlike the dev sign-in it works in
// production. It signs in only as the seeded user DEMO_LOGIN_EMAIL names, so
// that account must exist (db/resetDemoDeployment.ts seeds it).
// =============================================================================

import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

const MIN_PASSWORD_LENGTH = 12;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

export interface DemoLoginConfig {
  email: string;
  password: string;
}

/** Null when the demo login is off; throws on a password too weak to put on the internet. */
export function demoLoginConfig(env: NodeJS.ProcessEnv = process.env): DemoLoginConfig | null {
  const email = env.DEMO_LOGIN_EMAIL?.trim().toLowerCase();
  const password = env.DEMO_LOGIN_PASSWORD;
  if (!email || !password) return null;
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`DEMO_LOGIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  return { email, password };
}

const digest = (s: string) => createHash('sha256').update(s).digest();

/** Constant-time on both fields, so a wrong email takes as long as a wrong password. */
export function demoCredentialsMatch(email: string, password: string, config: DemoLoginConfig): boolean {
  const emailOk = timingSafeEqual(digest(email.trim().toLowerCase()), digest(config.email));
  const passwordOk = timingSafeEqual(digest(password), digest(config.password));
  return emailOk && passwordOk;
}

// Failed attempts per client, in memory (one instance per deployment).
const failures = new Map<string, number[]>();

/**
 * The browser's address. Behind the Vercel proxy the first X-Forwarded-For hop
 * is the client Vercel saw; a caller hitting Render directly can forge it, so
 * this throttle slows guessing down rather than stopping it — the password's
 * length is what keeps the account safe.
 */
export function demoClientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || req.socket.remoteAddress || 'unknown';
}

function recent(key: string, now: number): number[] {
  const kept = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (kept.length) failures.set(key, kept);
  else failures.delete(key);
  return kept;
}

export function demoLoginThrottled(key: string, now = Date.now()): boolean {
  return recent(key, now).length >= MAX_FAILURES;
}

export function recordDemoLoginFailure(key: string, now = Date.now()): void {
  failures.set(key, [...recent(key, now), now]);
}

/** Tests only. */
export function resetDemoLoginThrottle(): void {
  failures.clear();
}
