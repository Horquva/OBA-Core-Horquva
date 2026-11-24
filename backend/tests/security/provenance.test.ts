import { describe, it, expect } from 'vitest';
import { isEntityBacked, findUnbackedEntities, ALL_REF_KEYS } from '../../src/security/provenance.js';
import type { Query } from '../../src/repositories/graphRepository.js';

describe('Task 1.7: T7 Provenance Guard', () => {
  describe('isEntityBacked (pure evaluation)', () => {
    const emptyContext = {
      rawPayloadExternalIds: new Set<string>(),
      attestationEntityIds: new Set<string>(),
      manualEntityIds: new Set<string>(),
    };

    it('returns false for an entity with no backing', () => {
      const entity = { id: 'person:nobody@example.com', externalRefs: {} };
      expect(isEntityBacked(entity, emptyContext)).toBe(false);
    });

    it('returns false when externalRefs contains non-whitelisted keys', () => {
      const entity = { id: 'person:fake@example.com', externalRefs: { fakeRef: 'xyz' } };
      const ctx = {
        ...emptyContext,
        rawPayloadExternalIds: new Set(['xyz']),
      };
      expect(isEntityBacked(entity, ctx)).toBe(false);
    });

    it('returns true when externalRefs matches a raw_payload external_id via whitelisted REF_KEYS', () => {
      const entity = { id: 'automation:workflow_1', externalRefs: { n8n: '42' } };
      const ctx = {
        ...emptyContext,
        rawPayloadExternalIds: new Set(['42']),
      };
      expect(isEntityBacked(entity, ctx)).toBe(true);
    });

    it('returns true when entity id matches a raw_payload external_id', () => {
      const entity = { id: 'ext-uuid-1234', externalRefs: {} };
      const ctx = {
        ...emptyContext,
        rawPayloadExternalIds: new Set(['ext-uuid-1234']),
      };
      expect(isEntityBacked(entity, ctx)).toBe(true);
    });

    it('returns true when entity is present in an active attestation task', () => {
      const entity = { id: 'app:legacy_portal', externalRefs: {} };
      const ctx = {
        ...emptyContext,
        attestationEntityIds: new Set(['app:legacy_portal']),
      };
      expect(isEntityBacked(entity, ctx)).toBe(true);
    });

    it('returns true when entity has a MANUAL_ENTITY_CREATED audit entry', () => {
      const entity = { id: 'vendor:custom_contractor', externalRefs: {} };
      const ctx = {
        ...emptyContext,
        manualEntityIds: new Set(['vendor:custom_contractor']),
      };
      expect(isEntityBacked(entity, ctx)).toBe(true);
    });
  });

  describe('findUnbackedEntities (query mapping)', () => {
    it('executes parameterized query with ALL_REF_KEYS and maps unbacked rows', async () => {
      let passedSql = '';
      let passedParams: any[] = [];

      const mockQuery: Query = (async (sql: string, params?: any[]) => {
        passedSql = sql;
        passedParams = params ?? [];
        return {
          rows: [
            { id: 'person:ghost', kind: 'person', name: 'Ghost Employee' },
            { id: 'automation:fake', kind: 'automation', name: 'Phantom Bot' },
          ],
          rowCount: 2,
        };
      }) as unknown as Query;

      const unbacked = await findUnbackedEntities(mockQuery);
      expect(unbacked).toEqual([
        { id: 'person:ghost', kind: 'person', name: 'Ghost Employee' },
        { id: 'automation:fake', kind: 'automation', name: 'Phantom Bot' },
      ]);
      expect(passedSql).toContain('SELECT e.id, e.kind, e.name');
      expect(passedSql).toContain('FROM entity e');
      expect(passedSql).toContain('NOT EXISTS');
      expect(passedParams[0]).toEqual(ALL_REF_KEYS);
    });
  });
});
