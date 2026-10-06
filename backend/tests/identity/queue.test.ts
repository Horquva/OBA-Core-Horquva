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
} from '../../src/identity/queue.js';
import { MatchCandidate } from '../../src/identity/matcher.js';

describe('IdentityQueueService (SRS ID-02, ID-03, SEC-06)', () => {
  let adapter: InMemoryIdentityQueueAdapter;
  let service: IdentityQueueService;

  beforeEach(() => {
    adapter = new InMemoryIdentityQueueAdapter();
    service = new IdentityQueueService(adapter);
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
      expect(resolved.linkedPersonId).toBe('person:omar@acme.com');
      expect(resolved.reviewedBy).toBe('admin:sec-officer@acme.com');
      expect(resolved.reviewedAt).toBeInstanceOf(Date);

      // Verify audit log record
      const logs = adapter.getAuditLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('identity_queue.resolve_link');
      expect(logs[0].userId).toBe('admin:sec-officer@acme.com');
      expect(logs[0].resourceId).toBe(item.id);
      expect(logs[0].details.linkedPersonId).toBe('person:omar@acme.com');
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
});
