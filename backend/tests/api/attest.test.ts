// =============================================================================
// Horquva Continuity Platform — Confirmation campaigns + magic-link form (D12c)
// =============================================================================
// Hand-checked against tests/fixtures/handCheckableTruth.json:
//   101 Billing Sync (Omar, critical, no backup)   102 Payroll (Omar, critical)
//   103 CRM Lead Enrichment (Maya; Chen backs it up, confirmed)
//   104 Customer Onboarding (Sarah — departed)      105 AI Ticket Routing (David; no fallback fact)
// No SMTP in tests, so emails are "logged" (dry run) and tokens are read via _tokensFor.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { DataService } from '../../src/services/dataService.js';
import { _tokensFor } from '../../src/attestation/attestationService.js';
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

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const admin = async (path: string, init?: RequestInit, as = 'user:admin') => {
  const res = await authedFetch(`${baseUrl}${path}`, init, as);
  return { status: res.status, body: (await res.json()) as any };
};
// Magic-link calls carry no session at all.
const anon = async (path: string, init?: RequestInit) => {
  const res = await fetch(`${baseUrl}${path}`, init);
  return { status: res.status, body: (await res.json()) as any };
};

const graph = () => DataService.getInstance().getGraph();
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

async function campaignFor(assetIds: string[]) {
  const preview = await admin('/api/attestation/campaigns/preview', json('POST', { scope: { kind: 'selected', assetIds } }));
  const created = await admin('/api/attestation/campaigns', json('POST', { name: 'Q4 check', dueDate: inDays(14), introLine: null, sendAt: null, tasks: preview.body.tasks }));
  expect(created.status).toBe(201);
  return { preview: preview.body, created: created.body, tokens: _tokensFor(created.body.campaignId) };
}

const ANSWERS = {
  isOwner: true,
  ownerPersonId: null,
  backup: { kind: 'person', personId: 'person:priya@acme.com' },
  criticality: 'critical',
  criticalityReason: 'Takes card payments',
  runbook: { kind: 'url', url: 'https://wiki.acme.com/billing' },
  fallback: 'unknown',
};

describe('Campaign preview and creation (admin)', () => {
  it('asks each asset\'s owner; departed owners leave the asset unassigned (never invented)', async () => {
    const { body } = await admin('/api/attestation/campaigns/preview', json('POST', { scope: { kind: 'selected', assetIds: ['automation:n8n:101', 'automation:n8n:104'] } }));
    expect(body.tasks).toEqual([{ reviewerPersonId: 'person:omar@acme.com', assetEntityId: 'automation:n8n:101' }]);
    expect(body.unassignedAssets.map((a: any) => a.id)).toEqual(['automation:n8n:104']);
    expect(body.reviewers).toEqual([{ person: { id: 'person:omar@acme.com', kind: 'person', name: 'Omar Farooq' }, email: 'omar@acme.com', assetCount: 1, viaManager: false }]);
  });

  it('a leaver scope covers everything they own', async () => {
    const { body } = await admin('/api/attestation/campaigns/preview', json('POST', { scope: { kind: 'leaver', personId: 'person:omar@acme.com' } }));
    expect(body.tasks.map((t: any) => t.assetEntityId).sort()).toEqual(['automation:n8n:101', 'automation:n8n:102']);
  });

  it('says honestly that emails were only logged without SMTP; only admins create; scheduling is refused', async () => {
    const { created } = await campaignFor(['automation:n8n:106']);
    expect(created).toMatchObject({ reviewers: 1, emailDelivery: 'logged' });
    const task = { reviewerPersonId: 'person:chen@acme.com', assetEntityId: 'automation:n8n:106' };
    expect((await admin('/api/attestation/campaigns', json('POST', { name: 'x', dueDate: inDays(3), tasks: [task] }), 'user:maya')).status).toBe(403);
    expect((await admin('/api/attestation/campaigns', json('POST', { name: 'x', dueDate: inDays(3), sendAt: inDays(1), tasks: [task] }))).status).toBe(400);
    expect((await admin('/api/attestation/campaigns', json('POST', { name: 'x', dueDate: inDays(-5), tasks: [task] }))).status).toBe(400);
  });
});

