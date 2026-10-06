// =============================================================================
// Horquva Continuity Platform — SCD2 Fact Store Vitest Suite
// =============================================================================
// Strictly tests DATA-02, DATA-03, DATA-04, and DATA-05:
// - Temporal SCD2 versioning with valid_from / valid_to
// - Evidence grade precedence (confirmed > stated >= inferred > unknown)
// - Unknown semantics (unknown is distinct from false/none)
// - Source drift detection when stated updates conflict with confirmed facts
// - In-memory and SQL-compatible repository adapters
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FactStore,
  InMemoryFactStoreAdapter,
  FactInput,
} from '../../src/domain/facts/factStore.js';
import { CanonicalFact } from '@horquva/types';

describe('FactStore (SCD Type 2)', () => {
  let adapter: InMemoryFactStoreAdapter;
  let factStore: FactStore;

  beforeEach(() => {
    adapter = new InMemoryFactStoreAdapter();
    factStore = new FactStore(adapter);
  });

  describe('1. Fact Insertion & SCD2 Temporal Lifecycle (DATA-02, DATA-05)', () => {
    it('creates initial active fact with validFrom and null validTo', async () => {
      const input: FactInput = {
        entityId: 'automation:n8n:201',
        attribute: 'criticality',
        value: 'critical',
        grade: 'stated',
        source: 'n8n',
        sourceRef: 'workflow:201',
      };

      const result = await factStore.insertFact(input);
      expect(result.action).toBe('created');
      expect(result.fact.entityId).toBe('automation:n8n:201');
      expect(result.fact.attribute).toBe('criticality');
      expect(result.fact.value).toBe('critical');
      expect(result.fact.grade).toBe('stated');
      expect(result.fact.validTo).toBeNull();
      expect(result.fact.validFrom).toBeInstanceOf(Date);

      const active = await factStore.getActiveFact('automation:n8n:201', 'criticality');
      expect(active).not.toBeNull();
      expect(active?.id).toBe(result.fact.id);
    });

    it('creates a new version and closes prior version when value changes with same or higher grade', async () => {
      const t1 = new Date('2026-10-01T10:00:00Z');
      const t2 = new Date('2026-10-02T10:00:00Z');

      await factStore.insertFact({
        entityId: 'automation:n8n:201',
        attribute: 'run_volume_weekly',
        value: 500,
        grade: 'stated',
        source: 'n8n',
        validFrom: t1,
      });

      const res2 = await factStore.insertFact({
        entityId: 'automation:n8n:201',
        attribute: 'run_volume_weekly',
        value: 1200,
        grade: 'stated',
        source: 'n8n',
        validFrom: t2,
      });

      expect(res2.action).toBe('versioned');
      expect(res2.fact.value).toBe(1200);
      expect(res2.fact.validTo).toBeNull();

      // Check temporal history
      const history = await factStore.getFactHistory('automation:n8n:201', 'run_volume_weekly');
      expect(history.length).toBe(2);
      expect(history[0].value).toBe(500);
      expect(history[0].validTo).toEqual(t2);
      expect(history[1].value).toBe(1200);
      expect(history[1].validTo).toBeNull();
    });

    it('is idempotent when identical value and grade arrive', async () => {
      const input: FactInput = {
        entityId: 'automation:n8n:201',
        attribute: 'criticality',
        value: 'high',
        grade: 'stated',
        source: 'n8n',
      };

      const res1 = await factStore.insertFact(input);
      expect(res1.action).toBe('created');

      const res2 = await factStore.insertFact(input);
      expect(res2.action).toBe('retained');

      const history = await factStore.getFactHistory('automation:n8n:201', 'criticality');
      expect(history.length).toBe(1);
    });
  });

  describe('2. Grade Precedence Hierarchy & Overrides (DATA-04)', () => {
    it('allows confirmed grade to override stated and inferred facts', async () => {
      // 1. Inferred fact initially
      await factStore.insertFact({
        entityId: 'automation:n8n:201',
        attribute: 'documented',
        value: false,
        grade: 'inferred',
        source: 'heuristic',
      });

      // 2. Stated fact updates it
      const resStated = await factStore.insertFact({
        entityId: 'automation:n8n:201',
        attribute: 'documented',
        value: false,
        grade: 'stated',
        source: 'n8n',
      });
      expect(resStated.action).toBe('versioned');

      // 3. Human confirms true
      const resConfirmed = await factStore.insertFact({
        entityId: 'automation:n8n:201',
        attribute: 'documented',
        value: true,
        grade: 'confirmed',
        source: 'attestation',
        attestedBy: 'person:omar@acme.com',
      });
      expect(resConfirmed.action).toBe('versioned');
      expect(resConfirmed.fact.grade).toBe('confirmed');
      expect(resConfirmed.fact.value).toBe(true);

      const active = await factStore.getActiveFact('automation:n8n:201', 'documented');
      expect(active?.grade).toBe('confirmed');
      expect(active?.value).toBe(true);
    });

    it('does NOT overwrite confirmed fact when incoming fact has lower grade and conflicting value (Source Drift Detection)', async () => {
      // Human confirmed criticality is 'critical'
      await factStore.insertFact({
        entityId: 'automation:n8n:201',
        attribute: 'criticality',
        value: 'critical',
        grade: 'confirmed',
        source: 'attestation',
        attestedBy: 'person:omar@acme.com',
      });

      // Connector sync brings stated 'low'
      const driftResult = await factStore.insertFact({
        entityId: 'automation:n8n:201',
        attribute: 'criticality',
        value: 'low',
        grade: 'stated',
        source: 'n8n',
      });

      expect(driftResult.action).toBe('drift_detected');
      expect(driftResult.fact.grade).toBe('confirmed');
      expect(driftResult.fact.value).toBe('critical');

      // Active fact remains confirmed
      const active = await factStore.getActiveFact('automation:n8n:201', 'criticality');
      expect(active?.grade).toBe('confirmed');
      expect(active?.value).toBe('critical');

      // Drift is flagged
      expect(factStore.hasSourceDrift('automation:n8n:201', 'criticality')).toBe(true);
    });
  });

  describe('3. Explicit Unknown Semantics (DATA-03)', () => {
    it('strictly differentiates unknown from false or none', () => {
      const unknownFact: CanonicalFact = {
        entityId: 'automation:n8n:201',
        attribute: 'fallback_exists',
        value: 'unknown',
        grade: 'unknown',
        source: 'system',
        validFrom: new Date(),
        validTo: null,
      };

      const falseFact: CanonicalFact = {
        entityId: 'automation:n8n:201',
        attribute: 'fallback_exists',
        value: false,
        grade: 'stated',
        source: 'n8n',
        validFrom: new Date(),
        validTo: null,
      };

      const trueFact: CanonicalFact = {
        entityId: 'automation:n8n:201',
        attribute: 'fallback_exists',
        value: true,
        grade: 'confirmed',
        source: 'attestation',
        validFrom: new Date(),
        validTo: null,
      };

      // DATA-03: Unknown must never be computed as false/no
      expect(FactStore.isKnown(unknownFact)).toBe(false);
      expect(FactStore.isKnown(falseFact)).toBe(true);
      expect(FactStore.isKnown(trueFact)).toBe(true);

      expect(FactStore.isTrue(unknownFact)).toBe(false);
      expect(FactStore.isTrue(falseFact)).toBe(false);
      expect(FactStore.isTrue(trueFact)).toBe(true);

      // Explicit False test
      expect(FactStore.isExplicitFalse(unknownFact)).toBe(false);
      expect(FactStore.isExplicitFalse(falseFact)).toBe(true);
      expect(FactStore.isExplicitFalse(trueFact)).toBe(false);
    });

    it('stores explicit unknown when missing attributes are recorded', async () => {
      const result = await factStore.insertFact({
        entityId: 'automation:n8n:201',
        attribute: 'fallback_exists',
        value: 'unknown',
        grade: 'unknown',
        source: 'system',
      });

      expect(result.action).toBe('created');
      expect(result.fact.grade).toBe('unknown');
      expect(result.fact.value).toBe('unknown');

      const active = await factStore.getActiveFact('automation:n8n:201', 'fallback_exists');
      expect(FactStore.isKnown(active)).toBe(false);
    });
  });

  describe('4. Batch Operations & Entity Snapshot Retrieval', () => {
    it('retrieves active facts map for an entity', async () => {
      await factStore.insertBatch([
        {
          entityId: 'automation:n8n:101',
          attribute: 'criticality',
          value: 'critical',
          grade: 'confirmed',
          source: 'attestation',
        },
        {
          entityId: 'automation:n8n:101',
          attribute: 'run_volume_weekly',
          value: 500,
          grade: 'stated',
          source: 'n8n',
        },
        {
          entityId: 'automation:n8n:101',
          attribute: 'documented',
          value: true,
          grade: 'confirmed',
          source: 'attestation',
        },
      ]);

      const factsMap = await factStore.getActiveFactsForEntity('automation:n8n:101');
      expect(factsMap.size).toBe(3);
      expect(factsMap.get('criticality')?.value).toBe('critical');
      expect(factsMap.get('run_volume_weekly')?.value).toBe(500);
      expect(factsMap.get('documented')?.value).toBe(true);
    });
  });
});
