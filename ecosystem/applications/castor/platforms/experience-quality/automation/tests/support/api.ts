import { APIRequestContext, request } from '@playwright/test';

const API_BASE_URL = process.env.QA_API_BASE_URL ?? 'https://oba-core-horquva-mu.vercel.app';

export interface AuthedUser {
  token: string;
  user: { sub?: string; email: string; role: string; org?: string };
}

/**
 * Direct backend login per BACKEND_INTEGRATION.md (POST /api/auth/login -> { token, user }).
 * Used to seed authenticated state for protected-route/approval-workflow specs without
 * driving the login UI on every test (kept as its own dedicated UI spec instead).
 */
export async function loginViaApi(
  email = process.env.QA_TEST_EMAIL ?? 'qa-exec@castor.test',
  password = process.env.QA_TEST_PASSWORD ?? 'change-me',
): Promise<AuthedUser> {
  const ctx: APIRequestContext = await request.newContext({ baseURL: API_BASE_URL });
  const res = await ctx.post('/api/auth/login', { data: { email, password } });
  if (!res.ok()) {
    throw new Error(`QA login failed (${res.status()}): ${await res.text()}`);
  }
  const body = (await res.json()) as AuthedUser;
  await ctx.dispose();
  return body;
}

export async function bootReportIsHealthy(): Promise<boolean> {
  const ctx = await request.newContext({ baseURL: API_BASE_URL });
  const res = await ctx.get('/api/brain/boot-report');
  const body = await res.json().catch(() => null);
  await ctx.dispose();
  return res.ok() && body?.accepted === true;
}
