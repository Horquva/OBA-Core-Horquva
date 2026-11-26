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
  IdentityQueueError,
  InMemoryIdentityQueueAdapter,
  PostgresIdentityQueueAdapter,
  IdentityQueueConflictError,
  IdentityQueueNotFoundError,
} from '../../src/identity/queue.js';
import { InMemoryLinkRepository, PostgresLinkRepository, type LinkRepository } from '../../src/identity/linkRepository.js';
import type { Query } from '../../src/repositories/graphRepository.js';
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

  describe('8. Concurrency Hardening, Error Mapping, & Non-Link Suggestion Cleanup', () => {
    function makePgStubQuery(opts: { insertErrorCode?: '23505' | '23503' }): Query {
      const queueId = '11111111-1111-4111-8111-111111111111';
      const sugId = '22222222-2222-4222-8222-222222222222';
      const nowIso = new Date('2026-11-26T00:00:00Z').toISOString();

      return (async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();
        if (
          normalized.startsWith('SAVEPOINT ') ||
          normalized.startsWith('RELEASE SAVEPOINT ') ||
          normalized.startsWith('ROLLBACK TO SAVEPOINT ')
        ) {
          return { rows: [], rowCount: 0 };
        }
        if (normalized.includes('FROM IDENTITY_QUEUE') && normalized.includes('WHERE ID = $1')) {
          return {
            rows: [
              {
                id: queueId,
                external_account_id: 'ext_pg_1',
                source: 'n8n',
                display_name: 'PG Race Account',
                email_candidate: 'race@acme.com',
                status: 'pending',
                notes: null,
                reviewed_by: null,
                reviewed_at: null,
                created_at: nowIso,
              },
            ],
            rowCount: 1,
          };
        }
        if (normalized.includes('FROM IDENTITY_LINK') && normalized.includes('WHERE ID = ANY($1::UUID[])')) {
          return {
            rows: [
              {
                id: sugId,
                account_id: 'account:n8n:ext_pg_1',
                person_id: 'person:omar@acme.com',
                grade: 'inferred',
                method: 'suggested',
                linked_by: 'autoLink',
                note: 'Suggested match',
                valid_from: nowIso,
                valid_to: null,
              },
            ],
            rowCount: 1,
          };
        }
        if (normalized.includes('FROM IDENTITY_LINK') && normalized.includes('ACCOUNT_ID = ANY($1::TEXT[])')) {
          return { rows: [], rowCount: 0 };
        }
        if (normalized.startsWith('UPDATE IDENTITY_LINK')) {
          return { rows: [], rowCount: 1 };
        }
        if (normalized.startsWith('INSERT INTO IDENTITY_LINK')) {
          if (opts.insertErrorCode === '23505') {
            throw Object.assign(
              new Error('duplicate key value violates unique constraint "uq_identity_link_active_account"'),
              {
                code: '23505',
                constraint: 'uq_identity_link_active_account',
                detail: 'Key (account_id)=(account:n8n:ext_pg_1) already exists.',
              }
            );
          }
          if (opts.insertErrorCode === '23503') {
            throw Object.assign(
              new Error('insert or update on table "identity_link" violates foreign key constraint "identity_link_person_id_fkey"'),
              {
                code: '23503',
                constraint: 'identity_link_person_id_fkey',
                detail: 'Key (person_id)=(person:missing@acme.com) is not present in table "entity".',
              }
            );
          }
        }
        return { rows: [], rowCount: 0 };
      }) as Query;
    }

    it('maps Postgres 23505 during resolveLink and confirmSuggestions to IdentityQueueConflictError (409) without leaking PG details', async () => {
      const stubQuery = makePgStubQuery({ insertErrorCode: '23505' });
      const pgQueue = new IdentityQueueService(
        new PostgresIdentityQueueAdapter(stubQuery),
        new PostgresLinkRepository(stubQuery, true)
      );

      let resolveErr: unknown;
      try {
        await pgQueue.resolveLink(
          '11111111-1111-4111-8111-111111111111',
          'person:omar@acme.com',
          'user:admin'
        );
      } catch (e) {
        resolveErr = e;
      }
      expect(resolveErr).toBeInstanceOf(IdentityQueueConflictError);
      expect((resolveErr as IdentityQueueError).status).toBe(409);
      expect((resolveErr as Error).message).not.toMatch(/uq_identity_link_active_account|Key \(account_id\)/i);

      let confirmErr: unknown;
      try {
        await pgQueue.confirmSuggestions(['22222222-2222-4222-8222-222222222222'], 'user:admin');
      } catch (e) {
        confirmErr = e;
      }
      expect(confirmErr).toBeInstanceOf(IdentityQueueConflictError);
      expect((confirmErr as IdentityQueueError).status).toBe(409);
      expect((confirmErr as Error).message).not.toMatch(/uq_identity_link_active_account|Key \(account_id\)/i);
    });

    it('maps Postgres 23503 during resolveLink and confirmSuggestions to IdentityQueueError (400) without leaking FK/table details', async () => {
      const stubQuery = makePgStubQuery({ insertErrorCode: '23503' });
      const pgQueue = new IdentityQueueService(
        new PostgresIdentityQueueAdapter(stubQuery),
        new PostgresLinkRepository(stubQuery, true)
      );

      let resolveErr: unknown;
      try {
        await pgQueue.resolveLink(
          '11111111-1111-4111-8111-111111111111',
          'person:missing@acme.com',
          'user:admin'
        );
      } catch (e) {
        resolveErr = e;
      }
      expect(resolveErr).toBeInstanceOf(IdentityQueueError);
      expect((resolveErr as IdentityQueueError).status).toBe(400);
      expect((resolveErr as Error).message).not.toMatch(/identity_link_person_id_fkey|Key \(person_id\)|table "entity"/i);

      let confirmErr: unknown;
      try {
        await pgQueue.confirmSuggestions(['22222222-2222-4222-8222-222222222222'], 'user:admin');
      } catch (e) {
        confirmErr = e;
      }
      expect(confirmErr).toBeInstanceOf(IdentityQueueError);
      expect((confirmErr as IdentityQueueError).status).toBe(400);
      expect((confirmErr as Error).message).not.toMatch(/identity_link_person_id_fkey|Key \(person_id\)|table "entity"/i);
    });

    it('sorts accountIds deterministically in confirmSuggestions even when linkIds are supplied out of order', async () => {
      const sugZ = await linkRepo.create({
        accountId: 'account:n8n:z-last',
        personId: 'person:omar@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Z',
      });
      const sugA = await linkRepo.create({
        accountId: 'account:n8n:a-first',
        personId: 'person:david@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'A',
      });
      const sugM = await linkRepo.create({
        accountId: 'account:n8n:m-mid',
        personId: 'person:lina@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'M',
      });

      const recordedCalls: { method: string; accountIds: string[] }[] = [];
      const origRunInTx = linkRepo.runInTransaction.bind(linkRepo);
      const spyRepo: LinkRepository = {
        listActive: () => linkRepo.listActive(),
        listActiveSuggestions: () => linkRepo.listActiveSuggestions(),
        listAllOpen: () => linkRepo.listAllOpen(),
        findByIds: (ids) => linkRepo.findByIds(ids),
        findActiveByAccounts: (ids) => linkRepo.findActiveByAccounts(ids),
        lockAccounts: (ids) => linkRepo.lockAccounts(ids),
        create: (l) => linkRepo.create(l),
        createMany: (ls) => linkRepo.createMany(ls),
        close: (id) => linkRepo.close(id),
        closeActiveByAccount: (id, m) => linkRepo.closeActiveByAccount(id, m),
        closeActiveByAccounts: (ids, m) => linkRepo.closeActiveByAccounts(ids, m),
        runInTransaction: (fn) =>
          origRunInTx(async (tx) => {
            const wrappedTx: LinkRepository = {
              ...tx,
              lockAccounts: (ids) => {
                recordedCalls.push({ method: 'lockAccounts', accountIds: [...ids] });
                return tx.lockAccounts(ids);
              },
              findByIds: (ids) => {
                recordedCalls.push({ method: 'findByIds', accountIds: [...ids] });
                return tx.findByIds(ids);
              },
              findActiveByAccounts: (ids) => {
                recordedCalls.push({ method: 'findActiveByAccounts', accountIds: [...ids] });
                return tx.findActiveByAccounts(ids);
              },
              closeActiveByAccounts: (ids, m) => {
                recordedCalls.push({ method: 'closeActiveByAccounts', accountIds: [...ids] });
                return tx.closeActiveByAccounts(ids, m);
              },
              createMany: (ls) => {
                recordedCalls.push({
                  method: 'createMany',
                  accountIds: ls.map((l) => l.accountId),
                });
                return tx.createMany(ls);
              },
            };
            return fn(wrappedTx);
          }),
      };

      const origMarkLinked = adapter.markLinkedByAccounts.bind(adapter);
      adapter.markLinkedByAccounts = async (ids, reviewedBy, reviewedAt) => {
        recordedCalls.push({ method: 'markLinkedByAccounts', accountIds: [...ids] });
        return origMarkLinked(ids, reviewedBy, reviewedAt);
      };

      const spyService = new IdentityQueueService(adapter, spyRepo);
      const confirmed = await spyService.confirmSuggestions([sugZ.id, sugA.id, sugM.id], 'user:admin');

      const expectedSorted = [
        'account:n8n:a-first',
        'account:n8n:m-mid',
        'account:n8n:z-last',
      ];
      expect(recordedCalls).toEqual([
        { method: 'findByIds', accountIds: [sugZ.id, sugA.id, sugM.id] },
        { method: 'lockAccounts', accountIds: expectedSorted },
        { method: 'findByIds', accountIds: [sugZ.id, sugA.id, sugM.id] },
        { method: 'findActiveByAccounts', accountIds: expectedSorted },
        { method: 'closeActiveByAccounts', accountIds: expectedSorted },
        { method: 'createMany', accountIds: expectedSorted },
        { method: 'markLinkedByAccounts', accountIds: expectedSorted },
      ]);
      // Caller order is still preserved in return value
      expect(confirmed.map((l) => l.accountId)).toEqual([
        'account:n8n:z-last',
        'account:n8n:a-first',
        'account:n8n:m-mid',
      ]);
    });

    it('closes open suggested links on resolveMarkServiceAccount, resolveMarkDeparted, and resolveIgnore so stale suggestions cannot later be confirmed', async () => {
      const qSvc = await service.enqueueUnmatched({
        externalAccountId: 'raw_svc_1',
        source: 'n8n',
        displayName: 'Cron Runner',
      });
      const sugSvc = await linkRepo.create({
        accountId: 'account:n8n:raw_svc_1',
        personId: 'person:omar@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Stale svc suggestion',
      });

      const qDep = await service.enqueueUnmatched({
        externalAccountId: 'account:openai:dep_1',
        source: 'openai',
        displayName: 'Former Contractor',
      });
      const sugDep = await linkRepo.create({
        accountId: 'account:openai:dep_1',
        personId: 'person:david@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Stale departed suggestion',
      });

      const qIgn = await service.enqueueUnmatched({
        externalAccountId: 'ign_1',
        source: 'n8n',
        displayName: 'Test Account',
      });
      const sugIgn = await linkRepo.create({
        accountId: 'account:n8n:ign_1',
        personId: 'person:lina@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Stale ignore suggestion',
      });

      await service.resolveMarkServiceAccount(qSvc.id, 'user:admin', 'Programmatic bot');
      await service.resolveMarkDeparted(qDep.id, 'user:admin', 'Left company');
      await service.resolveIgnore(qIgn.id, 'user:admin', 'External vendor');

      expect(await linkRepo.listActiveSuggestions()).toHaveLength(0);

      for (const staleSug of [sugSvc, sugDep, sugIgn]) {
        await expect(
          service.confirmSuggestions([staleSug.id], 'user:admin')
        ).rejects.toBeInstanceOf(IdentityQueueConflictError);
      }
    });

    it('PostgresLinkRepository never emits FOR UPDATE in findByIds/findActiveByAccounts/closeActiveByAccounts and acquires sorted pg_advisory_xact_lock via lockAccounts', async () => {
      const sqlLog: { sql: string; params: unknown[] }[] = [];
      const stubQuery: Query = (async (sql: string, params: unknown[] = []) => {
        sqlLog.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
        return { rows: [], rowCount: 0 } as any;
      }) as Query;

      const pgNonTx = new PostgresLinkRepository(stubQuery, false);
      await pgNonTx.lockAccounts(['account:n8n:z', 'account:n8n:a']);
      expect(sqlLog).toHaveLength(0);

      const pgTx = new PostgresLinkRepository(stubQuery, true);
      await pgTx.lockAccounts([]);
      expect(sqlLog).toHaveLength(0);

      await pgTx.lockAccounts(['account:n8n:z', 'account:n8n:a', 'account:n8n:z']);
      expect(sqlLog).toHaveLength(1);
      expect(sqlLog[0].sql).toMatch(/pg_advisory_xact_lock\(hashtextextended\('identity_link:' \|\| a, 0\)\)/i);
      expect(sqlLog[0].sql).toMatch(/FROM unnest\(\$1::text\[\]\) WITH ORDINALITY AS u\(a, ord\)\s+ORDER BY ord/i);
      expect(sqlLog[0].params).toEqual([['account:n8n:a', 'account:n8n:z']]);

      await pgTx.findByIds(['22222222-2222-4222-8222-222222222222']);
      await pgTx.findActiveByAccounts(['account:n8n:a']);
      await pgTx.closeActiveByAccounts(['account:n8n:a'], ['suggested']);
      await pgTx.closeActiveByAccounts(['account:n8n:a']);

      for (const entry of sqlLog.slice(1)) {
        expect(entry.sql.toUpperCase()).not.toContain('FOR UPDATE');
      }
    });

    it('confirmSuggestions executes sorted pg_advisory_xact_lock before re-reading and rejects 409 without mutating if a suggestion closes concurrently before lock acquisition', async () => {
      const sugId = '33333333-3333-4333-8333-333333333333';
      const nowIso = new Date('2026-11-26T00:00:00Z').toISOString();
      const queriesExecuted: string[] = [];
      let lockAcquired = false;

      const raceQuery: Query = (async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();
        queriesExecuted.push(normalized);
        const upper = normalized.toUpperCase();

        if (upper.includes('PG_ADVISORY_XACT_LOCK')) {
          lockAcquired = true;
          return { rows: [], rowCount: 0 } as any;
        }
        if (upper.includes('FROM IDENTITY_LINK') && upper.includes('WHERE ID = ANY($1::UUID[])')) {
          // Before lock: open suggested link; After lock: concurrently closed!
          return {
            rows: [
              {
                id: sugId,
                account_id: 'account:n8n:race_1',
                person_id: 'person:omar@acme.com',
                grade: 'inferred',
                method: 'suggested',
                linked_by: 'autoLink',
                note: 'Suggested match',
                valid_from: nowIso,
                valid_to: lockAcquired ? nowIso : null,
              },
            ],
            rowCount: 1,
          } as any;
        }
        return { rows: [], rowCount: 0 } as any;
      }) as Query;

      const pgQueue = new IdentityQueueService(
        new PostgresIdentityQueueAdapter(raceQuery),
        new PostgresLinkRepository(raceQuery, true)
      );

      await expect(pgQueue.confirmSuggestions([sugId], 'user:admin')).rejects.toBeInstanceOf(
        IdentityQueueConflictError
      );

      const lockIdx = queriesExecuted.findIndex((s) =>
        s.toLowerCase().includes('pg_advisory_xact_lock')
      );
      expect(lockIdx).toBeGreaterThan(-1);
      const findByIdsIndices = queriesExecuted
        .map((s, idx) => (s.toUpperCase().includes('WHERE ID = ANY($1::UUID[])') ? idx : -1))
        .filter((idx) => idx !== -1);
      expect(findByIdsIndices.length).toBe(2);
      expect(findByIdsIndices[0]).toBeLessThan(lockIdx);
      expect(findByIdsIndices[1]).toBeGreaterThan(lockIdx);

      // Must NOT mutate identity_link or identity_queue after post-lock 409
      expect(queriesExecuted.some((s) => s.toUpperCase().startsWith('UPDATE IDENTITY_LINK'))).toBe(false);
      expect(queriesExecuted.some((s) => s.toUpperCase().startsWith('INSERT INTO IDENTITY_LINK'))).toBe(false);
      expect(queriesExecuted.some((s) => s.toUpperCase().startsWith('UPDATE IDENTITY_QUEUE'))).toBe(false);
    });

    it('resolveLink and resolveNonLink acquire lockAccounts([accountId]) before reading/mutating links or locking queue row', async () => {
      const qLink = await service.enqueueUnmatched({
        externalAccountId: 'raw_lock_link',
        source: 'n8n',
        displayName: 'Lock Link',
      });
      const qNonLink = await service.enqueueUnmatched({
        externalAccountId: 'raw_lock_nonlink',
        source: 'openai',
        displayName: 'Lock NonLink',
      });

      const events: string[] = [];
      const origRunInTx = linkRepo.runInTransaction.bind(linkRepo);
      const spyRepo: LinkRepository = {
        listActive: () => linkRepo.listActive(),
        listActiveSuggestions: () => linkRepo.listActiveSuggestions(),
        listAllOpen: () => linkRepo.listAllOpen(),
        findByIds: (ids) => linkRepo.findByIds(ids),
        findActiveByAccounts: (ids) => linkRepo.findActiveByAccounts(ids),
        lockAccounts: (ids) => linkRepo.lockAccounts(ids),
        create: (l) => linkRepo.create(l),
        createMany: (ls) => linkRepo.createMany(ls),
        close: (id) => linkRepo.close(id),
        closeActiveByAccount: (id, m) => linkRepo.closeActiveByAccount(id, m),
        closeActiveByAccounts: (ids, m) => linkRepo.closeActiveByAccounts(ids, m),
        runInTransaction: (fn) =>
          origRunInTx(async (tx) => {
            const wrappedTx: LinkRepository = {
              ...tx,
              lockAccounts: (ids) => {
                events.push(`lockAccounts:${ids.join(',')}`);
                return tx.lockAccounts(ids);
              },
              findActiveByAccounts: (ids) => {
                events.push(`findActiveByAccounts:${ids.join(',')}`);
                return tx.findActiveByAccounts(ids);
              },
              closeActiveByAccount: (id, m) => {
                events.push(`closeActiveByAccount:${id}`);
                return tx.closeActiveByAccount(id, m);
              },
              create: (l) => {
                events.push(`create:${l.accountId}`);
                return tx.create(l);
              },
            };
            return fn(wrappedTx);
          }),
      };

      const origFindByIdForUpdate = adapter.findByIdForUpdate.bind(adapter);
      adapter.findByIdForUpdate = async (id) => {
        events.push(`findByIdForUpdate:${id}`);
        return origFindByIdForUpdate(id);
      };

      const spyService = new IdentityQueueService(adapter, spyRepo);
      await spyService.resolveLink(qLink.id, 'person:omar@acme.com', 'user:admin');
      expect(events).toEqual([
        'lockAccounts:account:n8n:raw_lock_link',
        'findActiveByAccounts:account:n8n:raw_lock_link',
        'closeActiveByAccount:account:n8n:raw_lock_link',
        'create:account:n8n:raw_lock_link',
        `findByIdForUpdate:${qLink.id}`,
      ]);

      events.length = 0;
      await spyService.resolveMarkServiceAccount(qNonLink.id, 'user:admin', 'Svc');
      expect(events).toEqual([
        'lockAccounts:account:openai:raw_lock_nonlink',
        'closeActiveByAccount:account:openai:raw_lock_nonlink',
        `findByIdForUpdate:${qNonLink.id}`,
      ]);
    });
  });
});
