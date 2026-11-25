// =============================================================================
// Horquva Continuity Platform — autoLink & InMemoryLinkRepository Unit Tests
// =============================================================================
// Covers all 7 graded automatic linking rules, name similarity suggestions,
// idempotency, stale suggestion closing, and InMemoryLinkRepository constraints.
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryLinkRepository,
  type LinkRepository,
} from '../../src/identity/linkRepository.js';
import {
  autoLink,
  type AutoLinkAccountInput,
  type AutoLinkDirectoryInput,
} from '../../src/identity/autoLink.js';

describe('InMemoryLinkRepository', () => {
  let repo: InMemoryLinkRepository;

  beforeEach(() => {
    repo = new InMemoryLinkRepository();
  });

  it('rejects unknown grade matching migration 009 CHECK constraint', async () => {
    await expect(
      repo.create({
        accountId: 'account:n8n:1',
        personId: 'person:omar@acme.com',
        grade: 'unknown',
        method: 'exact_email',
        linkedBy: 'autoLink',
        note: null,
      })
    ).rejects.toThrow(/grade/i);
  });

  it('enforces active non-suggested uniqueness per account (uq_identity_link_active_account)', async () => {
    const first = await repo.create({
      accountId: 'account:n8n:1',
      personId: 'person:omar@acme.com',
      grade: 'stated',
      method: 'exact_email',
      linkedBy: 'autoLink',
      note: null,
    });

    await expect(
      repo.create({
        accountId: 'account:n8n:1',
        personId: 'person:maya@acme.com',
        grade: 'confirmed',
        method: 'admin_link',
        linkedBy: 'user:admin',
        note: null,
      })
    ).rejects.toThrow();

    // Closing the first link allows a new active link
    await repo.close(first.id);
    const second = await repo.create({
      accountId: 'account:n8n:1',
      personId: 'person:maya@acme.com',
      grade: 'confirmed',
      method: 'admin_link',
      linkedBy: 'user:admin',
      note: 'Reassigned',
    });

    const active = await repo.listActive();
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(second.id);
    expect(active[0].personId).toBe('person:maya@acme.com');
  });

  it('enforces active suggestion pair uniqueness while allowing coexistence with active link', async () => {
    await repo.create({
      accountId: 'account:github:1',
      personId: 'person:omar@acme.com',
      grade: 'stated',
      method: 'exact_email',
      linkedBy: 'autoLink',
      note: null,
    });

    await repo.create({
      accountId: 'account:github:1',
      personId: 'person:maya@acme.com',
      grade: 'inferred',
      method: 'suggested',
      linkedBy: 'autoLink',
      note: 'Suggestion 1',
    });

    await repo.create({
      accountId: 'account:github:1',
      personId: 'person:priya@acme.com',
      grade: 'inferred',
      method: 'suggested',
      linkedBy: 'autoLink',
      note: 'Suggestion 2',
    });

    await expect(
      repo.create({
        accountId: 'account:github:1',
        personId: 'person:maya@acme.com',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Duplicate pair',
      })
    ).rejects.toThrow();

    expect(await repo.listActive()).toHaveLength(1);
    expect(await repo.listActiveSuggestions()).toHaveLength(2);
    expect(await repo.listAllOpen()).toHaveLength(3);
  });

  it('supports findByIds and closeActiveByAccount with optional method filter', async () => {
    const l1 = await repo.create({
      accountId: 'account:n8n:2',
      personId: 'person:omar@acme.com',
      grade: 'stated',
      method: 'exact_email',
      linkedBy: 'autoLink',
      note: null,
    });
    const s1 = await repo.create({
      accountId: 'account:n8n:2',
      personId: 'person:maya@acme.com',
      grade: 'inferred',
      method: 'suggested',
      linkedBy: 'autoLink',
      note: 'Maybe',
    });

    const found = await repo.findByIds([l1.id, s1.id, 'nonexistent-id']);
    expect(found.map((x) => x.id).sort()).toEqual([l1.id, s1.id].sort());

    expect(await repo.closeActiveByAccount('account:n8n:2', [])).toBe(0);
    expect(await repo.closeActiveByAccount('account:n8n:2', ['suggested'])).toBe(1);
    expect(await repo.listActiveSuggestions()).toHaveLength(0);
    expect(await repo.listActive()).toHaveLength(1);

    expect(await repo.closeActiveByAccount('account:n8n:2')).toBe(1);
    expect(await repo.listAllOpen()).toHaveLength(0);
  });

  it('rolls back changes when runInTransaction throws', async () => {
    await repo.create({
      accountId: 'account:n8n:tx',
      personId: 'person:omar@acme.com',
      grade: 'stated',
      method: 'exact_email',
      linkedBy: 'autoLink',
      note: null,
    });

    await expect(
      repo.runInTransaction(async (tx: LinkRepository) => {
        await tx.closeActiveByAccount('account:n8n:tx');
        await tx.create({
          accountId: 'account:n8n:tx',
          personId: 'person:maya@acme.com',
          grade: 'stated',
          method: 'exact_email',
          linkedBy: 'autoLink',
          note: null,
        });
        throw new Error('simulated failure');
      })
    ).rejects.toThrow('simulated failure');

    const active = await repo.listActive();
    expect(active).toHaveLength(1);
    expect(active[0].personId).toBe('person:omar@acme.com');
  });

  it('persists changes when runInTransaction succeeds and ignores close on unknown/closed ids', async () => {
    const created = await repo.runInTransaction(async (tx: LinkRepository) => {
      return tx.create({
        accountId: 'account:n8n:tx_ok',
        personId: 'person:omar@acme.com',
        grade: 'stated',
        method: 'exact_email',
        linkedBy: 'autoLink',
        note: null,
      });
    });

    expect(await repo.listActive()).toHaveLength(1);
    await repo.close(created.id);
    await repo.close(created.id); // idempotent no-op
    await repo.close('non-existent-id');
    expect(await repo.listActive()).toHaveLength(0);
  });
});

