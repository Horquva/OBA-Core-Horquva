// =============================================================================
// Horquva Continuity Platform — Base Connector & Persistence Manager
// =============================================================================
// Manages ELT raw landing and SCD Type 2 edge/fact versioning in PostgreSQL.
// The sync_run record itself is owned by ConnectorRunner (sdk/runner.ts).
// =============================================================================

import { Connector, ConnectorCapabilities, SyncResult, PersistStats } from './types.js';
import { ReadOnlyHttpGuard } from './guard.js';
import { withTransaction } from '../../db/client.js';

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
   * Writes one sync's results into the SCD2 store in a single transaction, as
   * part of the `sync_run` the runner already recorded:
   * - raw payloads land unchanged (replayable);
   * - entities are upserted; a person's directory name (Entra/Google) is not
   *   overwritten by a source that isn't a directory (n8n, AI vendors);
   * - edges and facts are versioned by evidence grade: a sync never replaces
   *   a stronger active row (e.g. an attested 'confirmed' owner) with a weaker
   *   one, mirroring FactStore's precedence rules;
   * - rows this connection asserted earlier but no longer reports are closed
   *   (valid_to = now), so a removed owner or member stops counting. That step
   *   is skipped when the sync reported errors or came back empty, so a
   *   partial fetch can't wipe the graph. Only core-module failures count as
   *   errors; a failed optional enrichment is a warning (sdk/issues.ts).
   * Edges/facts pointing at entities that don't exist are skipped and counted.
   */
  public async persistSync(syncResult: SyncResult, syncRunId: string): Promise<PersistStats> {
    return await withTransaction(async (client) => {
      const run = (sql: string, params: unknown[] = []) => client.query(sql, params);
      const rank = (col: string) => `(CASE ${col} WHEN 'confirmed' THEN 3 WHEN 'stated' THEN 2 WHEN 'inferred' THEN 1 ELSE 0 END)`;

      // 1. Raw landing zone
      if (syncResult.rawPayloads.length) {
        await run(
          `INSERT INTO raw_payload (sync_run_id, connection_id, resource_type, external_id, payload)
           SELECT $1, $2, resource_type, external_id, payload
             FROM jsonb_to_recordset($3::jsonb) AS x(resource_type text, external_id text, payload jsonb)`,
          [syncRunId, this.id, JSON.stringify(syncResult.rawPayloads.map((p) => ({ resource_type: p.resourceType, external_id: p.externalId, payload: p.payload })))]
        );
      }

      // 2. Entities
      const ent = await run(
        `INSERT INTO entity (id, kind, name, description, external_refs)
         SELECT DISTINCT ON (id) id, kind, name, description, COALESCE(external_refs, '{}'::jsonb)
           FROM jsonb_to_recordset($1::jsonb) AS x(id text, kind text, name text, description text, external_refs jsonb)
         ON CONFLICT (id) DO UPDATE SET
           kind = EXCLUDED.kind,
           name = CASE
             WHEN entity.kind = 'person'
              AND (entity.external_refs ? 'entraId' OR entity.external_refs ? 'googleId')
              AND NOT (EXCLUDED.external_refs ? 'entraId' OR EXCLUDED.external_refs ? 'googleId')
             THEN entity.name ELSE EXCLUDED.name END,
           description = COALESCE(EXCLUDED.description, entity.description),
           external_refs = entity.external_refs || EXCLUDED.external_refs,
           updated_at = NOW()`,
        [JSON.stringify(syncResult.entities.map((e) => ({ id: e.id, kind: e.kind, name: e.name, description: e.description ?? null, external_refs: e.externalRefs ?? {} })))]
      );

      // 3. Edges, staged so each step is one statement
      await run(
        `CREATE TEMP TABLE incoming_edge ON COMMIT DROP AS
         SELECT DISTINCT ON (from_id, to_id, type) from_id, to_id, type, grade, source, source_ref, owner_kind
           FROM jsonb_to_recordset($1::jsonb) AS x(from_id text, to_id text, type text, grade text, source text, source_ref text, owner_kind text)`,
        [JSON.stringify(syncResult.edges.map((e) => ({ from_id: e.fromId, to_id: e.toId, type: e.type, grade: e.grade, source: e.source, source_ref: e.sourceRef ?? null, owner_kind: e.ownerKind ?? null })))]
      );
      const edgeOrphans = await run(
        `DELETE FROM incoming_edge i
          WHERE NOT EXISTS (SELECT 1 FROM entity WHERE id = i.from_id) OR NOT EXISTS (SELECT 1 FROM entity WHERE id = i.to_id)`
      );
      const edgeSuperseded = await run(
        `UPDATE edge e SET valid_to = NOW()
           FROM incoming_edge i
          WHERE e.valid_to IS NULL AND e.from_id = i.from_id AND e.to_id = i.to_id AND e.type = i.type
            AND ${rank('i.grade')} > ${rank('e.grade')}`
      );
      const edgeCreated = await run(
        `INSERT INTO edge (from_id, to_id, type, grade, source, source_ref, owner_kind, connection_id, valid_from)
         SELECT i.from_id, i.to_id, i.type, i.grade, i.source, i.source_ref, i.owner_kind, $1, NOW() FROM incoming_edge i
          WHERE NOT EXISTS (SELECT 1 FROM edge e WHERE e.valid_to IS NULL AND e.from_id = i.from_id AND e.to_id = i.to_id AND e.type = i.type)`,
        [this.id]
      );
      // The insert only fires for a new triple, so a changed owner_kind on an
      // existing one is updated in place (not a new version: same claim, more
      // precise). A weaker claim never relabels a stronger one.
      await run(
        `UPDATE edge e SET owner_kind = i.owner_kind
           FROM incoming_edge i
          WHERE e.valid_to IS NULL AND e.from_id = i.from_id AND e.to_id = i.to_id AND e.type = i.type
            AND e.owner_kind IS DISTINCT FROM i.owner_kind
            AND ${rank('i.grade')} >= ${rank('e.grade')}`
      );

      // 4. Facts
      await run(
        `CREATE TEMP TABLE incoming_fact ON COMMIT DROP AS
         SELECT DISTINCT ON (entity_id, attribute) entity_id, attribute, value, grade, source, source_ref, attested_by
           FROM jsonb_to_recordset($1::jsonb) AS x(entity_id text, attribute text, value jsonb, grade text, source text, source_ref text, attested_by text)`,
        [JSON.stringify(syncResult.facts.map((f) => ({ entity_id: f.entityId, attribute: f.attribute, value: f.value ?? null, grade: f.grade, source: f.source, source_ref: f.sourceRef ?? null, attested_by: f.attestedBy ?? null })))]
      );
      const factOrphans = await run(`DELETE FROM incoming_fact i WHERE NOT EXISTS (SELECT 1 FROM entity WHERE id = i.entity_id)`);
      // A changed value or grade starts a new version, unless the active fact is
      // confirmed and the incoming one is weaker (source drift: the human answer
      // wins), or the incoming one is 'unknown' (a placeholder, not a claim).
      const factVersioned = await run(
        `UPDATE fact f SET valid_to = NOW()
           FROM incoming_fact i
          WHERE f.valid_to IS NULL AND f.entity_id = i.entity_id AND f.attribute = i.attribute
            AND (f.value IS DISTINCT FROM i.value OR f.grade <> i.grade)
            AND i.grade <> 'unknown'
            AND NOT (f.grade = 'confirmed' AND ${rank('i.grade')} < 3)`
      );
      const factCreated = await run(
        `INSERT INTO fact (entity_id, attribute, value, grade, source, source_ref, attested_by, connection_id, valid_from)
         SELECT i.entity_id, i.attribute, COALESCE(i.value, 'null'::jsonb), i.grade, i.source, i.source_ref, i.attested_by, $1, NOW() FROM incoming_fact i
          WHERE NOT EXISTS (SELECT 1 FROM fact f WHERE f.valid_to IS NULL AND f.entity_id = i.entity_id AND f.attribute = i.attribute)`,
        [this.id]
      );

      // 5. Close what this connection asserted before but no longer reports
      const complete = syncResult.stats.errors === 0 && syncResult.entities.length + syncResult.edges.length + syncResult.facts.length > 0;
      let edgesClosed = 0;
      let factsClosed = 0;
      if (complete) {
        const e = await run(
          `UPDATE edge e SET valid_to = NOW()
            WHERE e.valid_to IS NULL AND e.connection_id = $1
              AND NOT EXISTS (SELECT 1 FROM incoming_edge i WHERE i.from_id = e.from_id AND i.to_id = e.to_id AND i.type = e.type)`,
          [this.id]
        );
        const f = await run(
          `UPDATE fact f SET valid_to = NOW()
            WHERE f.valid_to IS NULL AND f.connection_id = $1
              AND NOT EXISTS (SELECT 1 FROM incoming_fact i WHERE i.entity_id = f.entity_id AND i.attribute = f.attribute)`,
          [this.id]
        );
        edgesClosed = e.rowCount ?? 0;
        factsClosed = f.rowCount ?? 0;
      }

      return {
        ...syncResult.stats,
        errorReasons: syncResult.stats.errorReasons ?? [],
        warnings: syncResult.stats.warnings ?? [],
        entitiesUpserted: ent.rowCount ?? 0,
        edgesCreated: edgeCreated.rowCount ?? 0,
        edgesSuperseded: edgeSuperseded.rowCount ?? 0,
        edgesClosed,
        factsCreated: factCreated.rowCount ?? 0,
        factsVersioned: factVersioned.rowCount ?? 0,
        factsClosed,
        orphansSkipped: (edgeOrphans.rowCount ?? 0) + (factOrphans.rowCount ?? 0),
        vanishedCheckSkipped: !complete,
      };
    });
  }
}
