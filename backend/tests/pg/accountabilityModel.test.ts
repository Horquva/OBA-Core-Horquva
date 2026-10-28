// =============================================================================
// Accountability model plumbing (B2) against Postgres: migration 008,
// edge.owner_kind through persistSync and the graph repository, the
// directory-name rule, and the ai_admin catalogue cleanup.
// =============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CanonicalEdge, CanonicalEntity } from '@horquva/types';
import { query } from '../../src/db/client.js';
import { BaseConnector } from '../../src/connectors/sdk/base.js';
import type { ConnectorCapabilities, SyncResult } from '../../src/connectors/sdk/types.js';
import { loadActiveGraph } from '../../src/repositories/graphRepository.js';
import { resetDatabase } from './db.js';

const MIGRATION_008 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../db/migrations/008_accountability.sql');

/** A connector whose next sync returns whatever the test sets. */
class ScriptedConnector extends BaseConnector {
  public readonly type = 'test';
  public next: Pick<SyncResult, 'entities' | 'edges'> = { entities: [], edges: [] };
  constructor(public readonly id: string, public readonly name = id) {
    super();
  }
  public async testConnection() { return true; }
  public getCapabilities(): ConnectorCapabilities {
    return { canDiscoverUsers: true, canDiscoverAutomations: false, canDiscoverCredentials: true, canDiscoverModelCalls: false, supportsWebhooks: false, pollingIntervalMinutes: 60 };
  }
  public async sync(): Promise<SyncResult> {
    const { entities, edges } = this.next;
    return { entities, edges, facts: [], rawPayloads: [], stats: { fetched: 0, entitiesCreated: entities.length, edgesCreated: edges.length, factsCreated: 0, errors: 0 } };
  }
  public async syncAndPersist() {
    const run = await query(`INSERT INTO sync_run (connection_id, status) VALUES ($1, 'running') RETURNING id`, [this.id]);
    return this.persistSync(await this.sync(), run.rows[0].id);
  }
}

async function connection(id: string): Promise<ScriptedConnector> {
  await query(`INSERT INTO connection (id, type, name) VALUES ($1, 'test', $1)`, [id]);
  return new ScriptedConnector(id);
}

const person = (email: string, name: string, externalRefs: Record<string, string>): CanonicalEntity => ({
  id: `person:${email}`, kind: 'person', name, externalRefs, createdAt: new Date(), updatedAt: new Date(),
});
const KEY: CanonicalEntity = { id: 'credential:openai:key_1', kind: 'credential', name: 'Prod key', externalRefs: { vendor: 'openai', keyId: 'key_1' }, createdAt: new Date(), updatedAt: new Date() };
const owns = (ownerKind: CanonicalEdge['ownerKind'], grade: CanonicalEdge['grade'] = 'stated'): CanonicalEdge => ({
  fromId: 'person:omar@acme.com', toId: KEY.id, type: 'owns', grade, source: 'connector:test', ownerKind, validFrom: new Date(),
});

beforeAll(async () => {
  await resetDatabase();
});

describe('migration 008', () => {
  it('adds edge.owner_kind and prediction_ledger.departure_id', async () => {
    const cols = await query(
      `SELECT table_name, column_name FROM information_schema.columns
        WHERE (table_name = 'edge' AND column_name = 'owner_kind') OR (table_name = 'prediction_ledger' AND column_name = 'departure_id')
        ORDER BY table_name`
    );
    expect(cols.rows).toEqual([{ table_name: 'edge', column_name: 'owner_kind' }, { table_name: 'prediction_ledger', column_name: 'departure_id' }]);
    const applied = await query(`SELECT 1 FROM schema_migrations WHERE name = '008_accountability.sql'`);
    expect(applied.rowCount).toBe(1);
  });
});

describe('edge.owner_kind', () => {
  it('round-trips through persistSync and loadActiveGraph, and a kind change updates in place', async () => {
    const c = await connection('conn_owner_kind');
    c.next = { entities: [person('omar@acme.com', 'Omar Farooq', {}), KEY], edges: [owns('owner')] };
    await c.syncAndPersist();

    const edgeOf = async () => (await loadActiveGraph()).edges.find((e) => e.toId === KEY.id && e.type === 'owns');
    const first = await edgeOf();
    expect(first?.ownerKind).toBe('owner');

    c.next = { ...c.next, edges: [owns('key_principal')] };
    await c.syncAndPersist();
    const second = await edgeOf();
    expect(second?.ownerKind).toBe('key_principal');
    expect(second?.id).toBe(first?.id); // same row, not a new version

    const versions = await query(`SELECT COUNT(*)::int AS n FROM edge WHERE to_id = $1 AND type = 'owns'`, [KEY.id]);
    expect(versions.rows[0].n).toBe(1);
  });

  it('a weaker claim never relabels a stronger edge', async () => {
    await query(`UPDATE edge SET grade = 'confirmed' WHERE to_id = $1 AND type = 'owns' AND valid_to IS NULL`, [KEY.id]);
    const c = new ScriptedConnector('conn_owner_kind');
    c.next = { entities: [person('omar@acme.com', 'Omar Farooq', {}), KEY], edges: [owns('creator', 'inferred')] };
    await c.syncAndPersist();
    const edge = (await loadActiveGraph()).edges.find((e) => e.toId === KEY.id && e.type === 'owns');
    expect(edge).toMatchObject({ ownerKind: 'key_principal', grade: 'confirmed' });
  });
});