describe('autoLink', () => {
  let repo: InMemoryLinkRepository;

  const directory: AutoLinkDirectoryInput[] = [
    {
      personId: 'person:omar@acme.com',
      emails: ['Omar@acme.com', 'o.farooq@acme.com'],
      displayName: 'Omar Farooq',
    },
    {
      personId: 'person:maya@acme.com',
      emails: ['maya@acme.com', 'maya.lin@acme.com'],
      displayName: 'Maya Lin',
    },
    {
      personId: 'person:sarah@acme.com',
      emails: ['sarah.chen@acme.com'],
      displayName: 'Sarah Chen',
    },
  ];

  beforeEach(() => {
    repo = new InMemoryLinkRepository();
  });

  it('1. exact email creates stated link (case-insensitive)', async () => {
    const accounts: AutoLinkAccountInput[] = [
      { id: 'account:n8n:10', email: '  OMAR@ACME.COM ', displayName: 'Omar', isBot: false },
    ];

    const stats = await autoLink(accounts, directory, repo);
    expect(stats).toEqual({ created: 1, closed: 0, suggested: 0 });

    const active = await repo.listActive();
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      accountId: 'account:n8n:10',
      personId: 'person:omar@acme.com',
      grade: 'stated',
      method: 'exact_email',
      linkedBy: 'autoLink',
    });
  });

  it('2. alias email creates stated link', async () => {
    const accounts: AutoLinkAccountInput[] = [
      { id: 'account:openai:20', email: 'o.farooq@acme.com', displayName: 'O. Farooq', isBot: false },
    ];

    const stats = await autoLink(accounts, directory, repo);
    expect(stats).toEqual({ created: 1, closed: 0, suggested: 0 });

    const active = await repo.listActive();
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      accountId: 'account:openai:20',
      personId: 'person:omar@acme.com',
      grade: 'stated',
      method: 'exact_email',
    });
  });

  it('3. automatic match never overrides a confirmed admin_link', async () => {
    await repo.create({
      accountId: 'account:github:30',
      personId: 'person:maya@acme.com',
      grade: 'confirmed',
      method: 'admin_link',
      linkedBy: 'user:admin',
      note: 'Admin confirmed contractor mapping',
    });

    // Even when email matches Omar, or email is null, or account is flagged as bot
    const accounts: AutoLinkAccountInput[] = [
      { id: 'account:github:30', email: 'omar@acme.com', displayName: 'svc-bot', isBot: true },
    ];
    const stats1 = await autoLink(accounts, directory, repo);
    expect(stats1).toEqual({ created: 0, closed: 0, suggested: 0 });

    const stats2 = await autoLink(
      [{ id: 'account:github:30', email: null, displayName: null, isBot: false }],
      directory,
      repo
    );
    expect(stats2).toEqual({ created: 0, closed: 0, suggested: 0 });

    const active = await repo.listActive();
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      accountId: 'account:github:30',
      personId: 'person:maya@acme.com',
      grade: 'confirmed',
      method: 'admin_link',
    });
  });

  it('4. email change or email loss on the account closes the automatic link', async () => {
    const accId = 'account:n8n:40';
    await autoLink(
      [{ id: accId, email: 'omar@acme.com', displayName: 'Different Name', isBot: false }],
      directory,
      repo
    );
    expect(await repo.listActive()).toHaveLength(1);

    // Email changed to another person's email -> closes old link and creates new stated link
    const reassigned = await autoLink(
      [{ id: accId, email: 'maya@acme.com', displayName: 'Different Name', isBot: false }],
      directory,
      repo
    );
    expect(reassigned).toEqual({ created: 1, closed: 1, suggested: 0 });
    let active = await repo.listActive();
    expect(active).toHaveLength(1);
    expect(active[0].personId).toBe('person:maya@acme.com');

    // Email changed to unknown email -> closes link
    const unmatched = await autoLink(
      [{ id: accId, email: 'external@contractor.io', displayName: 'External Person', isBot: false }],
      directory,
      repo
    );
    expect(unmatched).toEqual({ created: 0, closed: 1, suggested: 0 });
    expect(await repo.listActive()).toHaveLength(0);

    // Link again then lose email (null) -> closes link
    await autoLink(
      [{ id: accId, email: 'omar@acme.com', displayName: null, isBot: false }],
      directory,
      repo
    );
    expect(await repo.listActive()).toHaveLength(1);

    const lostEmail = await autoLink(
      [{ id: accId, email: null, displayName: null, isBot: false }],
      directory,
      repo
    );
    expect(lostEmail).toEqual({ created: 0, closed: 1, suggested: 0 });
    expect(await repo.listActive()).toHaveLength(0);
  });

  it('5. ambiguous email creates only suggestions and closes any active exact_email link', async () => {
    const accId = 'account:slack:50';
    // Initially Omar owns shared@acme.com uniquely
    await autoLink(
      [{ id: accId, email: 'shared@acme.com', displayName: 'Shared', isBot: false }],
      [{ personId: 'person:omar@acme.com', emails: ['shared@acme.com'], displayName: 'Omar' }],
      repo
    );
    expect(await repo.listActive()).toHaveLength(1);

    // Now directory has shared@acme.com on BOTH Omar and Maya
    const ambiguousDir: AutoLinkDirectoryInput[] = [
      { personId: 'person:omar@acme.com', emails: ['shared@acme.com'], displayName: 'Omar Farooq' },
      { personId: 'person:maya@acme.com', emails: ['SHARED@acme.com'], displayName: 'Maya Lin' },
    ];

    const stats = await autoLink(
      [{ id: accId, email: 'shared@acme.com', displayName: 'Shared', isBot: false }],
      ambiguousDir,
      repo
    );
    expect(stats).toEqual({ created: 0, closed: 1, suggested: 2 });

    // Rule 7: suggestion is never active for attribution
    expect(await repo.listActive()).toHaveLength(0);

    const suggestions = await repo.listActiveSuggestions();
    expect(suggestions).toHaveLength(2);
    expect(suggestions.map((s) => s.personId).sort()).toEqual([
      'person:maya@acme.com',
      'person:omar@acme.com',
    ]);
    for (const s of suggestions) {
      expect(s.grade).toBe('inferred');
      expect(s.method).toBe('suggested');
      expect(s.note).toBeTruthy();
    }

    // Re-running is idempotent
    const rerun = await autoLink(
      [{ id: accId, email: 'shared@acme.com', displayName: 'Shared', isBot: false }],
      ambiguousDir,
      repo
    );
    expect(rerun).toEqual({ created: 0, closed: 0, suggested: 0 });
  });

  it('6. bot account is never linked (isBot flag or service account pattern) and closes prior non-admin links', async () => {
    // Seed prior exact_email and suggested links for two accounts that become bots
    await repo.create({
      accountId: 'account:n8n:bot_flag',
      personId: 'person:omar@acme.com',
      grade: 'stated',
      method: 'exact_email',
      linkedBy: 'autoLink',
      note: null,
    });
    await repo.create({
      accountId: 'account:n8n:bot_pattern',
      personId: 'person:maya@acme.com',
      grade: 'inferred',
      method: 'suggested',
      linkedBy: 'autoLink',
      note: 'Prior suggestion',
    });

    const accounts: AutoLinkAccountInput[] = [
      { id: 'account:n8n:bot_flag', email: 'omar@acme.com', displayName: 'Omar', isBot: true },
      { id: 'account:n8n:bot_pattern', email: 'svc-deploy@acme.com', displayName: 'Deploy Bot', isBot: false },
      { id: 'account:n8n:bot_new', email: 'noreply@acme.com', displayName: 'Automated Runner', isBot: false },
    ];

    const stats = await autoLink(accounts, directory, repo);
    expect(stats).toEqual({ created: 0, closed: 2, suggested: 0 });
    expect(await repo.listAllOpen()).toHaveLength(0);
  });

  it('7. suggestion is never active for attribution (listActive excludes suggested, listActiveSuggestions includes)', async () => {
    const accounts: AutoLinkAccountInput[] = [
      { id: 'account:n8n:exact', email: 'omar@acme.com', displayName: 'Omar Farooq', isBot: false },
      { id: 'account:github:sugg', email: 'sara.c@personal.dev', displayName: 'Sara Chen', isBot: false },
    ];

    await autoLink(accounts, directory, repo);

    const active = await repo.listActive();
    expect(active).toHaveLength(1);
    expect(active[0].accountId).toBe('account:n8n:exact');

    const suggestions = await repo.listActiveSuggestions();
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].accountId).toBe('account:github:sugg');
    expect(suggestions[0].personId).toBe('person:sarah@acme.com');
    expect(suggestions[0].grade).toBe('inferred');
    expect(suggestions[0].method).toBe('suggested');
  });

  it('8. name similarity >= 0.85 creates inferred/suggested link idempotently, ignores < 0.85, and closes stale suggestions', async () => {
    const accounts: AutoLinkAccountInput[] = [
      { id: 'account:github:close_name', email: 'sarah.personal@gmail.com', displayName: 'Sara Chen', isBot: false },
      { id: 'account:github:far_name', email: 'bob@gmail.com', displayName: 'Bob Zephyr', isBot: false },
    ];

    const first = await autoLink(accounts, directory, repo);
    expect(first).toEqual({ created: 0, closed: 0, suggested: 1 });
    expect(await repo.listActive()).toHaveLength(0);

    const sugg1 = await repo.listActiveSuggestions();
    expect(sugg1).toHaveLength(1);
    expect(sugg1[0]).toMatchObject({
      accountId: 'account:github:close_name',
      personId: 'person:sarah@acme.com',
      grade: 'inferred',
      method: 'suggested',
    });

    // Repeated run is idempotent
    const second = await autoLink(accounts, directory, repo);
    expect(second).toEqual({ created: 0, closed: 0, suggested: 0 });
    expect(await repo.listActiveSuggestions()).toHaveLength(1);

    // If account's email later resolves uniquely, stale suggestion is closed and exact_email is created
    const resolved = await autoLink(
      [{ id: 'account:github:close_name', email: 'sarah.chen@acme.com', displayName: 'Sara Chen', isBot: false }],
      directory,
      repo
    );
    expect(resolved).toEqual({ created: 1, closed: 1, suggested: 0 });
    expect(await repo.listActiveSuggestions()).toHaveLength(0);
    expect(await repo.listActive()).toHaveLength(1);

    // Repeating exact_email link is idempotent
    const exactRepeat = await autoLink(
      [{ id: 'account:github:close_name', email: 'sarah.chen@acme.com', displayName: 'Sara Chen', isBot: false }],
      directory,
      repo
    );
    expect(exactRepeat).toEqual({ created: 0, closed: 0, suggested: 0 });
  });

  it('9. deduplicates directory emails per person and closes stale name suggestions when name diverges', async () => {
    const dupDir: AutoLinkDirectoryInput[] = [
      {
        personId: 'person:omar@acme.com',
        emails: ['Omar@acme.com', 'omar@acme.com', 'O.FAROOQ@ACME.COM'],
        displayName: 'Omar Farooq',
      },
    ];

    const exact = await autoLink(
      [{ id: 'account:n8n:dup_email', email: 'omar@acme.com', displayName: 'Omar', isBot: false }],
      dupDir,
      repo
    );
    expect(exact).toEqual({ created: 1, closed: 0, suggested: 0 });
    expect(await repo.listActive()).toHaveLength(1);
    expect(await repo.listActiveSuggestions()).toHaveLength(0);

    // Create a name-based suggestion, then change name so similarity drops < 0.85
    const sugg = await autoLink(
      [{ id: 'account:github:diverge', email: 'unknown@external.dev', displayName: 'Omar Farooq', isBot: false }],
      dupDir,
      repo
    );
    expect(sugg).toEqual({ created: 0, closed: 0, suggested: 1 });
    expect(await repo.listActiveSuggestions()).toHaveLength(1);

    const diverged = await autoLink(
      [{ id: 'account:github:diverge', email: 'unknown@external.dev', displayName: 'Zelda Moon', isBot: false }],
      dupDir,
      repo
    );
    expect(diverged).toEqual({ created: 0, closed: 1, suggested: 0 });
    expect(await repo.listActiveSuggestions()).toHaveLength(0);
  });
});
