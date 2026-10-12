// =============================================================================
// Attestation on Postgres: campaigns, magic links and answers survive a
// restart; a task can be submitted once; reminders are scheduled and recorded.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { DataService } from '../../src/services/dataService.js';
import { _tokensFor, sendDueReminders, MAX_REMINDERS } from '../../src/attestation/attestationService.js';
import { query } from '../../src/db/client.js';
import { authedFetch } from '../helpers/session.js';
import { resetDatabase, startServer, json } from './db.js';

let server: http.Server;
let baseUrl: string;

const restart = () => DataService.initialize({ ...process.env, DEMO_MODE: 'true' });
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const admin = async (path: string, init?: RequestInit) => {
  const res = await authedFetch(`${baseUrl}${path}`, init);
  return { status: res.status, body: (await res.json()) as any };
};
const anon = async (path: string, init?: RequestInit) => {
  const res = await fetch(`${baseUrl}${path}`, init);
  return { status: res.status, body: (await res.json()) as any };
};
const ANSWERS = {
  isOwner: true,
  ownerPersonId: null,
  backup: { kind: 'person', personId: 'person:priya@acme.com' },
  criticality: 'high', // the fixture says 'critical': a real change, so a new confirmed version
  criticalityReason: 'Pays the vendors',
  runbook: { kind: 'url', url: 'https://wiki.acme.com/payables' },
  fallback: 'no',
};

let campaignId: string;
let omarToken: string;

beforeAll(async () => {
  await resetDatabase();
  await restart();
  ({ server, baseUrl } = await startServer());
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe('attestation campaigns on Postgres', () => {
  it('saves the campaign, tasks and links (link stored hashed + encrypted, never in plain text)', async () => {
    const preview = await admin('/api/attestation/campaigns/preview', json('POST', { scope: { kind: 'selected', assetIds: ['automation:n8n:101', 'automation:n8n:102', 'automation:n8n:103'] } }));
    const created = await admin('/api/attestation/campaigns', json('POST', { name: 'Q4 ownership check', dueDate: inDays(14), introLine: 'Five minutes, promise.', sendAt: null, tasks: preview.body.tasks }));
    expect(created.status).toBe(201);
    campaignId = created.body.campaignId;
    omarToken = _tokensFor(campaignId)['person:omar@acme.com'];

    const rows = await query(`SELECT (SELECT COUNT(*) FROM campaign)::int c, (SELECT COUNT(*) FROM attestation_task)::int t, (SELECT COUNT(*) FROM attestation_link)::int l`);
    expect(rows.rows[0]).toEqual({ c: 1, t: 3, l: 2 }); // Omar owns 101+102, Maya owns 103
    const dump = (await query(`SELECT token_hash, token_encrypted::text e FROM attestation_link`)).rows;
    for (const r of dump) {
      expect(r.token_hash).not.toBe(omarToken);
      expect(r.e).not.toContain(omarToken);
    }
  });

  it('a magic link keeps working after a restart, and answers become confirmed facts in Postgres', async () => {
    await restart();
    const session = await anon(`/api/attest/${omarToken}`);
    expect(session.status).toBe(200);
    expect(session.body.assets).toHaveLength(2);

    const taskId = session.body.assets.find((a: any) => a.asset.id === 'automation:n8n:101').taskId;
    expect((await anon(`/api/attest/${omarToken}/tasks/${taskId}`, json('PUT', ANSWERS))).status).toBe(200);

    const crit = (await query(`SELECT value, grade, attested_by FROM fact WHERE entity_id = 'automation:n8n:101' AND attribute = 'criticality' AND valid_to IS NULL`)).rows;
    expect(crit).toEqual([{ value: 'high', grade: 'confirmed', attested_by: 'person:omar@acme.com' }]);
    const owns = (await query(`SELECT grade, source FROM edge WHERE from_id = 'person:omar@acme.com' AND to_id = 'automation:n8n:101' AND type = 'owns' AND valid_to IS NULL`)).rows;
    expect(owns).toEqual([{ grade: 'confirmed', source: 'attestation' }]);
    const backup = (await query(`SELECT grade FROM edge WHERE from_id = 'person:priya@acme.com' AND to_id = 'automation:n8n:101' AND type = 'backs_up' AND valid_to IS NULL`)).rows;
    expect(backup).toEqual([{ grade: 'stated' }]);

    // After another restart the task is still answered and can't be answered again.
    await restart();
    const again = await anon(`/api/attest/${omarToken}`);
    expect(again.body.assets.find((a: any) => a.taskId === taskId).status).toBe('saved');
    expect((await anon(`/api/attest/${omarToken}/tasks/${taskId}`, json('PUT', ANSWERS))).status).toBe(409);
    expect(DataService.getInstance().getGraph().getNode('automation:n8n:101')!.facts.get('criticality')!.value).toBe('high');
  });

  it('two simultaneous submissions of the same task: exactly one wins', async () => {
    const session = await anon(`/api/attest/${omarToken}`);
    const taskId = session.body.assets.find((a: any) => a.asset.id === 'automation:n8n:102').taskId;
    const [a, b] = await Promise.all([
      anon(`/api/attest/${omarToken}/tasks/${taskId}`, json('PUT', ANSWERS)),
      anon(`/api/attest/${omarToken}/tasks/${taskId}`, json('PUT', ANSWERS)),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const versions = (await query(`SELECT COUNT(*)::int n FROM fact WHERE entity_id = 'automation:n8n:102' AND attribute = 'criticality' AND attested_by = 'person:omar@acme.com'`)).rows[0].n;
    expect(versions).toBe(1);
  });

  it('reminds only reviewers with open assets, on schedule, and remembers it across restarts', async () => {
    const ds = DataService.getInstance();
    expect(await sendDueReminders(ds, new Date())).toBe(0); // nothing due yet

    const detail = await admin(`/api/attestation/campaigns/${campaignId}`);
    const due = new Date(detail.body.reminderAt);
    expect(await sendDueReminders(ds, new Date(due.getTime() + 1000))).toBe(1); // Maya only: Omar answered everything
    await ds.flushWrites();
    const link = (await query(`SELECT reviewer_person_id, reminders_sent FROM attestation_link WHERE reminders_sent > 0`)).rows;
    expect(link).toEqual([{ reviewer_person_id: 'person:maya@acme.com', reminders_sent: 1 }]);

    await restart();
    const ds2 = DataService.getInstance();
    expect(await sendDueReminders(ds2, new Date(due.getTime() + 1000))).toBe(0); // already reminded; next one is 3 days later
    let total = 1;
    for (let i = 1; i <= 5; i++) total += await sendDueReminders(ds2, new Date(due.getTime() + i * 3.1 * 86_400_000));
    expect(total).toBe(MAX_REMINDERS);
  });
});
