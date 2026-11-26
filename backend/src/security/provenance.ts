// =============================================================================
// Horquva Continuity Platform — Trust Guard T7: Provenance Check
// =============================================================================
// Every entity must trace to evidence. An entity is backed when at least one
// of these holds:
// 1. A raw_payload row from a connection of type T has external_id equal to
//    the entity's externalRefs[k], for a key k that REF_KEYS lists for T.
//    The key must belong to that connection's type: an n8n payload never
//    backs an entity through an Entra key, and vice versa.
// 2. The entity is the asset or reviewer of an attestation task.
// 3. An audit_log row with action MANUAL_ENTITY_CREATED names it.
// Anything else is unbacked, which in a runtime that holds no fixtures means
// fabricated.
// =============================================================================

import { query as defaultQuery } from '../db/client.js';
import type { Query } from '../repositories/graphRepository.js';
import { REF_KEYS } from '../connectors/sdk/sourceRules.js';

export interface UnbackedEntity {
  id: string;
  kind: string;
  name?: string;
}

/** (connection type, ref key) pairs, flattened from REF_KEYS. */
export function refKeyPairs(): Array<{ type: string; key: string }> {
  return Object.entries(REF_KEYS).flatMap(([type, keys]) => keys.map((key) => ({ type, key })));
}

export interface ProvenanceContext {
  /** `<connection type>|<external_id>` for every raw_payload row. */
  rawPayloadKeys: Set<string>;
  attestationEntityIds: Set<string>;
  manualEntityIds: Set<string>;
}

/** Pure form of the SQL below, for unit tests. */
export function isEntityBacked(
  entity: { id: string; externalRefs?: Record<string, unknown> | null },
  context: ProvenanceContext,
): boolean {
  if (context.attestationEntityIds.has(entity.id)) return true;
  if (context.manualEntityIds.has(entity.id)) return true;
  const refs = entity.externalRefs ?? {};
  for (const { type, key } of refKeyPairs()) {
    const val = refs[key];
    if (val !== undefined && val !== null && val !== '' && context.rawPayloadKeys.has(`${type}|${String(val)}`)) {
      return true;
    }
  }
  return false;
}

/**
 * Active entities with no backing. Set-based: the backed ids are computed once
 * with hash joins, not with a raw_payload scan per entity.
 */
export async function findUnbackedEntities(q: Query = defaultQuery): Promise<UnbackedEntity[]> {
  const pairs = refKeyPairs();
  const sql = `
    WITH ref_keys(conn_type, ref_key) AS (
      SELECT * FROM unnest($1::text[], $2::text[])
    ),
    payload_keys AS (
      SELECT DISTINCT c.type AS conn_type, rp.external_id
      FROM raw_payload rp
      JOIN connection c ON c.id = rp.connection_id
    ),
    backed AS (
      SELECT DISTINCT e.id
      FROM entity e
      JOIN ref_keys k ON e.external_refs ? k.ref_key
      JOIN payload_keys pk ON pk.conn_type = k.conn_type AND pk.external_id = e.external_refs ->> k.ref_key
      UNION
      SELECT asset_entity_id FROM attestation_task
      UNION
      SELECT reviewer_person_id FROM attestation_task
      UNION
      SELECT COALESCE(details ->> 'entityId', details ->> 'id', regexp_replace(resource_id, '^entity:', ''))
      FROM audit_log
      WHERE action = 'MANUAL_ENTITY_CREATED'
    )
    SELECT e.id, e.kind, e.name
    FROM entity e
    WHERE NOT EXISTS (SELECT 1 FROM backed b WHERE b.id = e.id)
    ORDER BY e.kind, e.id;
  `;
  const res = await q(sql, [pairs.map((p) => p.type), pairs.map((p) => p.key)]);
  return (res.rows as any[]).map((r) => ({ id: r.id, kind: r.kind, name: r.name }));
}
