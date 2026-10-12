// Invite-only access (POST/DELETE /api/users, last-admin guard) and the setup guide status.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { DataService } from '../../src/services/dataService.js';
import { authedFetch } from '../helpers/session.js';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  DataService.resetInstance();
  await new Promise<void>((r) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${(server.address() as any).port}`;
      r();
    });
  });
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

describe('invite-only access', () => {
  it('admins invite people; duplicates are refused; non-admins cannot invite', async () => {
    const res = await authedFetch(`${baseUrl}/api/users`, json('POST', { email: 'Lina@Uni.edu', name: 'Lina Haddad', role: 'reviewer' }));
    expect(res.status).toBe(201);
    const { user } = (await res.json()) as any;
    expect(user).toMatchObject({ email: 'lina@uni.edu', role: 'reviewer', isHrManager: false });
    expect(DataService.getInstance().getUserByEmail('lina@uni.edu')).not.toBeNull();

    expect((await authedFetch(`${baseUrl}/api/users`, json('POST', { email: 'lina@uni.edu', name: 'Lina', role: 'viewer' }))).status).toBe(409);
    expect((await authedFetch(`${baseUrl}/api/users`, json('POST', { email: 'x@uni.edu', name: 'X', role: 'admin' }), 'user:maya')).status).toBe(403);
  });

  it('revoking access ends the person\'s session on the next request', async () => {
    const id = DataService.getInstance().getUserByEmail('lina@uni.edu')!.id;
    expect((await authedFetch(`${baseUrl}/api/users/${encodeURIComponent(id)}`, json('DELETE'))).status).toBe(200);
    expect((await authedFetch(`${baseUrl}/api/departures`, {}, id)).status).toBe(401);
  });

  it('the only admin can be neither demoted nor removed', async () => {
    expect((await authedFetch(`${baseUrl}/api/users/user:admin`, json('PATCH', { role: 'viewer' }))).status).toBe(409);
    expect((await authedFetch(`${baseUrl}/api/users/user:admin`, json('DELETE'))).status).toBe(409);
    // With a second admin, demotion is fine.
    expect((await authedFetch(`${baseUrl}/api/users/user:chen`, json('PATCH', { role: 'admin' }))).status).toBe(200);
    expect((await authedFetch(`${baseUrl}/api/users/user:admin`, json('PATCH', { role: 'reviewer' }))).status).toBe(200);
  });
});

describe('setup guide status', () => {
  it('derives every step from real state and can be dismissed', async () => {
    const status = (await (await authedFetch(`${baseUrl}/api/onboarding/status`, {}, 'user:maya')).json()) as any;
    // Demo org name is a placeholder; no database in this suite, so nothing has synced.
    expect(status.steps).toEqual({ organization: false, directory: false, automations: false, baseline: false });
    expect(status.completed).toBe(false);
    expect(status.dismissedAt).toBeNull();

    await authedFetch(`${baseUrl}/api/settings/organization`, json('PUT', { companyName: 'Northwind University' }), 'user:chen');
    expect((await (await authedFetch(`${baseUrl}/api/onboarding/status`, {}, 'user:chen')).json() as any).steps.organization).toBe(true);

    expect((await authedFetch(`${baseUrl}/api/onboarding/dismiss`, json('POST'), 'user:maya')).status).toBe(403);
    const dismissed = await authedFetch(`${baseUrl}/api/onboarding/dismiss`, json('POST'), 'user:chen');
    expect(dismissed.status).toBe(200);
    expect(((await (await authedFetch(`${baseUrl}/api/onboarding/status`, {}, 'user:chen')).json()) as any).dismissedAt).not.toBeNull();
  });
});
