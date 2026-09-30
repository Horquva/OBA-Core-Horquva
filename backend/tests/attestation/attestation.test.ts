// =============================================================================
// Horquva Continuity Platform — Attestation Engine Vitest Suite
// =============================================================================

import { describe, it, expect } from 'vitest';
import { AttestationEngine, AttestationAnswersSchema } from '../../src/attestation/engine.js';

describe('Attestation Engine & Schemas', () => {
  it('generates 64-character unguessable cryptographic tokens', () => {
    const token1 = AttestationEngine.generateSecureToken();
    const token2 = AttestationEngine.generateSecureToken();

    expect(token1.length).toBe(64);
    expect(token2.length).toBe(64);
    expect(token1).not.toBe(token2);
    expect(/^[0-9a-f]{64}$/.test(token1)).toBe(true);
  });

  it('validates correct attestation answers', () => {
    const validPayload = {
      isOwner: true,
      backupPersonId: 'person:maya@acme.com',
      criticality: 'critical',
      criticalityReason: 'Handles executive payroll disbursement',
      isDocumented: true,
      documentationUrl: 'https://wiki.acme.corp/runbooks/payroll',
      fallbackExists: true,
    };

    const parsed = AttestationAnswersSchema.parse(validPayload);
    expect(parsed.isOwner).toBe(true);
    expect(parsed.backupPersonId).toBe('person:maya@acme.com');
    expect(parsed.criticality).toBe('critical');
    expect(parsed.isDocumented).toBe(true);
  });

  it('rejects invalid criticality or malformed URL', () => {
    const invalidCriticality = {
      isOwner: true,
      criticality: 'super-urgent', // Invalid enum
      isDocumented: false,
      fallbackExists: false,
    };
    expect(() => AttestationAnswersSchema.parse(invalidCriticality)).toThrow();

    const invalidUrl = {
      isOwner: true,
      criticality: 'medium',
      isDocumented: true,
      documentationUrl: 'not-a-valid-url',
      fallbackExists: false,
    };
    expect(() => AttestationAnswersSchema.parse(invalidUrl)).toThrow();
  });
});
