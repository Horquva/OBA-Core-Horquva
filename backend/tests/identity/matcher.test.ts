// =============================================================================
// Horquva Continuity Platform — Identity Resolution Engine Vitest Suite
// =============================================================================
// Tests SRS ID-01:
// - Email sanitization and normalization (case, whitespace, sub-aliases)
// - Exact directory matching (userPrincipalName, mail)
// - Secondary email and alias resolution
// - Immediate service account detection heuristics (svc-*, bot-*, *-automation@)
// - 95%+ resolution rate across realistic corporate identity batteries
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  IdentityMatcher,
  DirectoryPersonRecord,
  MatchCandidate,
} from '../../src/identity/matcher.js';

describe('IdentityMatcher (SRS ID-01)', () => {
  const directory: DirectoryPersonRecord[] = [
    {
      id: 'person:omar@acme.com',
      primaryEmail: 'omar.farooq@acme.com',
      displayName: 'Omar Farooq',
      aliases: ['omar@acme.com', 'o.farooq@acme.com'],
      status: 'active',
    },
    {
      id: 'person:maya@acme.com',
      primaryEmail: 'maya.lin@acme.com',
      displayName: 'Maya Lin',
      aliases: ['maya@acme.com', 'mlin@acme.com'],
      status: 'active',
    },
    {
      id: 'person:chen@acme.com',
      primaryEmail: 'chen.wei@acme.com',
      displayName: 'Chen Wei',
      aliases: ['chen@acme.com'],
      status: 'active',
    },
    {
      id: 'person:sarah@acme.com',
      primaryEmail: 'sarah.connor@acme.com',
      displayName: 'Sarah Connor',
      aliases: ['sarah@acme.com'],
      status: 'departed',
    },
  ];

  const matcher = new IdentityMatcher(directory);

  describe('1. Email Normalization & Sanitization', () => {
    it('normalizes uppercase, trailing whitespace, and plus-tag addressing', () => {
      expect(IdentityMatcher.normalizeEmail('  OMAR.FAROOQ@ACME.COM  ')).toBe('omar.farooq@acme.com');
      expect(IdentityMatcher.normalizeEmail('omar.farooq+n8n@acme.com')).toBe('omar.farooq@acme.com');
      expect(IdentityMatcher.normalizeEmail('MAYA+test-automation@ACME.com')).toBe('maya@acme.com');
    });
  });

  describe('2. Direct Exact Matching (Confidence 1.0)', () => {
    it('matches exact primary corporate directory email', () => {
      const candidate: MatchCandidate = {
        externalAccountId: 'n8n_user_1',
        source: 'n8n',
        email: 'omar.farooq@acme.com',
        displayName: 'Omar Farooq',
      };

      const result = matcher.match(candidate);
      expect(result.matched).toBe(true);
      expect(result.directoryPersonId).toBe('person:omar@acme.com');
      expect(result.confidence).toBe(1.0);
      expect(result.matchType).toBe('exact_email');
      expect(result.isServiceAccount).toBe(false);
    });

    it('matches case-insensitively with extraneous whitespace', () => {
      const candidate: MatchCandidate = {
        externalAccountId: 'google_user_maya',
        source: 'google',
        email: '  MAYA.LIN@ACME.COM  ',
      };

      const result = matcher.match(candidate);
      expect(result.matched).toBe(true);
      expect(result.directoryPersonId).toBe('person:maya@acme.com');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('3. Secondary Email and Alias Matching (Confidence 0.95)', () => {
    it('resolves short aliases and alternate corporate email addresses', () => {
      const candidate: MatchCandidate = {
        externalAccountId: 'gh_chen',
        source: 'github',
        email: 'chen@acme.com',
      };

      const result = matcher.match(candidate);
      expect(result.matched).toBe(true);
      expect(result.directoryPersonId).toBe('person:chen@acme.com');
      expect(result.confidence).toBe(0.95);
      expect(result.matchType).toBe('alias');
    });

    it('resolves username plus-tags to the alias record', () => {
      const candidate: MatchCandidate = {
        externalAccountId: 'openai_proj_omar',
        source: 'openai',
        email: 'omar+prod-billing@acme.com',
      };

      const result = matcher.match(candidate);
      expect(result.matched).toBe(true);
      expect(result.directoryPersonId).toBe('person:omar@acme.com');
      expect(result.confidence).toBe(0.95);
    });
  });

  describe('4. Automatic Service Account Detection (User Decision)', () => {
    it('classifies svc-* and bot-* accounts automatically without routing to queue', () => {
      const candidates: MatchCandidate[] = [
        { externalAccountId: 'acc_1', source: 'n8n', email: 'svc-billing@acme.com' },
        { externalAccountId: 'acc_2', source: 'n8n', email: 'bot-slack-alerter@acme.com' },
        { externalAccountId: 'acc_3', source: 'entra', email: 'service_worker@acme.com' },
        { externalAccountId: 'acc_4', source: 'google', email: 'no-reply@acme.com' },
        { externalAccountId: 'acc_5', source: 'openai', email: 'system-automation@acme.com' },
      ];

      for (const cand of candidates) {
        const result = matcher.match(cand);
        expect(result.matched).toBe(true);
        expect(result.isServiceAccount).toBe(true);
        expect(result.matchType).toBe('service_account');
        expect(result.confidence).toBe(1.0);
      }
    });
  });

  describe('5. Unmatched Human Accounts', () => {
    it('flags unresolvable accounts as unmatched (to land in review queue)', () => {
      const candidate: MatchCandidate = {
        externalAccountId: 'n8n_ext_99',
        source: 'n8n',
        email: 'contractor.freelancer@external-agency.io',
        displayName: 'External Dev',
      };

      const result = matcher.match(candidate);
      expect(result.matched).toBe(false);
      expect(result.isServiceAccount).toBe(false);
      expect(result.directoryPersonId).toBeUndefined();
      expect(result.matchType).toBe('none');
    });
  });

  describe('6. 95%+ Resolution Battery Verification', () => {
    it('successfully resolves >=95% of standard corporate email formats in bulk test', () => {
      const testBattery: MatchCandidate[] = [
        { externalAccountId: '1', source: 'n8n', email: 'omar.farooq@acme.com' },
        { externalAccountId: '2', source: 'n8n', email: 'OMAR.FAROOQ@ACME.COM' },
        { externalAccountId: '3', source: 'n8n', email: 'omar@acme.com' },
        { externalAccountId: '4', source: 'n8n', email: 'o.farooq@acme.com' },
        { externalAccountId: '5', source: 'n8n', email: 'omar.farooq+billing@acme.com' },
        { externalAccountId: '6', source: 'google', email: 'maya.lin@acme.com' },
        { externalAccountId: '7', source: 'google', email: 'MAYA.LIN@ACME.COM' },
        { externalAccountId: '8', source: 'google', email: 'maya@acme.com' },
        { externalAccountId: '9', source: 'google', email: 'mlin@acme.com' },
        { externalAccountId: '10', source: 'google', email: 'maya.lin+ops@acme.com' },
        { externalAccountId: '11', source: 'entra', email: 'chen.wei@acme.com' },
        { externalAccountId: '12', source: 'entra', email: 'chen@acme.com' },
        { externalAccountId: '13', source: 'entra', email: 'chen.wei+n8n@acme.com' },
        { externalAccountId: '14', source: 'n8n', email: 'sarah.connor@acme.com' },
        { externalAccountId: '15', source: 'n8n', email: 'sarah@acme.com' },
        { externalAccountId: '16', source: 'n8n', email: 'svc-deploy@acme.com' },
        { externalAccountId: '17', source: 'n8n', email: 'bot-reporter@acme.com' },
        { externalAccountId: '18', source: 'n8n', email: 'infra-service@acme.com' },
        { externalAccountId: '19', source: 'n8n', email: 'api-gateway@acme.com' },
        { externalAccountId: '20', source: 'n8n', email: 'data-automation@acme.com' },
      ];

      let resolvedCount = 0;
      for (const cand of testBattery) {
        const res = matcher.match(cand);
        if (res.matched) {
          resolvedCount++;
        }
      }

      const resolutionRate = resolvedCount / testBattery.length;
      expect(resolutionRate).toBeGreaterThanOrEqual(0.95);
      expect(resolutionRate).toBe(1.0); // 100% on standard corporate battery
    });
  });
});
