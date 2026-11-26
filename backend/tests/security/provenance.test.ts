import { describe, it, expect } from 'vitest';
import { isEntityBacked, findUnbackedEntities, refKeyPairs } from '../../src/security/provenance.js';
import type { Query } from '../../src/repositories/graphRepository.js';

describe('Task 1.7: T7 Provenance Guard', () => {
  describe('isEntityBacked (pure evaluation)', () => {
    const emptyContext = {
      rawPayloadKeys: new Set<string>(),
      attestationEntityIds: new Set<string>(),
      manualEntityIds: new Set<string>(),
    };

    it('returns false for an entity with no backing', () => {
      expect(isEntityBacked({ id: 'person:nobody', externalRefs: {} }, emptyContext)).toBe(false);
    });

    it('returns false when externalRefs contains non-whitelisted keys', () => {
      const ctx = { ...emptyContext, rawPayloadKeys: new Set(['n8n|xyz']) };
      expect(isEntityBacked({ id: 'person:fake', externalRefs: { fakeRef: 'xyz' } }, ctx)).toBe(false);
    });

    it("returns true when a ref key matches a payload from that key's connection type", () => {
      const ctx = { ...emptyContext, rawPayloadKeys: new Set(['n8n|42']) };
      expect(isEntityBacked({ id: 'automation:n8n:42', externalRefs: { n8n: '42' } }, ctx)).toBe(true);
    });

    it('returns false when the matching payload came from another connection type', () => {
      const ctx = { ...emptyContext, rawPayloadKeys: new Set(['n8n|42']) };
      expect(isEntityBacked({ id: 'person:entra:42', externalRefs: { entraId: '42' } }, ctx)).toBe(false);
    });

    it('returns true when entity is present in an active attestation task', () => {
      const ctx = { ...emptyContext, attestationEntityIds: new Set(['app:legacy_portal']) };
      expect(isEntityBacked({ id: 'app:legacy_portal', externalRefs: {} }, ctx)).toBe(true);
    });

    it('returns true when entity has a MANUAL_ENTITY_CREATED audit entry', () => {
      const ctx = { ...emptyContext, manualEntityIds: new Set(['vendor:custom_contractor']) };
      expect(isEntityBacked({ id: 'vendor:custom_contractor', externalRefs: {} }, ctx)).toBe(true);
    });
  });

  describe('findUnbackedEntities (query mapping)', () => {
    it('passes (connection type, ref key) pairs and maps unbacked rows', async () => {
      let passedSql = '';
      let passedParams: any[] = [];
      const mockQuery: Query = (async (sql: string, params?: any[]) => {
        passedSql = sql;
        passedParams = params ?? [];
        return { rows: [{ id: 'person:ghost', kind: 'person', name: 'Ghost Employee' }], rowCount: 1 };
      }) as unknown as Query;

      const unbacked = await findUnbackedEntities(mockQuery);
      expect(unbacked).toEqual([{ id: 'person:ghost', kind: 'person', name: 'Ghost Employee' }]);
      expect(passedSql).toContain('JOIN connection c ON c.id = rp.connection_id');
      const pairs = refKeyPairs();
      expect(passedParams[0]).toEqual(pairs.map((p) => p.type));
      expect(passedParams[1]).toEqual(pairs.map((p) => p.key));
      expect(pairs).toContainEqual({ type: 'entra', key: 'entraId' });
    });
  });
});
