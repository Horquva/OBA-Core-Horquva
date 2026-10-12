import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { authedFetch } from '../helpers/session.js';

describe('Settings, Connections, Users & Audit Log REST API', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  describe('Connections API (B-17)', () => {
    it('GET /api/connections returns all configured data sources with masked secrets', async () => {
      const res = await authedFetch(`${baseUrl}/api/connections`);
      expect(res.status).toBe(200);

      const data = (await res.json()) as any;
      expect(Array.isArray(data.connections)).toBe(true);
      // No invented connectors: without the connection store there are none.
      expect(['database', 'unavailable']).toContain(data.store);
      if (data.store === 'unavailable') expect(data.connections).toEqual([]);
      // Never any secret material (SEC-03).
      expect(JSON.stringify(data)).not.toMatch(/secret|sk-|api_/i);
      // What the graph holds, by source (fixture: entra people/groups, n8n assets, attestation).
      const entra = data.sources.find((s: any) => s.source === 'entra');
      expect(entra.relationships).toBeGreaterThan(0);
      expect(data.sources.map((s: any) => s.source)).toEqual(expect.arrayContaining(['entra', 'n8n', 'attestation']));
    }, 10000);

    it('POST /api/connections/:id/sync says syncing needs the database instead of faking one (in-memory mode)', async () => {
      const res = await authedFetch(`${baseUrl}/api/connections/conn_n8n_prod/sync`, { method: 'POST' });
      expect(res.status).toBe(503);
      expect(((await res.json()) as any).error).toMatch(/need the database/);
    });

    it('connection routes stay admin-only', async () => {
      const res = await authedFetch(`${baseUrl}/api/connections`, { method: 'GET' }, 'user:maya');
      expect(res.status).toBe(403);
    });
  });

  describe('Users Management API (B-02)', () => {
    it('GET /api/users returns registered users and their RBAC roles', async () => {
      const res = await authedFetch(`${baseUrl}/api/users`);
      expect(res.status).toBe(200);

      const data = (await res.json()) as any;
      expect(data).toHaveProperty('users');
      expect(Array.isArray(data.users)).toBe(true);
      expect(data.users.length).toBeGreaterThanOrEqual(2);

      const admin = data.users.find((u: any) => u.id === 'user:admin');
      expect(admin).toBeDefined();
      expect(admin.role).toBe('admin');
      expect(admin.isHrManager).toBe(true);
    });

    it('PATCH /api/users/:id updates role and hr manager flag', async () => {
      const res = await authedFetch(`${baseUrl}/api/users/user:maya`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reviewer', isHrManager: true }),
      });
      expect(res.status).toBe(200);

      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.user.id).toBe('user:maya');
      expect(data.user.role).toBe('reviewer');
      expect(data.user.isHrManager).toBe(true);
    });

    it('PATCH /api/users/:id rejects invalid role with 400', async () => {
      const res = await authedFetch(`${baseUrl}/api/users/user:maya`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'super_admin_invalid' }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Organization Settings API (B-19)', () => {
    it('GET /api/settings/organization returns organization metadata and department mappings', async () => {
      const res = await authedFetch(`${baseUrl}/api/settings/organization`);
      expect(res.status).toBe(200);

      const data = (await res.json()) as any;
      expect(data).toHaveProperty('companyName');
      expect(data).toHaveProperty('minGroupSize');
      expect(data).toHaveProperty('departmentMappings');
      expect(Array.isArray(data.departmentMappings)).toBe(true);
    });

    it('PUT /api/settings/organization updates settings', async () => {
      const payload = {
        companyName: 'Acme Global Corp',
        minGroupSize: 7,
        departmentMappings: [
          { raw: 'Eng - Platform', mapped: 'Platform Infrastructure' },
          { raw: 'Ops', mapped: 'Operations' },
        ],
      };

      const res = await authedFetch(`${baseUrl}/api/settings/organization`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(res.status).toBe(200);

      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.organization.companyName).toBe('Acme Global Corp');
      expect(data.organization.minGroupSize).toBe(7);
      expect(data.organization.departmentMappings).toHaveLength(2);
    });
  });

  describe('Audit Log API (B-20)', () => {
    it('GET /api/audit-log returns recorded governance actions', async () => {
      const res = await authedFetch(`${baseUrl}/api/audit-log`);
      expect(res.status).toBe(200);

      const data = (await res.json()) as any;
      expect(data).toHaveProperty('entries');
      expect(Array.isArray(data.entries)).toBe(true);
      expect(data.entries.length).toBeGreaterThan(0);

      const entry = data.entries[0];
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('actor');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('resource');
      expect(entry).toHaveProperty('at');
    });

    it('GET /api/audit-log supports filtering by action', async () => {
      const res = await authedFetch(`${baseUrl}/api/audit-log?action=UPDATE_ORGANIZATION`);
      expect(res.status).toBe(200);

      const data = (await res.json()) as any;
      expect(data.entries.length).toBeGreaterThan(0);
      for (const e of data.entries) {
        expect(e.action).toBe('UPDATE_ORGANIZATION');
      }
    });

    it('is newest first, bounded, names the actor, and states its real retention', async () => {
      const data = (await (await authedFetch(`${baseUrl}/api/audit-log?limit=2`)).json()) as any;
      expect(data.entries).toHaveLength(2);
      expect(data.total).toBeGreaterThanOrEqual(2);
      expect(data.entries[0].at >= data.entries[1].at).toBe(true);
      expect(data.entries[0]).toMatchObject({ actor: 'user:admin', actorName: 'Alex Rivera' });
      expect(data.actions).toContain('UPDATE_ORGANIZATION');
      expect(data.retention).toEqual({ storage: 'memory', capacity: 20000 });
      expect((await authedFetch(`${baseUrl}/api/audit-log?from=yesterday-ish`)).status).toBe(400);
      const changes = (await (await authedFetch(`${baseUrl}/api/audit-log?hideReads=true&limit=1000`)).json()) as any;
      expect(changes.entries.some((e: any) => e.action === 'API_GET')).toBe(false);
    });
  });
});
