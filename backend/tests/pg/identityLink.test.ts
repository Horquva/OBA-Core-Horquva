// =============================================================================
// Horquva Continuity Platform — identity_link Migration 009 Postgres Tests
// =============================================================================
// Exercises schema constraints, partial unique indexes, temporal closing,
// ON DELETE CASCADE, and removal of identity_queue.linked_person_id.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { query, closePool } from '../../src/db/client.js';
import { resetDatabase } from './db.js';

async function insertEntity(id: string, kind: 'account' | 'person', name: string): Promise<void> {
  await query(
    `INSERT INTO entity (id, kind, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [id, kind, name]
  );
}

async function expectPgError(promise: Promise<unknown>, expectedCode: string): Promise<void> {
  let caught: any;
  try {
    await promise;
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeDefined();
  expect(caught?.code).toBe(expectedCode);
}

beforeAll(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closePool();
});

describe('migration 009: identity_link', () => {
  it('identity_queue.linked_person_id is dropped', async () => {
    const cols = await query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'identity_queue'
          AND column_name = 'linked_person_id'`
    );
    expect(cols.rows).toHaveLength(0);

    const applied = await query(
      `SELECT 1 FROM schema_migrations WHERE name = '009_identity_link.sql'`
    );
    expect(applied.rowCount).toBe(1);
  });

  it('two active non-suggested links for one account are rejected', async () => {
    const accountId = 'account:n8n:dup_check';
    const personA = 'person:alice.dup@acme.com';
    const personB = 'person:bob.dup@acme.com';
    await insertEntity(accountId, 'account', 'Alice n8n');
    await insertEntity(personA, 'person', 'Alice');
    await insertEntity(personB, 'person', 'Bob');

    await query(
      `INSERT INTO identity_link (account_id, person_id, grade, method, linked_by)
       VALUES ($1, $2, 'stated', 'exact_email', 'autoLink')`,
      [accountId, personA]
    );

    await expectPgError(
      query(
        `INSERT INTO identity_link (account_id, person_id, grade, method, linked_by)
         VALUES ($1, $2, 'confirmed', 'admin_link', 'user:admin')`,
        [accountId, personB]
      ),
      '23505'
    );
  });

  it('suggested links may coexist with one active link', async () => {
    const accountId = 'account:github:coexist_check';
    const personA = 'person:alice.co@acme.com';
    const personB = 'person:bob.co@acme.com';
    const personC = 'person:carol.co@acme.com';
    await insertEntity(accountId, 'account', 'Coexist Account');
    await insertEntity(personA, 'person', 'Alice Co');
    await insertEntity(personB, 'person', 'Bob Co');
    await insertEntity(personC, 'person', 'Carol Co');

    await query(
      `INSERT INTO identity_link (account_id, person_id, grade, method, linked_by)
       VALUES ($1, $2, 'stated', 'exact_email', 'autoLink')`,
      [accountId, personA]
    );

    await query(
      `INSERT INTO identity_link (account_id, person_id, grade, method, linked_by)
       VALUES ($1, $2, 'inferred', 'suggested', 'autoLink'),
              ($1, $3, 'inferred', 'suggested', 'autoLink')`,
      [accountId, personB, personC]
    );

    await expectPgError(
      query(
        `INSERT INTO identity_link (account_id, person_id, grade, method, linked_by)
         VALUES ($1, $2, 'inferred', 'suggested', 'autoLink')`,
        [accountId, personB]
      ),
      '23505'
    );

    const active = await query(
      `SELECT person_id, method FROM identity_link WHERE account_id = $1 AND valid_to IS NULL ORDER BY method, person_id`,
      [accountId]
    );
    expect(active.rows).toHaveLength(3);
  });

  it('closing a link allows a new one', async () => {
    const accountId = 'account:openai:relink_check';
    const personA = 'person:alice.relink@acme.com';
    const personB = 'person:bob.relink@acme.com';
    await insertEntity(accountId, 'account', 'Relink Account');
    await insertEntity(personA, 'person', 'Alice Relink');
    await insertEntity(personB, 'person', 'Bob Relink');

    await query(
      `INSERT INTO identity_link (account_id, person_id, grade, method, linked_by)
       VALUES ($1, $2, 'stated', 'exact_email', 'autoLink')`,
      [accountId, personA]
    );

    await query(
      `UPDATE identity_link
          SET valid_to = NOW()
        WHERE account_id = $1 AND valid_to IS NULL AND method <> 'suggested'`,
      [accountId]
    );

    await query(
      `INSERT INTO identity_link (account_id, person_id, grade, method, linked_by, note)
       VALUES ($1, $2, 'confirmed', 'admin_link', 'user:admin', 'Reassigned by admin')`,
      [accountId, personB]
    );

    const rows = await query(
      `SELECT person_id, valid_to IS NULL AS is_active
         FROM identity_link
        WHERE account_id = $1
        ORDER BY valid_to NULLS LAST`,
      [accountId]
    );
    expect(rows.rows).toEqual([
      { person_id: personA, is_active: false },
      { person_id: personB, is_active: true },
    ]);
  });

  it('CHECK constraints reject invalid grade/method and ON DELETE CASCADE deletes links', async () => {
    const accountId1 = 'account:slack:cascade_acc';
    const accountId2 = 'account:slack:cascade_per';
    const person1 = 'person:cascade.one@acme.com';
    const person2 = 'person:cascade.two@acme.com';
    await insertEntity(accountId1, 'account', 'Cascade Acc');
    await insertEntity(accountId2, 'account', 'Cascade Per');
    await insertEntity(person1, 'person', 'Cascade One');
    await insertEntity(person2, 'person', 'Cascade Two');

    await expectPgError(
      query(
        `INSERT INTO identity_link (account_id, person_id, grade, method)
         VALUES ($1, $2, 'unknown', 'exact_email')`,
        [accountId1, person1]
      ),
      '23514'
    );

    await expectPgError(
      query(
        `INSERT INTO identity_link (account_id, person_id, grade, method)
         VALUES ($1, $2, 'inferred', 'heuristic')`,
        [accountId1, person1]
      ),
      '23514'
    );

    await query(
      `INSERT INTO identity_link (account_id, person_id, grade, method)
       VALUES ($1, $2, 'confirmed', 'admin_link'),
              ($3, $4, 'stated', 'exact_email')`,
      [accountId1, person1, accountId2, person2]
    );

    await query(`DELETE FROM entity WHERE id = $1`, [accountId1]);
    const afterAccountDelete = await query(
      `SELECT COUNT(*)::int AS n FROM identity_link WHERE account_id = $1`,
      [accountId1]
    );
    expect(afterAccountDelete.rows[0].n).toBe(0);

    await query(`DELETE FROM entity WHERE id = $1`, [person2]);
    const afterPersonDelete = await query(
      `SELECT COUNT(*)::int AS n FROM identity_link WHERE person_id = $1`,
      [person2]
    );
    expect(afterPersonDelete.rows[0].n).toBe(0);
  });
});
