// =============================================================================
// Horquva Continuity Platform — Trust Guard T7: Provenance Check
// =============================================================================
// Asserts that every entity in the system traces directly to evidence:
// 1. Raw payload from an authenticated connector sync (matching REF_KEYS whitelist)
// 2. An active attestation task
// 3. An audit log entry recording manual creation (action = 'MANUAL_ENTITY_CREATED')
// Any entity not matching at least one of these is unbacked and flagged as fabricated.
// =============================================================================

import { query as defaultQuery } from '../db/client.js';
import type { Query } from '../repositories/graphRepository.js';
import { REF_KEYS } from '../connectors/sdk/sourceRules.js';

export interface UnbackedEntity {
  id: string;
  kind: string;
  name?: string;
}

export const ALL_REF_KEYS: string[] = Array.from(new Set(Object.values(REF_KEYS).flat()));

export interface ProvenanceContext {
  rawPayloadExternalIds: Set<string>;
  attestationEntityIds: Set<string>;
  manualEntityIds: Set<string>;
}

/**
 * Pure evaluation helper to check whether a single entity is backed by evidence.
 */
export function isEntityBacked(
  entity: { id: string; externalRefs?: Record<string, unknown> | null },
  context: ProvenanceContext,
): boolean {
  if (context.attestationEntityIds.has(entity.id)) return true;
  if (context.manualEntityIds.has(entity.id)) return true;
  if (context.rawPayloadExternalIds.has(entity.id)) return true;

  if (entity.externalRefs && typeof entity.externalRefs === 'object') {
    for (const key of ALL_REF_KEYS) {
      const val = (entity.externalRefs as Record<string, unknown>)[key];
      if (val !== undefined && val !== null && context.rawPayloadExternalIds.has(String(val))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Queries Postgres to find all active entities that have no backing in
 * raw_payload, attestation_task, or audit_log (MANUAL_ENTITY_CREATED).
 */
export async function findUnbackedEntities(
  q: Query = defaultQuery,
): Promise<UnbackedEntity[]> {
  const sql = `
    SELECT e.id, e.kind, e.name
    FROM entity e
    WHERE NOT EXISTS (
      SELECT 1 FROM raw_payload rp
      WHERE rp.external_id = e.id
         OR EXISTS (
           SELECT 1 FROM jsonb_each_text(COALESCE(e.external_refs, '{}'::jsonb)) kv
           WHERE kv.key = ANY($1::text[])
             AND kv.value = rp.external_id
         )
    )
    AND NOT EXISTS (
      SELECT 1 FROM attestation_task at
      WHERE at.asset_entity_id = e.id OR at.reviewer_person_id = e.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM audit_log al
      WHERE al.action = 'MANUAL_ENTITY_CREATED'
        AND (
          al.resource_id = e.id
          OR al.resource_id = ('entity:' || e.id)
          OR (al.details->>'entityId') = e.id
          OR (al.details->>'id') = e.id
        )
    )
    ORDER BY e.kind, e.id;
  `;

  const res = await q(sql, [ALL_REF_KEYS]);
  return (res.rows as any[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    name: r.name,
  }));
}
