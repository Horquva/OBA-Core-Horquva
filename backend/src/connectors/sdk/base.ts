// =============================================================================
// Horquva Continuity Platform — Base Connector & Persistence Manager
// =============================================================================
// Manages ELT raw landing, SCD Type 2 fact versioning, edge resolution,
// and sync run audit records in PostgreSQL.
// =============================================================================

import { CanonicalEntity, CanonicalEdge, CanonicalFact } from '@horquva/types';
import { Connector, ConnectorCapabilities, SyncResult, RawPayloadRecord } from './types.js';
import { ReadOnlyHttpGuard } from './guard.js';
import { query, withTransaction } from '../../db/client.js';

export abstract class BaseConnector implements Connector {
  public abstract readonly id: string;
  public abstract readonly type: string;
  public abstract readonly name: string;
  protected guard: ReadOnlyHttpGuard;

  constructor(allowedHostPatterns: (string | RegExp)[] = []) {
    this.guard = new ReadOnlyHttpGuard(allowedHostPatterns);
  }

  public abstract testConnection(): Promise<boolean>;
  public abstract sync(): Promise<SyncResult>;
  public abstract getCapabilities(): ConnectorCapabilities;

  /**
   * Persists the sync run, writing raw landing payloads, upserting entities,
   * inserting new SCD Type 2 facts/edges, and recording sync stats.
   */
  public async persistSync(syncResult: SyncResult): Promise<string> {
    return await withTransaction(async (client) => {
      // 1. Create sync_run record
      const runRes = await client.query(
        `
        INSERT INTO sync_run (connection_id, status, started_at, stats)
        VALUES ($1, 'running', NOW(), $2)
        RETURNING id;
        `,
        [this.id, JSON.stringify(syncResult.stats)]
      );
      const syncRunId = runRes.rows[0].id;

      // 2. Persist raw payloads (immutable landing zone)
      for (const payload of syncResult.rawPayloads) {
        await client.query(
          `
          INSERT INTO raw_payload (sync_run_id, connection_id, resource_type, external_id, payload, ingested_at)
          VALUES ($1, $2, $3, $4, $5, NOW());
          `,
          [syncRunId, this.id, payload.resourceType, payload.externalId, JSON.stringify(payload.payload)]
        );
      }

      // 3. Upsert canonical entities
      for (const entity of syncResult.entities) {
        await client.query(
          `
          INSERT INTO entity (id, kind, name, description, external_refs, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = COALESCE(EXCLUDED.description, entity.description),
            external_refs = entity.external_refs || EXCLUDED.external_refs,
            updated_at = NOW();
          `,
          [
            entity.id,
            entity.kind,
            entity.name,
            entity.description || null,
            JSON.stringify(entity.externalRefs || {}),
          ]
        );
      }

      // 4. Upsert/version SCD2 canonical edges
      for (const edge of syncResult.edges) {
        // Check if an identical active edge already exists
        const existing = await client.query(
          `
          SELECT id, grade FROM edge
          WHERE from_id = $1 AND to_id = $2 AND type = $3 AND valid_to IS NULL;
          `,
          [edge.fromId, edge.toId, edge.type]
        );

        if (existing.rows.length === 0) {
          await client.query(
            `
            INSERT INTO edge (from_id, to_id, type, grade, source, source_ref, valid_from)
            VALUES ($1, $2, $3, $4, $5, $6, NOW());
            `,
            [edge.fromId, edge.toId, edge.type, edge.grade, edge.source, edge.sourceRef || null]
          );
        } else if (existing.rows[0].grade !== edge.grade) {
          // Close old edge and create upgraded/downgraded edge version
          await client.query(
            `UPDATE edge SET valid_to = NOW() WHERE id = $1;`,
            [existing.rows[0].id]
          );
          await client.query(
            `
            INSERT INTO edge (from_id, to_id, type, grade, source, source_ref, valid_from)
            VALUES ($1, $2, $3, $4, $5, $6, NOW());
            `,
            [edge.fromId, edge.toId, edge.type, edge.grade, edge.source, edge.sourceRef || null]
          );
        }
      }

      // 5. Upsert/version SCD2 canonical facts
      for (const fact of syncResult.facts) {
        const existing = await client.query(
          `
          SELECT id, value, grade FROM fact
          WHERE entity_id = $1 AND attribute = $2 AND valid_to IS NULL;
          `,
          [fact.entityId, fact.attribute]
        );

        const serializedValue = JSON.stringify(fact.value);
        if (existing.rows.length === 0) {
          await client.query(
            `
            INSERT INTO fact (entity_id, attribute, value, grade, source, source_ref, attested_by, valid_from)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());
            `,
            [
              fact.entityId,
              fact.attribute,
              serializedValue,
              fact.grade,
              fact.source,
              fact.sourceRef || null,
              fact.attestedBy || null,
            ]
          );
        } else {
          const currentValSerialized = JSON.stringify(existing.rows[0].value);
          if (currentValSerialized !== serializedValue || existing.rows[0].grade !== fact.grade) {
            // Close previous fact record and insert new SCD2 version
            await client.query(
              `UPDATE fact SET valid_to = NOW() WHERE id = $1;`,
              [existing.rows[0].id]
            );
            await client.query(
              `
              INSERT INTO fact (entity_id, attribute, value, grade, source, source_ref, attested_by, valid_from)
              VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());
              `,
              [
                fact.entityId,
                fact.attribute,
                serializedValue,
                fact.grade,
                fact.source,
                fact.sourceRef || null,
                fact.attestedBy || null,
              ]
            );
          }
        }
      }

      // 6. Complete sync_run record
      await client.query(
        `
        UPDATE sync_run
        SET status = 'completed',
            completed_at = NOW(),
            stats = $1
        WHERE id = $2;
        `,
        [JSON.stringify(syncResult.stats), syncRunId]
      );

      // 7. Update connection status
      await client.query(
        `
        UPDATE connection
        SET status = 'connected',
            last_sync_at = NOW(),
            last_error = NULL,
            updated_at = NOW()
        WHERE id = $1;
        `,
        [this.id]
      );

      return syncRunId;
    });
  }
}