describe('person names', () => {
  it('keeps the directory name when a non-directory source syncs the same person', async () => {
    const entra = await connection('conn_entra_names');
    const openai = await connection('conn_openai_names');
    entra.next = { entities: [person('nadia@acme.com', 'Nadia Rahman', { entraId: 'u-nadia', email: 'nadia@acme.com' })], edges: [] };
    await entra.syncAndPersist();
    openai.next = { entities: [person('nadia@acme.com', 'nadia', { openaiUserId: 'user-n', email: 'nadia@acme.com' })], edges: [] };
    await openai.syncAndPersist();

    const row = (await query(`SELECT name, external_refs FROM entity WHERE id = 'person:nadia@acme.com'`)).rows[0];
    expect(row.name).toBe('Nadia Rahman');
    expect(row.external_refs).toMatchObject({ entraId: 'u-nadia', openaiUserId: 'user-n' }); // refs still merge
  });

  it('lets the directory name replace a name from a non-directory source', async () => {
    const n8n = await connection('conn_n8n_names');
    const google = await connection('conn_google_names');
    n8n.next = { entities: [person('chen@acme.com', 'chen', { n8nUserId: 'u-chen' })], edges: [] };
    await n8n.syncAndPersist();
    google.next = { entities: [person('chen@acme.com', 'Chen Wei', { googleId: 'g-chen' })], edges: [] };
    await google.syncAndPersist();
    expect((await query(`SELECT name FROM entity WHERE id = 'person:chen@acme.com'`)).rows[0].name).toBe('Chen Wei');
  });
});

describe('ai_admin catalogue cleanup', () => {
  it('deletes only catalogue models with no edge and no fact', async () => {
    const aiConn = await connection('conn_ai_catalogue');
    const run = await query(`INSERT INTO sync_run (connection_id, status) VALUES ($1, 'completed') RETURNING id`, [aiConn.id]);
    const runId = run.rows[0].id;
    await query(
      `INSERT INTO entity (id, kind, name) VALUES
         ('model:openai:gpt-4o', 'model', 'OpenAI gpt-4o'),
         ('model:anthropic:claude-3-opus-20240229', 'model', 'Claude 3 Opus'),
         ('model:openai:gpt-4.1', 'model', 'OpenAI gpt-4.1'),
         ('model:anthropic:claude-3-5-haiku-20241022', 'model', 'Claude 3.5 Haiku'),
         ('model:openai:from-n8n', 'model', 'Used by a workflow'),
         ('automation:n8n:900', 'automation', 'Summariser')`
    );
    await query(
      `INSERT INTO raw_payload (sync_run_id, connection_id, resource_type, external_id, payload) VALUES
         ($1, $2, 'openai_model', 'gpt-4o', '{}'),
         ($1, $2, 'anthropic_model', 'claude-3-opus-20240229', '{}'),
         ($1, $2, 'openai_model', 'gpt-4.1', '{}'),
         ($1, $2, 'anthropic_model', 'claude-3-5-haiku-20241022', '{}')`,
      [runId, aiConn.id]
    );
    // gpt-4.1 is called by a workflow (a closed edge still counts); the haiku model has a fact.
    await query(`INSERT INTO edge (from_id, to_id, type, grade, source, valid_from, valid_to) VALUES ('automation:n8n:900', 'model:openai:gpt-4.1', 'calls_model', 'stated', 'connector:n8n', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day')`);
    await query(`INSERT INTO fact (entity_id, attribute, value, grade, source) VALUES ('model:anthropic:claude-3-5-haiku-20241022', 'criticality', '"high"', 'confirmed', 'attestation')`);

    await query(fs.readFileSync(MIGRATION_008, 'utf8')); // idempotent: re-run it on this data

    const left = (await query(`SELECT id FROM entity WHERE kind = 'model' ORDER BY id`)).rows.map((r: any) => r.id);
    expect(left).toEqual(['model:anthropic:claude-3-5-haiku-20241022', 'model:openai:from-n8n', 'model:openai:gpt-4.1']);
  });
});