describe('Magic-link form (public, token-gated)', () => {
  it('owner answers become confirmed facts; a named backup is only stated; "don\'t know" stays unknown', async () => {
    const { tokens } = await campaignFor(['automation:n8n:101', 'automation:n8n:105']);
    const omar = tokens['person:omar@acme.com'];

    const session = (await anon(`/api/attest/${omar}`)).body;
    expect(session).toMatchObject({ reviewer: { name: 'Omar Farooq', email: 'omar@acme.com' }, requestedBy: 'Alex Rivera', expired: false, submitted: false });
    expect(session.assets.map((a: any) => [a.asset.id, a.status])).toEqual([['automation:n8n:101', 'todo']]);
    expect((await anon(`/api/attest/${omar}/people`)).body.people.map((p: any) => p.name)).not.toContain('Sarah Connor'); // departed

    const taskId = session.assets[0].taskId;
    expect((await anon(`/api/attest/${omar}/tasks/${taskId}`, json('PUT', ANSWERS))).status).toBe(200);

    const node = graph().getNode('automation:n8n:101')!;
    expect(node.facts.get('criticality')).toMatchObject({ value: 'critical', grade: 'confirmed', source: 'attestation', attestedBy: 'person:omar@acme.com' });
    expect(node.facts.get('documented')).toMatchObject({ value: true, grade: 'confirmed', sourceRef: 'https://wiki.acme.com/billing' });
    // "Don't know" leaves the existing fallback fact untouched (not overwritten, not "no").
    expect(node.facts.get('fallback_exists')).toMatchObject({ value: true });
    expect(new Date(node.facts.get('fallback_exists')!.validFrom).getUTCFullYear()).toBe(2025); // still the fixture's fact
    const edges = graph().getEdgesForEntity('automation:n8n:101');
    expect(edges.find((e) => e.type === 'owns')).toMatchObject({ fromId: 'person:omar@acme.com', grade: 'confirmed', source: 'attestation' });
    expect(edges.find((e) => e.type === 'backs_up')).toMatchObject({ fromId: 'person:priya@acme.com', grade: 'stated', source: 'attestation' });

    expect((await anon(`/api/attest/${omar}/tasks/${taskId}`, json('PUT', ANSWERS))).status).toBe(409);
    expect((await anon(`/api/attest/${omar}`)).body.submitted).toBe(true);

    const audit = DataService.getInstance().getAuditLog({ action: 'ATTESTATION_SUBMITTED' })[0];
    expect(audit).toMatchObject({ actor: 'person:omar@acme.com', resource: 'asset:automation:n8n:101' });
    expect(audit.details).toMatch(/backup Priya Sharma \(stated; awaits their confirmation\)/);
  });

  it('"don\'t know" on a missing fact leaves it missing — not "no"', async () => {
    const { tokens } = await campaignFor(['automation:n8n:105']);
    const david = tokens['person:david@acme.com'];
    const taskId = (await anon(`/api/attest/${david}`)).body.assets[0].taskId;
    await anon(`/api/attest/${david}/tasks/${taskId}`, json('PUT', { ...ANSWERS, backup: { kind: 'none' }, criticality: 'medium', runbook: { kind: 'not_documented' } }));
    const node = graph().getNode('automation:n8n:105')!;
    expect(node.facts.has('fallback_exists')).toBe(false);
    expect(node.facts.get('documented')).toMatchObject({ value: false, grade: 'confirmed' });
  });

  it('"no backup" from the owner closes the old backup edge and says whose', async () => {
    const { tokens } = await campaignFor(['automation:n8n:103']);
    const maya = tokens['person:maya@acme.com'];
    const taskId = (await anon(`/api/attest/${maya}`)).body.assets[0].taskId;
    await anon(`/api/attest/${maya}/tasks/${taskId}`, json('PUT', { ...ANSWERS, backup: { kind: 'none' }, criticality: 'high' }));
    expect(graph().getBackups('automation:n8n:103')).toEqual([]);
    expect(DataService.getInstance().getAuditLog({ action: 'ATTESTATION_SUBMITTED' })[0].details).toMatch(/no backup \(removed Chen Wei\)/);
  });

  it('"I\'m not the owner" confirms nothing and raises it for an admin', async () => {
    const { tokens } = await campaignFor(['automation:n8n:102']);
    const omar = tokens['person:omar@acme.com'];
    const before = graph().getNode('automation:n8n:102')!.facts.get('criticality');
    const taskId = (await anon(`/api/attest/${omar}`)).body.assets[0].taskId;
    const res = await anon(`/api/attest/${omar}/tasks/${taskId}`, json('PUT', { isOwner: false, ownerPersonId: 'person:chen@acme.com' }));
    expect(res.status).toBe(200);
    expect(graph().getNode('automation:n8n:102')!.facts.get('criticality')).toBe(before);
    expect(graph().getOwners('automation:n8n:102').map((o) => o.id)).toEqual(['person:omar@acme.com']);
    const change = DataService.getInstance().getChangeEvents(false)[0];
    expect(change).toMatchObject({ kind: 'owner_changed', title: "Omar Farooq says they don't own Payroll Batch Trigger", href: '/assets/automation:n8n:102' });
    expect(change.impact).toMatch(/named Chen Wei/);
  });

  it('rejects unknown links, other people\'s tasks, self-backup and bad answers', async () => {
    expect((await anon('/api/attest/nope')).status).toBe(404);
    const { tokens } = await campaignFor(['automation:n8n:106', 'automation:n8n:103']);
    const chen = tokens['person:chen@acme.com'];
    const maya = tokens['person:maya@acme.com'];
    const mayasTask = (await anon(`/api/attest/${maya}`)).body.assets[0].taskId;
    expect((await anon(`/api/attest/${chen}/tasks/${mayasTask}`, json('PUT', ANSWERS))).status).toBe(404);
    const chensTask = (await anon(`/api/attest/${chen}`)).body.assets[0].taskId;
    expect((await anon(`/api/attest/${chen}/tasks/${chensTask}`, json('PUT', { ...ANSWERS, backup: { kind: 'person', personId: 'person:chen@acme.com' } }))).status).toBe(400);
    expect((await anon(`/api/attest/${chen}/tasks/${chensTask}`, json('PUT', { ...ANSWERS, criticalityReason: '' }))).status).toBe(400);
  });
});

