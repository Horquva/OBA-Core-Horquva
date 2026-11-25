// =============================================================================
// Horquva Continuity Platform — autoLink & PostgresLinkRepository PG Tests
// =============================================================================
// Exercises real PostgreSQL persistence, partial unique indexes, transaction
// rollback, and all 7+ automatic identity linking behaviors.
// =============================================================================

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import type { CanonicalEntity } from '@horquva/types';
import { closePool, query } from '../../src/db/client.js';
import * as graphRepo from '../../src/repositories/graphRepository.js';
import { PostgresLinkRepository } from '../../src/identity/linkRepository.js';
import {
  autoLink,
  type AutoLinkAccountInput,
  type AutoLinkDirectoryInput,
} from '../../src/identity/autoLink.js';
import { resetDatabase } from './db.js';

const now = new Date('2026-11-01T00:00:00Z');

function makeEntity(id: string, kind: 'account' | 'person', name: string): CanonicalEntity {
  return {
    id,
    kind,
    name,
    externalRefs: {},
    createdAt: now,
    updatedAt: now,
  };
}

const SEED_ENTITIES: CanonicalEntity[] = [
  makeEntity('person:omar@acme.com', 'person', 'Omar Farooq'),
  makeEntity('person:maya@acme.com', 'person', 'Maya Lin'),
  makeEntity('person:sarah@acme.com', 'person', 'Sarah Chen'),
  makeEntity('account:n8n:10', 'account', 'Omar n8n'),
  makeEntity('account:openai:20', 'account', 'Omar OpenAI'),
  makeEntity('account:github:30', 'account', 'Admin Linked GitHub'),
  makeEntity('account:n8n:40', 'account', 'Changing Email Account'),
  makeEntity('account:slack:50', 'account', 'Shared Account'),
  makeEntity('account:n8n:bot_flag', 'account', 'Flagged Bot'),
  makeEntity('account:n8n:bot_pattern', 'account', 'Deploy Bot'),
  makeEntity('account:github:sugg', 'account', 'Sara Chen'),
];

const DIRECTORY: AutoLinkDirectoryInput[] = [
  {
    personId: 'person:omar@acme.com',
    emails: ['Omar@acme.com', 'o.farooq@acme.com'],
    displayName: 'Omar Farooq',
  },
  {
    personId: 'person:maya@acme.com',
    emails: ['maya@acme.com'],
    displayName: 'Maya Lin',
  },
  {
    personId: 'person:sarah@acme.com',
    emails: ['sarah.chen@acme.com'],
    displayName: 'Sarah Chen',
  },
];

beforeEach(async () => {
  await resetDatabase();
  await graphRepo.insertSnapshot({
    entities: SEED_ENTITIES,
    edges: [],
    facts: [],
  });
});

afterAll(async () => {
  await closePool();
});

