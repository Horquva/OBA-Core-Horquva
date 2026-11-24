// =============================================================================
// Horquva Continuity Platform — Provenance Check Postgres Tests (T7)
// =============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'node:crypto';
import { query } from '../../src/db/client.js';
import { findUnbackedEntities } from '../../src/security/provenance.js';
import { resetDatabase } from './db.js';

describe('Task 1.7: Provenance Guard (PostgreSQL)', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  it('correctly filters backed entities and returns only unbacked entities', async () => {
    // 1. Setup connection & sync run
    const connId = 'conn_entra_test';
    const syncRunId = crypto.randomUUID();

    await query(
      `INSERT INTO connection (id, name, type, config_encrypted)
       VALUES ($1, 'Test Entra', 'entra', 'enc')
       ON CONFLICT (id) DO NOTHING`,
      [connId]
    );

    await query(
      `INSERT INTO sync_run (id, connection_id, status)
       VALUES ($1, $2, 'completed')`,
      [syncRunId, connId]
    );

    // 2. Insert entities
    // Entity A: Backed by raw_payload via entraId
    await query(
      `INSERT INTO entity (id, kind, name, external_refs)
       VALUES ('person:alice', 'person', 'Alice Backed', '{"entraId": "entra-alice-01"}'::jsonb)`
    );
    await query(
      `INSERT INTO raw_payload (sync_run_id, connection_id, resource_type, external_id, payload)
       VALUES ($1, $2, 'user', 'entra-alice-01', '{"displayName": "Alice Backed"}'::jsonb)`,
      [syncRunId, connId]
    );

    // Entity B: Backed by attestation_task
    const campaignId = crypto.randomUUID();
    const taskId = crypto.randomUUID();
    await query(
      `INSERT INTO campaign (id, name, due_date)
       VALUES ($1, 'Q4 Review', NOW() + interval '7 days')`,
      [campaignId]
    );
    await query(
      `INSERT INTO entity (id, kind, name, external_refs)
       VALUES ('app:billing_portal', 'app', 'Billing Portal', '{}'::jsonb)`
    );
    await query(
      `INSERT INTO attestation_task (id, campaign_id, reviewer_person_id, asset_entity_id, token)
       VALUES ($1, $2, 'person:alice', 'app:billing_portal', 'token_portal_review')`,
      [taskId, campaignId]
    );

    // Entity C: Backed by audit_log MANUAL_ENTITY_CREATED
    await query(
      `INSERT INTO entity (id, kind, name, external_refs)
       VALUES ('automation:custom_bot', 'automation', 'Custom Bot', '{}'::jsonb)`
    );
    await query(
      `INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details)
       VALUES ($1, 'admin', 'MANUAL_ENTITY_CREATED', 'automation', 'automation:custom_bot', '{"note": "Created manually"}'::jsonb)`,
      [crypto.randomUUID()]
    );

    // Entity D: Unbacked (phantom/fabricated entity)
    await query(
      `INSERT INTO entity (id, kind, name, external_refs)
       VALUES ('credential:phantom_secret', 'credential', 'Phantom Secret', '{"unknownKey": "123"}'::jsonb)`
    );

    // 3. Run provenance check
    const unbacked = await findUnbackedEntities();

    expect(unbacked).toHaveLength(1);
    expect(unbacked[0]).toEqual({
      id: 'credential:phantom_secret',
      kind: 'credential',
      name: 'Phantom Secret',
    });
  });
});