describe('Campaign progress', () => {
  it('lists campaigns with real counts and per-reviewer progress; no invented reminder dates', async () => {
    const { created, tokens } = await campaignFor(['automation:n8n:101', 'automation:n8n:102']);
    const omar = tokens['person:omar@acme.com'];
    const first = (await anon(`/api/attest/${omar}`)).body.assets[0].taskId;
    await anon(`/api/attest/${omar}/tasks/${first}`, json('PUT', ANSWERS)).catch(() => undefined);

    const row = (await admin('/api/attestation/campaigns')).body.campaigns.find((c: any) => c.id === created.campaignId);
    expect(row).toMatchObject({ total_tasks: 2, status: 'active' });
    const detail = (await admin(`/api/attestation/campaigns/${created.campaignId}`)).body;
    expect(detail.reviewers[0]).toMatchObject({ person: { name: 'Omar Farooq' }, total: 2 });
    expect(detail).toMatchObject({ reminderAt: null, escalationAt: null });
  });
});

describe('Email preview (Sprint 3 D15)', () => {
  const tasks = [
    { reviewerPersonId: 'person:omar@acme.com', assetEntityId: 'automation:n8n:101' },
    { reviewerPersonId: 'person:omar@acme.com', assetEntityId: 'automation:n8n:102' },
    { reviewerPersonId: 'person:maya@acme.com', assetEntityId: 'automation:n8n:103' },
  ];
  const due = '2026-12-01T00:00:00.000Z';

  it('renders the exact email one reviewer gets, with the admin wording escaped', async () => {
    const res = await admin(
      '/api/attestation/campaigns/email-preview',
      json('POST', { dueDate: due, introLine: 'From <b>Ops</b>', email: { subject: 'Check your systems', bodyText: 'Body & more' }, tasks })
    );
    expect(res.status).toBe(200);
    // First reviewer alphabetically: Maya Lin.
    expect(res.body).toMatchObject({ to: { person: { name: 'Maya Lin' }, email: 'maya@acme.com' }, reviewerCount: 2, subject: 'Check your systems' });
    expect(res.body.html).toContain('Hi Maya Lin');
    expect(res.body.html).toContain('From &lt;b&gt;Ops&lt;/b&gt;');
    expect(res.body.html).toContain('Body &amp; more');
    expect(res.body.html).toContain('CRM Lead Enrichment');
    expect(res.body.html).not.toContain('Billing Sync'); // Omar's systems are not in Maya's email
    // Honest about the link: not "single-use"; says when it stops working (due + 14 days).
    expect(res.body.html).not.toMatch(/single-use/i);
    expect(res.body.text).toContain('works until Dec 15, 2026');
  });

  it('is admin-only and refuses an empty campaign', async () => {
    expect((await admin('/api/attestation/campaigns/email-preview', json('POST', { dueDate: due, tasks }), 'user:chen')).status).toBe(403);
    expect((await admin('/api/attestation/campaigns/email-preview', json('POST', { dueDate: due, tasks: [] }))).status).toBe(400);
  });

  it('marks a campaign overdue once its due date passes with answers outstanding', async () => {
    const { created } = await campaignFor(['automation:n8n:101']);
    const realNow = Date.now;
    Date.now = () => realNow() + 30 * 86_400_000;
    try {
      const row = (await admin('/api/attestation/campaigns')).body.campaigns.find((c: any) => c.id === created.campaignId);
      expect(row.status).toBe('overdue');
    } finally {
      Date.now = realNow;
    }
  });
});
