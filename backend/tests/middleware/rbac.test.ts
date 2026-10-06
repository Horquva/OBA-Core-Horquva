// =============================================================================
// Horquva Continuity Platform — RBAC + Audit Trail Vitest Suite (SEC-02, SEC-06)
// =============================================================================
// Exercises the real server: every /api route sits behind the policy table,
// and every write / denial lands in the audit trail under the real actor.
// Seed users: user:admin (admin+HR), user:chen (reviewer), user:maya (viewer).
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { DataService } from '../../src/services/dataService.js';
import { permissionFor, hasPermission } from '../../src/middleware/rbac.js';
import { authedFetch } from '../helpers/session.js';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
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

const json = (method: string, body: unknown = {}): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const as = (userId: string, path: string, init: RequestInit = {}) => authedFetch(`${baseUrl}${path}`, init, userId);

describe('RBAC enforcement (SEC-02)', () => {
  it('rejects anonymous calls to protected routes with 401', async () => {
    for (const path of ['/api/departures', '/api/continuity/overview', '/api/assets', '/api/me/tasks']) {
      expect((await fetch(`${baseUrl}${path}`)).status, path).toBe(401);
    }
  });

  it('keeps magic-link attestation and the free v0 check public', async () => {
    expect((await fetch(`${baseUrl}/api/attestation/review/no-such-token`)).status).not.toBe(401);
    expect((await fetch(`${baseUrl}/api/v0/n8n-check`, json('POST'))).status).not.toBe(401);
  });

  it('lets a viewer read every core screen', async () => {
    for (const path of ['/api/departures', '/api/continuity/overview', '/api/assets', '/api/people/teams', '/api/actions', '/api/changes']) {
      expect((await as('user:maya', path)).status, path).toBe(200);
    }
  });

  it('lets a viewer run what-if simulations (compute-only POSTs)', async () => {
    const res = await as('user:maya', '/api/continuity/simulations/leaver', json('POST', { departingPersonIds: ['person:omar@acme.com'] }));
    expect(res.status).toBe(200);
  });

  it('blocks a viewer from every write', async () => {
    const writes: Array<[string, RequestInit]> = [
      ['/api/departures', json('POST', { personId: 'person:omar@acme.com', leaveDate: '2026-12-01' })],
      ['/api/actions/a1/assign-backup', json('POST', { personId: 'person:x' })],
      ['/api/changes/ack-all', json('POST')],
      ['/api/departures/d1/verify', json('POST')],
    ];
    for (const [path, init] of writes) {
      expect((await as('user:maya', path, init)).status, path).toBe(403);
    }
  });

  it('lets any role reach handover responses (the successor check happens in the service)', async () => {
    expect(permissionFor('POST', '/handovers/h1/accept')).toBe('read');
    // Passes RBAC as a viewer; 404 because the handover does not exist.
    expect((await as('user:maya', '/api/handovers/nope/accept', json('POST'))).status).toBe(404);
  });

  it('blocks a reviewer from admin routes but allows editing', async () => {
    for (const path of ['/api/users', '/api/connections', '/api/audit-log', '/api/identity-queue']) {
      expect((await as('user:chen', path)).status, path).toBe(403);
    }
    expect((await as('user:chen', '/api/settings/organization', json('PUT', {}))).status).toBe(403);
    expect((await as('user:chen', '/api/attestation/campaigns', json('POST', {}))).status).toBe(403);
    // Allowed: passes RBAC (any non-401/403 means the handler ran).
    expect((await as('user:chen', '/api/changes/ack-all', json('POST'))).status).toBe(200);
  });

  it('only admins or HR managers can initiate departures', async () => {
    const body = json('POST', {}); // invalid body → 400 proves the handler was reached
    expect((await as('user:chen', '/api/departures', body)).status).toBe(403);
    expect((await as('user:admin', '/api/departures', body)).status).toBe(400);

    const ds = DataService.getInstance();
    ds.updateUser('user:maya', { isHrManager: true });
    try {
      expect((await as('user:maya', '/api/departures', body)).status).toBe(400);
    } finally {
      ds.updateUser('user:maya', { isHrManager: false });
    }
  });

  it('applies role changes immediately (role read per request, not from the cookie)', async () => {
    const ds = DataService.getInstance();
    ds.updateUser('user:chen', { role: 'admin' });
    try {
      expect((await as('user:chen', '/api/users')).status).toBe(200);
    } finally {
      ds.updateUser('user:chen', { role: 'reviewer' });
    }
    expect((await as('user:chen', '/api/users')).status).toBe(403);
  });
});

