// =============================================================================
// Restart resilience: everything changed through the API survives a reload
// from Postgres (the in-memory state is rebuilt from scratch).
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { DataService } from '../../src/services/dataService.js';
import { query } from '../../src/db/client.js';
import { authedFetch } from '../helpers/session.js';
import { resetDatabase, startServer, json } from './db.js';

let server: http.Server;
let baseUrl: string;

const restart = () => DataService.initialize({ ...process.env, DEMO_MODE: 'true' });

beforeAll(async () => {
  await resetDatabase();
  await restart();
  ({ server, baseUrl } = await startServer());
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe('Postgres-backed DataService', () => {
  it('seeds the empty database once in DEMO_MODE and loads it', async () => {
    const ds = DataService.getInstance();
    expect(ds.isPersistent()).toBe(true);
    expect(ds.getGraph().getAllNodes()).toHaveLength(19);
    expect(ds.getUsers().map((u) => u.id).sort()).toEqual(['user:admin', 'user:chen', 'user:maya', 'user:reviewer']);
    expect(ds.getDeparture('dep_sarah_001')?.handovers).toHaveLength(1);

    // A second boot must not seed again.
    await restart();
    const counts = await query(`SELECT (SELECT COUNT(*) FROM entity)::int e, (SELECT COUNT(*) FROM user_account)::int u, (SELECT COUNT(*) FROM departure)::int d`);
    expect(counts.rows[0]).toEqual({ e: 19, u: 4, d: 1 });
  });

  it('does not seed without DEMO_MODE, and refuses DEMO_MODE in production', async () => {
    await expect(DataService.initialize({ ...process.env, DEMO_MODE: 'true', NODE_ENV: 'production' })).rejects.toThrow(/not allowed in production/);
    await expect(DataService.initialize({ ...process.env, DATABASE_URL: '', NODE_ENV: 'production' })).rejects.toThrow(/DATABASE_URL must be set/);
  });

  it('keeps departures, successors, actions, change acks, users, org and audit across a restart', async () => {
    // Departure + successor naming
    let res = await authedFetch(`${baseUrl}/api/departures`, json('POST', { personId: 'person:omar@acme.com', leaveDate: '2026-12-01', note: 'Moving to Lisbon' }));
    expect(res.status).toBe(201);
    const { id: depId } = (await res.json()) as any;
    res = await authedFetch(`${baseUrl}/api/departures/${depId}/successors`, json('PUT', { assignments: [{ assetId: 'automation:n8n:101', successorId: 'person:chen@acme.com' }] }));
    expect(res.status).toBe(200);

    // Assign a backup (graph edge + action record) and accept a risk
    const actions = ((await (await authedFetch(`${baseUrl}/api/actions`)).json()) as any).actions;
    const backup = actions.find((a: any) => a.type === 'assign_backup' && a.status === 'open' && a.asset.id !== 'automation:n8n:101');
    res = await authedFetch(`${baseUrl}/api/actions/${encodeURIComponent(backup.id)}/assign-backup`, json('POST', { personId: 'person:priya@acme.com' }));
    expect(res.status).toBe(200);
    const risk = actions.find((a: any) => a.id !== backup.id && a.status === 'open');
    res = await authedFetch(`${baseUrl}/api/actions/${encodeURIComponent(risk.id)}/accept-risk`, json('POST', { reason: 'Vendor sunset next quarter', expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() }));
    expect(res.status).toBe(200);

    // Change ack, user role, org settings
    expect((await authedFetch(`${baseUrl}/api/changes/chg_001/ack`, json('POST'))).status).toBe(200);
    expect((await authedFetch(`${baseUrl}/api/users/user:maya`, json('PATCH', { role: 'reviewer' }))).status).toBe(200);
    expect((await authedFetch(`${baseUrl}/api/settings/organization`, json('PUT', { companyName: 'Northwind University', minGroupSize: 7, departmentMappings: [] }))).status).toBe(200);

    const before = DataService.getInstance();
    const snapshot = {
      departure: structuredClone(before.getDeparture(depId)),
      actions: structuredClone([...before.getAllActionOverrides().values()]),
      maya: before.getUserById('user:maya'),
      org: before.getOrganization(),
      changeAcked: before.getChangeEvents().find((c) => c.id === 'chg_001')!.acknowledged,
    };

    // "Restart": a brand-new DataService built only from Postgres.
    const after = await restart();
    expect(after).not.toBe(before);
    expect(after.getDeparture(depId)).toEqual(snapshot.departure);
    expect(after.getDeparture(depId)!.handovers.find((h) => h.assetId === 'automation:n8n:101')!.successorId).toBe('person:chen@acme.com');
    expect(after.getDeparture(depId)!.handoverPack).toBeDefined();
    expect([...after.getAllActionOverrides().values()].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      snapshot.actions.sort((a, b) => a.id.localeCompare(b.id))
    );
    expect(after.getGraph().getBackups(backup.asset.id).map((p) => p.id)).toContain('person:priya@acme.com');
    expect(after.getUserById('user:maya')).toEqual(snapshot.maya);
    expect(after.getUserById('user:maya')!.role).toBe('reviewer');
    expect(after.getOrganization()).toEqual(snapshot.org);
    expect(after.getChangeEvents().find((c) => c.id === 'chg_001')!.acknowledged).toBe(snapshot.changeAcked);
    const actionsLogged = after.getAuditLog().map((e) => e.action);
    expect(actionsLogged).toEqual(expect.arrayContaining(['INITIATE_DEPARTURE', 'ASSIGN_SUCCESSORS', 'ASSIGN_BACKUP', 'ACCEPT_RISK', 'UPDATE_USER', 'UPDATE_ORGANIZATION']));
  });

  it('versions string-valued facts in Postgres and reads them back as strings', async () => {
    const store = DataService.getInstance().getFactStore();
    await store.insertFact({ entityId: 'automation:n8n:103', attribute: 'criticality', value: 'critical', grade: 'confirmed', source: 'attestation' });
    expect((await store.getActiveFact('automation:n8n:103', 'criticality'))?.value).toBe('critical');
    const history = await store.getFactHistory('automation:n8n:103', 'criticality');
    expect(history.filter((f) => !f.validTo)).toHaveLength(1);
  });

  it('turns a failed write into a 500 and reloads memory from Postgres', async () => {
    await query('ALTER TABLE change_event RENAME TO change_event_gone');
    try {
      const res = await authedFetch(`${baseUrl}/api/changes/chg_002/ack`, json('POST'));
      expect(res.status).toBe(500);
      expect(((await res.json()) as any).error).toMatch(/could not be saved/);
    } finally {
      await query('ALTER TABLE change_event_gone RENAME TO change_event');
    }
    // The reload is fire-and-forget; give it a moment, then memory matches the database again.
    await DataService.getInstance().loadFromDatabase();
    expect(DataService.getInstance().getChangeEvents().find((c) => c.id === 'chg_002')!.acknowledged).toBe(false);
  });
});