describe('PostgresLinkRepository + autoLink (PG)', () => {
  const repo = new PostgresLinkRepository();

  it('exact email and alias email create stated links, and suggestions are excluded from listActive()', async () => {
    const accounts: AutoLinkAccountInput[] = [
      { id: 'account:n8n:10', email: 'OMAR@ACME.COM', displayName: 'Omar', isBot: false },
      { id: 'account:openai:20', email: 'o.farooq@acme.com', displayName: 'O. Farooq', isBot: false },
      { id: 'account:github:sugg', email: 'sara.c@personal.dev', displayName: 'Sara Chen', isBot: false },
    ];

    const stats = await autoLink(accounts, DIRECTORY, repo);
    expect(stats).toEqual({ created: 2, closed: 0, suggested: 1 });

    const active = await repo.listActive();
    expect(active).toHaveLength(2);
    expect(active.every((l) => l.grade === 'stated' && l.method === 'exact_email')).toBe(true);

    const suggestions = await repo.listActiveSuggestions();
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      accountId: 'account:github:sugg',
      personId: 'person:sarah@acme.com',
      grade: 'inferred',
      method: 'suggested',
    });

    const found = await repo.findByIds([active[0].id, suggestions[0].id, 'not-a-uuid']);
    expect(found).toHaveLength(2);
  });

  it('never overrides an admin_link even on email mismatch, email loss, or bot flag', async () => {
    await repo.create({
      accountId: 'account:github:30',
      personId: 'person:maya@acme.com',
      grade: 'confirmed',
      method: 'admin_link',
      linkedBy: 'user:admin',
      note: 'Verified owner',
    });

    const stats = await autoLink(
      [{ id: 'account:github:30', email: 'omar@acme.com', displayName: 'svc-bot', isBot: true }],
      DIRECTORY,
      repo
    );
    expect(stats).toEqual({ created: 0, closed: 0, suggested: 0 });

    const active = await repo.listActive();
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      accountId: 'account:github:30',
      personId: 'person:maya@acme.com',
      method: 'admin_link',
      grade: 'confirmed',
    });
  });

  it('closes automatic link on email change/loss, handles ambiguous email suggestions, and excludes bots', async () => {
    await autoLink(
      [
        { id: 'account:n8n:40', email: 'omar@acme.com', displayName: 'User 40', isBot: false },
        { id: 'account:n8n:bot_flag', email: 'maya@acme.com', displayName: 'Maya', isBot: false },
      ],
      DIRECTORY,
      repo
    );
    expect(await repo.listActive()).toHaveLength(2);

    const ambiguousDir: AutoLinkDirectoryInput[] = [
      { personId: 'person:omar@acme.com', emails: ['shared@acme.com'], displayName: 'Omar Farooq' },
      { personId: 'person:maya@acme.com', emails: ['shared@acme.com'], displayName: 'Maya Lin' },
    ];

    const stats = await autoLink(
      [
        { id: 'account:n8n:40', email: null, displayName: null, isBot: false },
        { id: 'account:n8n:bot_flag', email: 'maya@acme.com', displayName: 'Maya', isBot: true },
        { id: 'account:n8n:bot_pattern', email: 'svc-deploy@acme.com', displayName: 'Deploy Bot', isBot: false },
        { id: 'account:slack:50', email: 'shared@acme.com', displayName: 'Shared', isBot: false },
      ],
      ambiguousDir,
      repo
    );
    expect(stats).toEqual({ created: 0, closed: 2, suggested: 2 });
    expect(await repo.listActive()).toHaveLength(0);
    expect(await repo.listActiveSuggestions()).toHaveLength(2);
  });

  it('rejects unknown grade and rolls back transaction on error', async () => {
    await expect(
      repo.create({
        accountId: 'account:n8n:10',
        personId: 'person:omar@acme.com',
        grade: 'unknown',
        method: 'exact_email',
        linkedBy: 'autoLink',
        note: null,
      })
    ).rejects.toThrow();

    await expect(
      repo.runInTransaction(async (tx) => {
        await tx.create({
          accountId: 'account:n8n:10',
          personId: 'person:omar@acme.com',
          grade: 'stated',
          method: 'exact_email',
          linkedBy: 'autoLink',
          note: null,
        });
        throw new Error('rollback check');
      })
    ).rejects.toThrow('rollback check');

    const countRes = await query(`SELECT COUNT(*)::int AS n FROM identity_link`);
    expect(countRes.rows[0].n).toBe(0);
  });

  it('empty directory preserves pre-existing exact_email, admin_link, and suggested links', async () => {
    await repo.create({
      accountId: 'account:n8n:10',
      personId: 'person:omar@acme.com',
      grade: 'stated',
      method: 'exact_email',
      linkedBy: 'autoLink',
      note: 'Exact match',
    });
    await repo.create({
      accountId: 'account:github:30',
      personId: 'person:maya@acme.com',
      grade: 'confirmed',
      method: 'admin_link',
      linkedBy: 'user:admin',
      note: 'Admin link',
    });
    await repo.create({
      accountId: 'account:github:sugg',
      personId: 'person:sarah@acme.com',
      grade: 'inferred',
      method: 'suggested',
      linkedBy: 'autoLink',
      note: 'Name similarity',
    });

    const accounts: AutoLinkAccountInput[] = [
      { id: 'account:n8n:10', email: 'omar@acme.com', displayName: 'Omar', isBot: false },
      { id: 'account:github:30', email: 'maya@acme.com', displayName: 'Maya', isBot: false },
      { id: 'account:github:sugg', email: 'sara.c@personal.dev', displayName: 'Sara Chen', isBot: false },
    ];

    expect(await autoLink(accounts, [], repo)).toEqual({ created: 0, closed: 0, suggested: 0 });
    expect(
      await autoLink(accounts, [{ personId: '   ', emails: ['omar@acme.com'], displayName: 'Omar' }], repo)
    ).toEqual({ created: 0, closed: 0, suggested: 0 });
    expect(await repo.listActive()).toHaveLength(2);
    expect(await repo.listActiveSuggestions()).toHaveLength(1);
  });

  it('nested runInTransaction rolls back only inner savepoint when outer transaction catches error', async () => {
    await repo.runInTransaction(async (outerTx) => {
      await outerTx.create({
        accountId: 'account:n8n:10',
        personId: 'person:omar@acme.com',
        grade: 'stated',
        method: 'exact_email',
        linkedBy: 'autoLink',
        note: 'Outer write',
      });

      await expect(
        outerTx.runInTransaction(async (innerTx) => {
          await innerTx.create({
            accountId: 'account:openai:20',
            personId: 'person:maya@acme.com',
            grade: 'stated',
            method: 'exact_email',
            linkedBy: 'autoLink',
            note: 'Inner write',
          });
          throw new Error('inner savepoint rollback');
        })
      ).rejects.toThrow('inner savepoint rollback');
    });

    const active = await repo.listActive();
    expect(active).toHaveLength(1);
    expect(active[0].accountId).toBe('account:n8n:10');
  });
});