describe('RBAC policy table', () => {
  it('fails closed for routes nobody listed', () => {
    expect(permissionFor('GET', '/brand-new-thing')).toBe('read');
    expect(permissionFor('POST', '/brand-new-thing')).toBe('admin');
    expect(permissionFor('DELETE', '/departures/d1')).toBe('admin');
  });

  it('does not let a path prefix leak a looser rule', () => {
    expect(permissionFor('POST', '/departures/d1/successors')).toBe('admin'); // PUT is the listed method
    expect(permissionFor('POST', '/v0/n8n-check/extra')).toBe('admin');
    expect(permissionFor('GET', '/users/anything')).toBe('admin');
  });

  it('maps roles to permissions like the frontend', () => {
    const viewer = { id: 'v', name: '', email: '', role: 'viewer' as const, isHrManager: false, title: null };
    const reviewer = { ...viewer, role: 'reviewer' as const };
    expect(hasPermission(viewer, 'read')).toBe(true);
    expect(hasPermission(viewer, 'edit')).toBe(false);
    expect(hasPermission(reviewer, 'edit')).toBe(true);
    expect(hasPermission(reviewer, 'admin')).toBe(false);
    expect(hasPermission({ ...viewer, isHrManager: true }, 'departure')).toBe(true);
  });
});

describe('Audit trail (SEC-06)', () => {
  const ds = () => DataService.getInstance();
  const newest = () => ds().getAuditLog()[0];

  it('records domain actions under the real signed-in user, not a hard-coded admin', async () => {
    await as('user:chen', '/api/changes/ack-all', json('POST'));
    expect(newest()).toMatchObject({ actor: 'user:chen', action: 'ACKNOWLEDGE_ALL_CHANGES' });
  });

  it('does not double-log routes that already write a domain entry', async () => {
    const before = ds().getAuditLog().length;
    await as('user:chen', '/api/changes/ack-all', json('POST'));
    expect(ds().getAuditLog().length).toBe(before + 1);
  });

  it('records writes that have no domain entry as API_<METHOD>', async () => {
    await as('user:maya', '/api/continuity/simulations/leaver', json('POST', { departingPersonIds: ['person:omar@acme.com'] }));
    expect(newest()).toMatchObject({
      actor: 'user:maya',
      action: 'API_POST',
      resource: '/api/continuity/simulations/leaver',
    });
  });

  it('records denied requests with the actor (or anonymous)', async () => {
    await as('user:maya', '/api/users');
    expect(newest()).toMatchObject({ actor: 'user:maya', action: 'ACCESS_DENIED', resource: '/api/users' });
    expect(newest().details).toContain('403');

    await fetch(`${baseUrl}/api/departures`);
    expect(newest()).toMatchObject({ actor: 'anonymous', action: 'ACCESS_DENIED' });
  });

  it('does not log successful reads', async () => {
    const before = ds().getAuditLog().length;
    await as('user:maya', '/api/departures');
    await as('user:maya', '/api/assets');
    expect(ds().getAuditLog().length).toBe(before);
  });

  it('records sign-in and sign-out', async () => {
    process.env.AUTH_DEV_LOGIN = 'true';
    try {
      const res = await fetch(`${baseUrl}/api/auth/dev/sign-in`, json('POST', { email: 'maya@acme.com' }));
      expect(newest()).toMatchObject({ actor: 'user:maya', action: 'SIGN_IN', details: 'dev' });
      const cookie = res.headers.getSetCookie()[0].split(';')[0];
      await fetch(`${baseUrl}/api/auth/sign-out`, { method: 'POST', headers: { cookie } });
      expect(newest()).toMatchObject({ actor: 'user:maya', action: 'SIGN_OUT' });
    } finally {
      delete process.env.AUTH_DEV_LOGIN;
    }
  });
});
