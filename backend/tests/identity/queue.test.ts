// =============================================================================
// Horquva Continuity Platform — Identity Review Queue Vitest Suite
// =============================================================================
// Tests SRS ID-02, ID-03, and SEC-06:
// - Unmatched account routing to queue with status 'pending'
// - Resolution action 'link' (assigns external account to confirmed directory person)
// - Resolution action 'mark_service_account' (marks as programmatic service account)
// - Resolution action 'mark_departed' (confirms belonged to departed employee)
// - Resolution action 'ignore'
// - Audit log recording on all administrative resolutions
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  IdentityQueueService,
  InMemoryIdentityQueueAdapter,
  IdentityQueueConflictError,
  IdentityQueueNotFoundError,
} from '../../src/identity/queue.js';
import { InMemoryLinkRepository } from '../../src/identity/linkRepository.js';
import { ContinuityGraph } from '../../src/domain/graph/index.js';
import { MatchCandidate } from '../../src/identity/matcher.js';

describe('IdentityQueueService (SRS ID-02, ID-03, SEC-06)', () => {
  let adapter: InMemoryIdentityQueueAdapter;
  let linkRepo: InMemoryLinkRepository;
  let service: IdentityQueueService;

  beforeEach(() => {
    adapter = new InMemoryIdentityQueueAdapter();
    linkRepo = new InMemoryLinkRepository();
    service = new IdentityQueueService(adapter, linkRepo);
  });

  describe('1. Unmatched Account Routing (ID-02)', () => {
    it('enqueues unmatched account with status = pending and candidate metadata', async () => {
      const candidate: MatchCandidate = {
        externalAccountId: 'n8n_user_ext_44',
        source: 'n8n',
        email: 'freelancer.dave@contractor-agency.com',
        displayName: 'Dave Freelancer',
      };

      const item = await service.enqueueUnmatched(candidate);
      expect(item.id).toBeDefined();
      expect(item.status).toBe('pending');
      expect(item.source).toBe('n8n');
      expect(item.externalAccountId).toBe('n8n_user_ext_44');
      expect(item.emailCandidate).toBe('freelancer.dave@contractor-agency.com');
      expect(item.displayName).toBe('Dave Freelancer');

      const pending = await service.listQueue({ status: 'pending' });
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe(item.id);
    });

    it('is idempotent when the same unmatched account is enqueued multiple times', async () => {
      const candidate: MatchCandidate = {
        externalAccountId: 'openai_acc_99',
        source: 'openai',
        email: 'dev-team@external.com',
      };

      const item1 = await service.enqueueUnmatched(candidate);
      const item2 = await service.enqueueUnmatched(candidate);

      expect(item1.id).toBe(item2.id);
      const pending = await service.listQueue({ status: 'pending' });
      expect(pending.length).toBe(1);
    });
  });

  describe('2. Resolution Action: Link (ID-03)', () => {
    it('links external account to confirmed directory person and writes audit log', async () => {
      const candidate: MatchCandidate = {
        externalAccountId: 'n8n_user_12',
        source: 'n8n',
        email: 'o.farooq.personal@gmail.com',
        displayName: 'Omar F',
      };

      const item = await service.enqueueUnmatched(candidate);

      const resolved = await service.resolveLink(
        item.id,
        'person:omar@acme.com',
        'admin:sec-officer@acme.com'
      );

      expect(resolved.status).toBe('linked');
      expect(resolved.reviewedBy).toBe('admin:sec-officer@acme.com');
      expect(resolved.reviewedAt).toBeInstanceOf(Date);

      // Verify audit log record
      const logs = adapter.getAuditLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('identity_queue.resolve_link');
      expect(logs[0].userId).toBe('admin:sec-officer@acme.com');
      expect(logs[0].resourceId).toBe(item.id);
      expect(logs[0].details.personId).toBe('person:omar@acme.com');
    });
  });

  describe('3. Resolution Action: Mark Service Account (ID-03)', () => {
    it('classifies item as service account and writes audit log', async () => {
      const candidate: MatchCandidate = {
        externalAccountId: 'svc_cron_99',
        source: 'custom_script',
        email: 'cron-runner@acme.com',
      };

      const item = await service.enqueueUnmatched(candidate);

      const resolved = await service.resolveMarkServiceAccount(
        item.id,
        'admin:lead@acme.com',
        'Nightly batch billing runner'
      );

      expect(resolved.status).toBe('service_account');
      expect(resolved.notes).toBe('Nightly batch billing runner');
      expect(resolved.reviewedBy).toBe('admin:lead@acme.com');

      const logs = adapter.getAuditLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('identity_queue.mark_service_account');
    });
  });

  describe('4. Resolution Action: Mark Departed & Ignore (ID-03)', () => {
    it('marks account as departed for former employee with audit trail', async () => {
      const candidate: MatchCandidate = {
        externalAccountId: 'old_contractor_1',
        source: 'n8n',
        email: 'alex.former@acme.com',
      };

      const item = await service.enqueueUnmatched(candidate);
      const resolved = await service.resolveMarkDeparted(
        item.id,
        'admin:hr@acme.com',
        'Contract concluded Q2'
      );

      expect(resolved.status).toBe('departed');
      expect(resolved.notes).toBe('Contract concluded Q2');

      const logs = adapter.getAuditLogs();
      expect(logs.some((l) => l.action === 'identity_queue.mark_departed')).toBe(true);
    });

    it('marks account as ignored', async () => {
      const candidate: MatchCandidate = {
        externalAccountId: 'spam_account',
        source: 'n8n',
        email: 'unrelated@test.invalid',
      };

      const item = await service.enqueueUnmatched(candidate);
      const resolved = await service.resolveIgnore(item.id, 'admin:lead@acme.com');

      expect(resolved.status).toBe('ignored');
    });
  });

  describe('5. LinkRepository Integration & Transactional resolveLink', () => {
    it('defaults LinkRepository when omitted so single-arg constructor remains self-contained', async () => {
      const standalone = new IdentityQueueService(adapter);
      const item = await standalone.enqueueUnmatched({
        externalAccountId: 'account:n8n:standalone-1',
        source: 'n8n',
        email: 'standalone@acme.com',
      });
      const resolved = await standalone.resolveLink(item.id, 'person:omar@acme.com', 'user:admin');
      expect(resolved.status).toBe('linked');
    });

    it('creates confirmed admin_link, closes prior exact_email/suggested links, and avoids double-prefixing canonical IDs', async () => {
      await linkRepo.create({
        accountId: 'account:n8n:n8n_user_12',
        personId: 'person:other@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Display name similarity',
      });
      await linkRepo.create({
        accountId: 'account:n8n:n8n_user_12',
        personId: 'person:stale@acme.com',
        grade: 'stated',
        method: 'exact_email',
        linkedBy: 'autoLink',
        note: 'Old email',
      });

      const rawItem = await service.enqueueUnmatched({
        externalAccountId: 'n8n_user_12',
        source: 'n8n',
        email: 'o.farooq@gmail.com',
        displayName: 'Omar F',
      });
      await service.resolveLink(rawItem.id, 'person:omar@acme.com', 'user:admin');

      const active = await linkRepo.listActive();
      expect(active).toHaveLength(1);
      expect(active[0]).toMatchObject({
        accountId: 'account:n8n:n8n_user_12',
        personId: 'person:omar@acme.com',
        grade: 'confirmed',
        method: 'admin_link',
        linkedBy: 'user:admin',
      });
      expect(await linkRepo.listActiveSuggestions()).toHaveLength(0);

      const canonicalItem = await service.enqueueUnmatched({
        externalAccountId: 'account:openai:usr_42',
        source: 'openai',
        email: 'lina@acme.com',
      });
      await service.resolveLink(canonicalItem.id, 'person:lina@acme.com', 'user:admin');
      const allActive = await linkRepo.listActive();
      expect(allActive.find((l) => l.personId === 'person:lina@acme.com')?.accountId).toBe(
        'account:openai:usr_42'
      );
    });

    it('throws 404 for missing queue item and 409 for non-pending or conflicting active admin_link', async () => {
      await expect(
        service.resolveLink('missing-id', 'person:omar@acme.com', 'user:admin')
      ).rejects.toBeInstanceOf(IdentityQueueNotFoundError);

      const ignoredItem = await service.enqueueUnmatched({
        externalAccountId: 'account:n8n:ignored-1',
        source: 'n8n',
      });
      await service.resolveIgnore(ignoredItem.id, 'user:admin');
      await expect(
        service.resolveLink(ignoredItem.id, 'person:omar@acme.com', 'user:admin')
      ).rejects.toBeInstanceOf(IdentityQueueConflictError);

      await linkRepo.create({
        accountId: 'account:n8n:already-admin-linked',
        personId: 'person:david@acme.com',
        grade: 'confirmed',
        method: 'admin_link',
        linkedBy: 'user:admin',
        note: 'Prior admin link',
      });
      const pendingItem = await service.enqueueUnmatched({
        externalAccountId: 'account:n8n:already-admin-linked',
        source: 'n8n',
      });

      await expect(
        service.resolveLink(pendingItem.id, 'person:omar@acme.com', 'user:admin')
      ).rejects.toBeInstanceOf(IdentityQueueConflictError);

      const stillPending = await service.getQueueItem(pendingItem.id);
      expect(stillPending?.status).toBe('pending');
      const active = await linkRepo.listActive();
      expect(active[0].personId).toBe('person:david@acme.com');
    });
  });

  describe('6. listPendingWithSuggestions', () => {
    it('excludes actively linked accounts, surfaces stored suggestions with linkId, and falls back to IdentityMatcher only when no stored suggestion exists', async () => {
      const now = new Date('2026-11-01T00:00:00Z');
      const graph = ContinuityGraph.fromSnapshot(
        [
          {
            id: 'person:entra:omar',
            kind: 'person',
            name: 'Omar Farooq',
            externalRefs: { entraId: 'omar', email: 'omar@acme.com' },
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'person:entra:david',
            kind: 'person',
            name: 'David Miller',
            externalRefs: { entraId: 'david', email: 'david@acme.com' },
            createdAt: now,
            updatedAt: now,
          },
        ],
        [],
        []
      );

      // Item 1: already actively linked via exact_email -> must be filtered out
      await service.enqueueUnmatched({
        externalAccountId: 'account:n8n:active-1',
        source: 'n8n',
        email: 'omar@acme.com',
        displayName: 'Omar Active',
      });
      await linkRepo.create({
        accountId: 'account:n8n:active-1',
        personId: 'person:entra:omar',
        grade: 'stated',
        method: 'exact_email',
        linkedBy: 'autoLink',
        note: 'Exact email',
      });

      // Item 2: has two stored suggested links (should NOT fall back to matcher)
      const qStored = await service.enqueueUnmatched({
        externalAccountId: 'account:openai:stored-1',
        source: 'openai',
        email: 'david@acme.com', // would match David via matcher if fallback ran
        displayName: 'Shared User',
      });
      const sug1 = await linkRepo.create({
        accountId: 'account:openai:stored-1',
        personId: 'person:entra:omar',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Ambiguous email match (stored 1)',
      });
      const sug2 = await linkRepo.create({
        accountId: 'account:openai:stored-1',
        personId: 'person:entra:david',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Ambiguous email match (stored 2)',
      });

      // Item 3: no stored suggestion -> falls back to IdentityMatcher with linkId: null
      const qFallback = await service.enqueueUnmatched({
        externalAccountId: 'ext_fallback_1',
        source: 'n8n',
        email: 'david@gmail.com',
        displayName: 'David Fallback',
      });

      const items = await service.listPendingWithSuggestions(graph);
      expect(items.map((i) => i.id)).toEqual([qStored.id, qFallback.id]);

      const storedItem = items.find((i) => i.id === qStored.id)!;
      expect(storedItem.suggestion).toEqual({
        linkId: sug1.id,
        person: { id: 'person:entra:omar', kind: 'person', name: 'Omar Farooq' },
        reason: 'Ambiguous email match (stored 1)',
      });
      expect(storedItem.suggestions).toHaveLength(2);
      expect(storedItem.suggestions.map((s) => s.linkId)).toEqual([sug1.id, sug2.id]);

      const fallbackItem = items.find((i) => i.id === qFallback.id)!;
      expect(fallbackItem.suggestion).toMatchObject({
        linkId: null,
        person: { id: 'person:entra:david', kind: 'person', name: 'David Miller' },
      });
      expect(fallbackItem.suggestion?.reason).toMatch(/username/i);
    });
  });

  describe('7. Bulk confirmSuggestions', () => {
    it('confirms multiple suggestions, closes competing links, marks matching pending queue rows linked, and records audit log', async () => {
      const qCanonical = await service.enqueueUnmatched({
        externalAccountId: 'account:n8n:acc-1',
        source: 'n8n',
        displayName: 'Omar n8n',
      });
      const qRaw = await service.enqueueUnmatched({
        externalAccountId: 'raw_2',
        source: 'openai',
        displayName: 'Lina OpenAI',
      });

      const s1Win = await linkRepo.create({
        accountId: 'account:n8n:acc-1',
        personId: 'person:omar@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Name similarity 0.92',
      });
      const s1Lose = await linkRepo.create({
        accountId: 'account:n8n:acc-1',
        personId: 'person:other@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Competing suggestion',
      });
      // Competing exact_email on acc-2 must also be closed
      await linkRepo.create({
        accountId: 'account:openai:raw_2',
        personId: 'person:stale@acme.com',
        grade: 'stated',
        method: 'exact_email',
        linkedBy: 'autoLink',
        note: 'Stale exact email',
      });
      const s2Win = await linkRepo.create({
        accountId: 'account:openai:raw_2',
        personId: 'person:lina@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Name similarity 0.90',
      });
      // Suggestion without any queue row should still succeed
      const s3Win = await linkRepo.create({
        accountId: 'account:anthropic:acc-3',
        personId: 'person:david@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Name similarity 0.88',
      });

      const confirmed = await service.confirmSuggestions(
        [s1Win.id, s2Win.id, s3Win.id],
        'user:admin'
      );

      expect(confirmed).toHaveLength(3);
      expect(confirmed.every((l) => l.grade === 'confirmed' && l.method === 'admin_link')).toBe(true);
      expect(confirmed.map((l) => l.personId)).toEqual([
        'person:omar@acme.com',
        'person:lina@acme.com',
        'person:david@acme.com',
      ]);

      expect(await linkRepo.listActiveSuggestions()).toHaveLength(0);
      const closedCompeting = await linkRepo.findByIds([s1Lose.id]);
      expect(closedCompeting[0].validTo).not.toBeNull();

      const active = await linkRepo.listActive();
      expect(active).toHaveLength(3);

      expect((await service.getQueueItem(qCanonical.id))?.status).toBe('linked');
      expect((await service.getQueueItem(qRaw.id))?.status).toBe('linked');
      expect((await service.getQueueItem(qCanonical.id))?.reviewedBy).toBe('user:admin');

      const logs = adapter.getAuditLogs();
      expect(logs.some((l) => l.action === 'identity_queue.confirm_suggestions')).toBe(true);
    });

    it('rejects 404 on missing linkId and 409 on closed, non-suggested, duplicate account, or existing admin_link without partial writes', async () => {
      const q1 = await service.enqueueUnmatched({
        externalAccountId: 'account:n8n:acc-valid',
        source: 'n8n',
      });
      const validSug = await linkRepo.create({
        accountId: 'account:n8n:acc-valid',
        personId: 'person:omar@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Valid suggestion',
      });
      const sameAccountSug = await linkRepo.create({
        accountId: 'account:n8n:acc-valid',
        personId: 'person:david@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Second suggestion for same account',
      });
      const closedSug = await linkRepo.create({
        accountId: 'account:n8n:acc-closed',
        personId: 'person:lina@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Closed suggestion',
      });
      await linkRepo.close(closedSug.id);

      const exactEmailLink = await linkRepo.create({
        accountId: 'account:n8n:acc-exact',
        personId: 'person:lina@acme.com',
        grade: 'stated',
        method: 'exact_email',
        linkedBy: 'autoLink',
        note: 'Not suggested',
      });

      await linkRepo.create({
        accountId: 'account:n8n:acc-admin',
        personId: 'person:david@acme.com',
        grade: 'confirmed',
        method: 'admin_link',
        linkedBy: 'user:admin',
        note: 'Existing admin link',
      });
      const sugWithExistingAdmin = await linkRepo.create({
        accountId: 'account:n8n:acc-admin',
        personId: 'person:omar@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Suggestion on admin-linked account',
      });

      // Missing linkId -> 404
      await expect(
        service.confirmSuggestions([validSug.id, '00000000-0000-0000-0000-000000000000'], 'user:admin')
      ).rejects.toBeInstanceOf(IdentityQueueNotFoundError);

      // Closed -> 409
      await expect(
        service.confirmSuggestions([validSug.id, closedSug.id], 'user:admin')
      ).rejects.toBeInstanceOf(IdentityQueueConflictError);

      // Non-suggested -> 409
      await expect(
        service.confirmSuggestions([validSug.id, exactEmailLink.id], 'user:admin')
      ).rejects.toBeInstanceOf(IdentityQueueConflictError);

      // Duplicate accountId in batch -> 409
      await expect(
        service.confirmSuggestions([validSug.id, sameAccountSug.id], 'user:admin')
      ).rejects.toBeInstanceOf(IdentityQueueConflictError);

      // Duplicate linkId in batch -> 409
      await expect(
        service.confirmSuggestions([validSug.id, validSug.id], 'user:admin')
      ).rejects.toBeInstanceOf(IdentityQueueConflictError);

      // Existing admin_link on target account -> 409
      await expect(
        service.confirmSuggestions([validSug.id, sugWithExistingAdmin.id], 'user:admin')
      ).rejects.toBeInstanceOf(IdentityQueueConflictError);

      // Verify atomic rollback: validSug is still open and q1 is still pending
      expect((await service.getQueueItem(q1.id))?.status).toBe('pending');
      expect((await linkRepo.listActiveSuggestions()).some((s) => s.id === validSug.id)).toBe(true);
    });
  });
});
