// =============================================================================
// Horquva Continuity Platform — Identity Queue REST API Vitest Suite
// =============================================================================
// Tests SRS ID-02 & ID-03:
// - GET /api/identity-queue (List pending accounts with match suggestion)
// - POST /api/identity-queue/:id/resolve (Resolve with link/service_account/departed/ignore)
// =============================================================================

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { DataService } from '../../src/services/dataService.js';
import { authedFetch } from '../helpers/session.js';

describe('Identity Queue REST API (SRS ID-02, ID-03)', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET /api/identity-queue returns pending items with suggestions', async () => {
    const res = await authedFetch(`${baseUrl}/api/identity-queue`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);

    const first = body.items[0];
    expect(first.id).toBeDefined();
    expect(first.source).toBeDefined();
    expect(first.emailCandidate).toBeDefined();
  });

  it('POST /api/identity-queue/:id/resolve marks item resolved', async () => {
    const listRes = await authedFetch(`${baseUrl}/api/identity-queue`);
    const { items } = (await listRes.json()) as any;
    const target = items[0];
    expect(target).toBeDefined();

    const resolveRes = await authedFetch(`${baseUrl}/api/identity-queue/${encodeURIComponent(target.id)}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'link',
        personId: 'person:david@acme.com',
      }),
    });

    expect(resolveRes.status).toBe(200);

    // Verify removed from pending
    const afterRes = await authedFetch(`${baseUrl}/api/identity-queue`);
    const afterBody = (await afterRes.json()) as any;
    const found = afterBody.items.find((i: any) => i.id === target.id);
    expect(found).toBeUndefined();

    // Credited to the signed-in admin, with a readable audit entry; a second resolve is refused.
    const audit = (await (await authedFetch(`${baseUrl}/api/audit-log?action=IDENTITY_RESOLVED`)).json()) as any;
    expect(audit.entries[0]).toMatchObject({ actor: 'user:admin', resource: `identity:${target.id}` });
    expect(audit.entries[0].details).toMatch(/linked to David Miller/);
    const again = await authedFetch(`${baseUrl}/api/identity-queue/${encodeURIComponent(target.id)}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ignore' }),
    });
    expect(again.status).toBe(409);
  });

  it('rejects unknown items and links to non-people', async () => {
    const post = (id: string, body: unknown) =>
      authedFetch(`${baseUrl}/api/identity-queue/${encodeURIComponent(id)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    expect((await post('nope', { action: 'ignore' })).status).toBe(404);
    const queue = DataService.getInstance().getQueueService();
    const item = await queue.enqueueUnmatched({ source: 'n8n', externalAccountId: 'ext_test_1', displayName: 'Test Bot' } as any);
    expect((await post(item.id, { action: 'link', personId: 'model:openai:gpt-4o' })).status).toBe(400);
    expect((await post(item.id, { action: 'link', personId: 'person:nobody@acme.com' })).status).toBe(400);
  });

  describe('Task 2.7 — Stored Suggestions, Graph Attribution & Bulk Confirmation', () => {
    beforeEach(() => {
      DataService.resetInstance();
    });

    it('GET /api/identity-queue excludes actively linked accounts and surfaces stored suggestions with linkId and reason', async () => {
      const ds = DataService.getInstance();
      const queue = ds.getQueueService();
      const linkRepo = ds.getLinkRepository();

      // 1. Account already actively linked -> must NOT appear in GET /api/identity-queue
      const qLinked = await queue.enqueueUnmatched({
        source: 'n8n',
        externalAccountId: 'account:n8n:ext_already_linked',
        displayName: 'Already Linked',
        email: 'omar@acme.com',
      });
      await linkRepo.create({
        accountId: 'account:n8n:ext_already_linked',
        personId: 'person:omar@acme.com',
        grade: 'stated',
        method: 'exact_email',
        linkedBy: 'autoLink',
        note: 'Exact email',
      });

      // 2. Account with stored suggested link -> surfaces linkId & stored reason
      const qStored = await queue.enqueueUnmatched({
        source: 'openai',
        externalAccountId: 'account:openai:ext_suggested',
        displayName: 'O. Farooq (OpenAI)',
        email: 'omar@acme.com',
      });
      const storedSug = await linkRepo.create({
        accountId: 'account:openai:ext_suggested',
        personId: 'person:omar@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Display name similarity 0.91',
      });

      // 3. Account with no stored suggestion -> falls back to IdentityMatcher (linkId: null)
      const qFallback = await queue.enqueueUnmatched({
        source: 'n8n',
        externalAccountId: 'ext_fallback_matcher',
        displayName: 'David Fallback',
        email: 'david@gmail.com',
      });

      const res = await authedFetch(`${baseUrl}/api/identity-queue`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;

      expect(body.items.find((i: any) => i.id === qLinked.id)).toBeUndefined();

      const storedRow = body.items.find((i: any) => i.id === qStored.id);
      expect(storedRow).toBeDefined();
      expect(storedRow.suggestion).toEqual({
        linkId: storedSug.id,
        person: { id: 'person:omar@acme.com', kind: 'person', name: 'Omar Farooq' },
        reason: 'Display name similarity 0.91',
      });

      const fallbackRow = body.items.find((i: any) => i.id === qFallback.id);
      expect(fallbackRow?.suggestion).toMatchObject({
        linkId: null,
        person: { id: 'person:david@acme.com', kind: 'person', name: 'David Miller' },
      });
      expect(typeof fallbackRow?.suggestion?.reason).toBe('string');
      expect(fallbackRow.suggestion.reason.length).toBeGreaterThan(0);
    });

    it('POST /:id/resolve creates confirmed IdentityLink, refreshes graph attribution, and returns 409 on active admin_link', async () => {
      const ds = DataService.getInstance();
      const graph = ds.getGraph();
      const now = new Date('2026-11-01T00:00:00Z');

      graph.addEntity({
        id: 'account:n8n:acc_res',
        kind: 'account',
        name: 'Elena Tool Account',
        externalRefs: { source: 'n8n' },
        createdAt: now,
        updatedAt: now,
      });
      graph.addEntity({
        id: 'automation:n8n:res_wf',
        kind: 'automation',
        name: 'Resolve Attribution Workflow',
        externalRefs: {},
        createdAt: now,
        updatedAt: now,
      });
      graph.addEdge({
        id: 'edge_acc_res_owns',
        fromId: 'account:n8n:acc_res',
        toId: 'automation:n8n:res_wf',
        type: 'owns',
        grade: 'stated',
        source: 'connector:n8n',
        sourceRef: 'connector:n8n',
        validFrom: now,
        validTo: null,
      });

      const queue = ds.getQueueService();
      const qItem = await queue.enqueueUnmatched({
        source: 'n8n',
        externalAccountId: 'account:n8n:acc_res',
        displayName: 'Elena Tool Account',
      });

      const resolveRes = await authedFetch(`${baseUrl}/api/identity-queue/${encodeURIComponent(qItem.id)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link', personId: 'person:elena@acme.com' }),
      });
      expect(resolveRes.status).toBe(200);

      const active = await ds.getLinkRepository().listActive();
      expect(active.find((l) => l.accountId === 'account:n8n:acc_res')).toMatchObject({
        personId: 'person:elena@acme.com',
        grade: 'confirmed',
        method: 'admin_link',
      });

      // Graph was refreshed and attributes the workflow to Elena
      const owners = ds.getGraph().getOwners('automation:n8n:res_wf').map((o) => o.id);
      expect(owners).toEqual(['person:elena@acme.com']);

      // Another pending item for the same admin-linked account returns 409
      const dupQueue = await queue.enqueueUnmatched({
        source: 'n8n',
        externalAccountId: 'acc_res',
        displayName: 'Elena Duplicate',
      });
      const conflictRes = await authedFetch(`${baseUrl}/api/identity-queue/${encodeURIComponent(dupQueue.id)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link', personId: 'person:omar@acme.com' }),
      });
      expect(conflictRes.status).toBe(409);
    });

    it('POST /api/identity-queue/confirm-suggestions enforces RBAC (401/403), Zod (400), 404/409, confirms batch, refreshes graph, and logs per-link audits', async () => {
      const ds = DataService.getInstance();
      const graph = ds.getGraph();
      const linkRepo = ds.getLinkRepository();
      const queue = ds.getQueueService();
      const now = new Date('2026-11-01T00:00:00Z');

      // 401 when unauthenticated
      const unauth = await fetch(`${baseUrl}/api/identity-queue/confirm-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkIds: ['any'] }),
      });
      expect(unauth.status).toBe(401);

      // 403 for non-admin (reviewer and viewer)
      const reviewerRes = await authedFetch(
        `${baseUrl}/api/identity-queue/confirm-suggestions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkIds: ['any'] }),
        },
        'user:reviewer'
      );
      expect(reviewerRes.status).toBe(403);

      const viewerRes = await authedFetch(
        `${baseUrl}/api/identity-queue/confirm-suggestions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkIds: ['any'] }),
        },
        'user:maya'
      );
      expect(viewerRes.status).toBe(403);

      // 400 on invalid payload (empty array / >200)
      const emptyRes = await authedFetch(`${baseUrl}/api/identity-queue/confirm-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkIds: [] }),
      });
      expect(emptyRes.status).toBe(400);

      const tooManyRes = await authedFetch(`${baseUrl}/api/identity-queue/confirm-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkIds: Array.from({ length: 201 }, (_, i) => `id-${i}`) }),
      });
      expect(tooManyRes.status).toBe(400);

      // Setup accounts + workflow + suggestions + queue rows
      graph.addEntity({
        id: 'account:n8n:bulk_1',
        kind: 'account',
        name: 'Bulk Account 1',
        externalRefs: { source: 'n8n' },
        createdAt: now,
        updatedAt: now,
      });
      graph.addEntity({
        id: 'automation:n8n:bulk_wf_1',
        kind: 'automation',
        name: 'Bulk Workflow 1',
        externalRefs: {},
        createdAt: now,
        updatedAt: now,
      });
      graph.addEdge({
        id: 'edge_bulk_1',
        fromId: 'account:n8n:bulk_1',
        toId: 'automation:n8n:bulk_wf_1',
        type: 'owns',
        grade: 'stated',
        source: 'connector:n8n',
        sourceRef: 'connector:n8n',
        validFrom: now,
        validTo: null,
      });

      const q1 = await queue.enqueueUnmatched({
        source: 'n8n',
        externalAccountId: 'account:n8n:bulk_1',
        displayName: 'Bulk Account 1',
      });
      const q2 = await queue.enqueueUnmatched({
        source: 'openai',
        externalAccountId: 'bulk_2_raw',
        displayName: 'Bulk Account 2',
      });

      const sug1 = await linkRepo.create({
        accountId: 'account:n8n:bulk_1',
        personId: 'person:omar@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Name similarity 0.93',
      });
      const sug1Competing = await linkRepo.create({
        accountId: 'account:n8n:bulk_1',
        personId: 'person:david@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Competing suggestion',
      });
      const sug2 = await linkRepo.create({
        accountId: 'account:openai:bulk_2_raw',
        personId: 'person:elena@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Name similarity 0.89',
      });

      // 404 on missing linkId
      const missingRes = await authedFetch(`${baseUrl}/api/identity-queue/confirm-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkIds: [sug1.id, '00000000-0000-0000-0000-000000000000'] }),
      });
      expect(missingRes.status).toBe(404);

      // 409 on duplicate accountId in batch
      const dupAccRes = await authedFetch(`${baseUrl}/api/identity-queue/confirm-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkIds: [sug1.id, sug1Competing.id] }),
      });
      expect(dupAccRes.status).toBe(409);

      // 409 on closed or non-suggested link
      const closedSug = await linkRepo.create({
        accountId: 'account:n8n:bulk_closed',
        personId: 'person:omar@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Closed suggestion',
      });
      await linkRepo.close(closedSug.id);
      const closedRes = await authedFetch(`${baseUrl}/api/identity-queue/confirm-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkIds: [closedSug.id] }),
      });
      expect(closedRes.status).toBe(409);

      // 200 valid bulk confirmation
      const confirmRes = await authedFetch(`${baseUrl}/api/identity-queue/confirm-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkIds: [sug1.id, sug2.id] }),
      });
      expect(confirmRes.status).toBe(200);
      const confirmBody = (await confirmRes.json()) as any;
      expect(confirmBody.confirmed).toBe(2);
      expect(confirmBody.links).toHaveLength(2);
      expect(confirmBody.links.every((l: any) => l.method === 'admin_link' && l.grade === 'confirmed')).toBe(true);

      // Queue items marked linked and no longer pending
      expect((await queue.getQueueItem(q1.id))?.status).toBe('linked');
      expect((await queue.getQueueItem(q2.id))?.status).toBe('linked');
      const afterQueue = (await (await authedFetch(`${baseUrl}/api/identity-queue`)).json()) as any;
      expect(afterQueue.items.find((i: any) => i.id === q1.id || i.id === q2.id)).toBeUndefined();

      // Graph refreshed -> workflow attributed to Omar
      expect(ds.getGraph().getOwners('automation:n8n:bulk_wf_1').map((o) => o.id)).toEqual([
        'person:omar@acme.com',
      ]);

      // Audit log recorded per confirmed link
      const auditBody = (await (
        await authedFetch(`${baseUrl}/api/audit-log?action=IDENTITY_SUGGESTION_CONFIRMED`)
      ).json()) as any;
      const confirmedResources = new Set(auditBody.entries.map((e: any) => e.resource));
      for (const link of confirmBody.links) {
        expect(confirmedResources.has(`identity_link:${link.id}`)).toBe(true);
      }
      expect(auditBody.entries.length).toBeGreaterThanOrEqual(2);
    });
  });
});
