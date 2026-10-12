// Every answer shape the phone form sends must save on Postgres (found by the e2e suite).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { DataService } from '../../src/services/dataService.js';
import { _tokensFor } from '../../src/attestation/attestationService.js';
import { authedFetch } from '../helpers/session.js';
import { query } from '../../src/db/client.js';
import { resetDatabase, startServer, json } from './db.js';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  await resetDatabase();
  await DataService.initialize({ ...process.env, DEMO_MODE: 'true' });
  ({ server, baseUrl } = await startServer());
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe('attestation answers on Postgres', () => {
  it('saves "no backup / not documented / don\'t know" and "someone else owns it"', async () => {
    const reviewer = 'person:omar@acme.com';
    const res = await authedFetch(`${baseUrl}/api/attestation/campaigns`, json('POST', {
      name: 'answers', dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      tasks: [{ reviewerPersonId: reviewer, assetEntityId: 'automation:n8n:101' }, { reviewerPersonId: reviewer, assetEntityId: 'automation:n8n:103' }],
    }));
    expect(res.status).toBe(201);
    const token = _tokensFor(((await res.json()) as any).campaignId)[reviewer];
    const session = (await (await fetch(`${baseUrl}/api/attest/${token}`)).json()) as any;
    const task = (id: string) => session.assets.find((a: any) => a.asset.id === id).taskId;

    const own = await fetch(`${baseUrl}/api/attest/${token}/tasks/${task('automation:n8n:101')}`, json('PUT', {
      isOwner: true, ownerPersonId: null, backup: { kind: 'none' }, criticality: 'high',
      criticalityReason: 'stops billing', runbook: { kind: 'not_documented' }, fallback: 'unknown',
    }));
    expect(own.status, await own.text()).toBe(200);

    const notMine = await fetch(`${baseUrl}/api/attest/${token}/tasks/${task('automation:n8n:103')}`, json('PUT', {
      isOwner: false, ownerPersonId: 'person:maya@acme.com',
    }));
    expect(notMine.status, await notMine.text()).toBe(200);

    // Magic-link calls are audited (path >64 chars once) without the bearer token.
    await DataService.getInstance().flushWrites();
    const rows = (await query(`SELECT resource_type, resource_id, details::text AS d FROM audit_log WHERE resource_id LIKE '/api/attest/%'`)).rows;
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.resource_type).toBe('api');
      expect(r.resource_id + r.d).not.toContain(token);
    }
  });
});
