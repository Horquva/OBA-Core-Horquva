import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import type { CanonicalEntity, CanonicalFact, IdentityLink } from '@horquva/types';
import { ContinuityGraph } from '../../src/domain/graph/index.js';
import { autoLink } from '../../src/identity/autoLink.js';
import { InMemoryLinkRepository } from '../../src/identity/linkRepository.js';
import { IdentityQueueService, InMemoryIdentityQueueAdapter } from '../../src/identity/queue.js';
import { DataService } from '../../src/services/dataService.js';
import {
  autoLinkAccountsFrom,
  directoryFrom,
  directoryInputsFrom,
  queueUnmatchedAccounts,
  toolAccounts,
} from '../../src/identity/syncHook.js';

const now = new Date('2026-11-01T00:00:00Z');

const person = (
  id: string,
  name: string,
  externalRefs: Record<string, unknown>
): CanonicalEntity => ({
  id,
  kind: 'person',
  name,
  externalRefs: externalRefs as Record<string, string>,
  createdAt: now,
  updatedAt: now,
});

const account = (
  id: string,
  name: string,
  externalRefs: Record<string, unknown> = {}
): CanonicalEntity => ({
  id,
  kind: 'account',
  name,
  externalRefs: externalRefs as Record<string, string>,
  createdAt: now,
  updatedAt: now,
});

const status = (entityId: string, value: string): CanonicalFact => ({
  entityId,
  attribute: 'status',
  value,
  grade: 'stated',
  source: 'connector:entra',
  validFrom: now,
});

const omarDirectory = person('person:entra:e-omar', 'Omar Farooq', {
  entraId: 'e-omar',
  email: 'omar@acme.com',
  emails: JSON.stringify(['Omar.F@acme.com', 'o.farooq@acme.com', 'omar@acme.com', '']),
});

const mayaDirectory = person('person:google:g-maya', 'Maya Chen', {
  googleId: 'g-maya',
  primaryEmail: 'maya@acme.com',
  emails: 'Maya.C@acme.com, m.chen@acme.com, maya@acme.com',
});

function setup(directory: CanonicalEntity[], extraEntities: CanonicalEntity[] = []) {
  const all = [...directory, ...extraEntities];
  const graph = ContinuityGraph.fromSnapshot(
    all,
    [],
    directory.map((d) => status(d.id, 'active'))
  );
  const queue = new IdentityQueueService(new InMemoryIdentityQueueAdapter());
  return { graph, queue };
}

describe('identity hygiene after a sync (structural account hook)', () => {
  const synced: CanonicalEntity[] = [
    account('account:n8n:u1', 'omar', { source: 'n8n', email: 'omar@acme.com' }),
    account('account:n8n:u2', 'Nadia', { source: 'n8n', email: 'nadia@gmail.com' }),
    account('account:openai:user-m', 'Maya', { source: 'openai', email: 'maya@other.org' }),
    account('account:n8n:u3', 'Billing bot', { source: 'n8n', email: 'svc-billing@acme.com' }),
    account('account:slack:u4', 'Deploy Runner', { isBot: 'true', email: 'deploy@acme.com' }),
  ];

  it('removes legacy hardcoded tool-ref mapping from syncHook.ts', () => {
    const syncHookPath = fileURLToPath(new URL('../../src/identity/syncHook.ts', import.meta.url));
    const src = fs.readFileSync(syncHookPath, 'utf8');
    expect(src).not.toContain('TOOL_ACCOUNT_' + 'REFS');
  });

  it('extracts directoryFrom with primaryEmail and deduplicated lowercased aliases from externalRefs.emails', () => {
    const arrayAliasPerson = person('person:entra:e-zoe', 'Zoe Kim', {
      entraId: 'e-zoe',
      email: 'zoe@acme.com',
      emails: ['Z.Kim@acme.com', 'zoe@acme.com', ''] as unknown as string,
    });
    const noEmailEntraPerson = person('person:entra:e-no-email', 'No Email', {
      entraId: 'e-no-email',
    });
    const legacyEmailIdPerson = person('person:lee@acme.com', 'Lee Park', {
      entraId: 'e-lee',
    });
    const nonDirectoryPerson = person('person:csv@acme.com', 'CSV Only', {
      email: 'csv@acme.com',
    });

    const { graph } = setup([
      omarDirectory,
      mayaDirectory,
      arrayAliasPerson,
      noEmailEntraPerson,
      legacyEmailIdPerson,
      nonDirectoryPerson,
    ]);
    // Ensure nonDirectoryPerson does not have entraId/googleId
    const records = directoryFrom(graph);
    expect(records.map((r) => r.id)).toEqual([
      'person:entra:e-omar',
      'person:google:g-maya',
      'person:entra:e-zoe',
      'person:entra:e-no-email',
      'person:lee@acme.com',
    ]);

    expect(records.find((r) => r.id === 'person:entra:e-omar')).toMatchObject({
      primaryEmail: 'omar@acme.com',
      aliases: ['omar.f@acme.com', 'o.farooq@acme.com'],
      status: 'active',
    });
    expect(records.find((r) => r.id === 'person:google:g-maya')).toMatchObject({
      primaryEmail: 'maya@acme.com',
      aliases: ['maya.c@acme.com', 'm.chen@acme.com'],
    });
    expect(records.find((r) => r.id === 'person:entra:e-zoe')).toMatchObject({
      primaryEmail: 'zoe@acme.com',
      aliases: ['z.kim@acme.com'],
    });
    expect(records.find((r) => r.id === 'person:entra:e-no-email')?.primaryEmail).toBe('');
    expect(records.find((r) => r.id === 'person:lee@acme.com')?.primaryEmail).toBe('lee@acme.com');

    expect(directoryInputsFrom(graph)).toContainEqual({
      personId: 'person:entra:e-omar',
      emails: ['omar@acme.com', 'omar.f@acme.com', 'o.farooq@acme.com'],
      displayName: 'Omar Farooq',
    });
  });

  it('extracts toolAccounts and autoLinkAccountsFrom structurally from kind=account entities', () => {
    const legacyPersonWithRef = person('person:chen@acme.com', 'Chen', {
      entraId: 'e-chen',
      n8nUserId: 'u9',
    });
    const nonDirPersonWithRef = person('person:dev@acme.com', 'Dev', {
      n8nUserId: 'u10',
      email: 'dev@acme.com',
    });

    expect(toolAccounts([omarDirectory, legacyPersonWithRef, nonDirPersonWithRef])).toEqual([]);

    const candidates = toolAccounts(synced);
    expect(candidates).toEqual([
      { source: 'n8n', externalAccountId: 'account:n8n:u1', email: 'omar@acme.com', displayName: 'omar' },
      { source: 'n8n', externalAccountId: 'account:n8n:u2', email: 'nadia@gmail.com', displayName: 'Nadia' },
      { source: 'openai', externalAccountId: 'account:openai:user-m', email: 'maya@other.org', displayName: 'Maya' },
      { source: 'n8n', externalAccountId: 'account:n8n:u3', email: 'svc-billing@acme.com', displayName: 'Billing bot' },
      { source: 'slack', externalAccountId: 'account:slack:u4', email: 'deploy@acme.com', displayName: 'Deploy Runner' },
    ]);

    expect(autoLinkAccountsFrom([omarDirectory, ...synced])).toEqual([
      { id: 'account:n8n:u1', email: 'omar@acme.com', displayName: 'omar', isBot: false },
      { id: 'account:n8n:u2', email: 'nadia@gmail.com', displayName: 'Nadia', isBot: false },
      { id: 'account:openai:user-m', email: 'maya@other.org', displayName: 'Maya', isBot: false },
      { id: 'account:n8n:u3', email: 'svc-billing@acme.com', displayName: 'Billing bot', isBot: true },
      { id: 'account:slack:u4', email: 'deploy@acme.com', displayName: 'Deploy Runner', isBot: true },
    ]);
  });

  it('skips bots and activeLinks while queuing unmatched and suggested-only accounts', async () => {
    const { graph, queue } = setup([omarDirectory, mayaDirectory]);

    const activeLinks: IdentityLink[] = [
      {
        id: 'link-1',
        accountId: 'account:n8n:u1',
        personId: 'person:entra:e-omar',
        grade: 'stated',
        method: 'exact_email',
        linkedBy: 'autoLink',
        note: 'Exact email',
        validFrom: now,
        validTo: null,
      },
      {
        id: 'link-sugg',
        accountId: 'account:openai:user-m',
        personId: 'person:google:g-maya',
        grade: 'inferred',
        method: 'suggested',
        linkedBy: 'autoLink',
        note: 'Name similarity',
        validFrom: now,
        validTo: null,
      },
    ];

    expect(await queueUnmatchedAccounts(synced, graph, queue, activeLinks)).toBe(2);
    const items = await queue.listQueue();
    expect(items.map((i) => [i.source, i.externalAccountId]).sort()).toEqual([
      ['n8n', 'account:n8n:u2'],
      ['openai', 'account:openai:user-m'],
    ]);
  });

  it('queues accounts with ambiguous emails even without activeLinks passed', async () => {
    const sharedA = person('person:entra:a', 'Alice One', { entraId: 'e-a', email: 'shared@acme.com' });
    const sharedB = person('person:entra:b', 'Alice Two', { entraId: 'e-b', email: 'shared@acme.com' });
    const aliasMatch = account('account:n8n:alias1', 'Omar Alias', {
      source: 'n8n',
      email: 'o.farooq@acme.com',
    });
    const ambiguous = account('account:n8n:ambig1', 'Shared User', {
      source: 'n8n',
      email: 'shared@acme.com',
    });

    const { graph, queue } = setup([omarDirectory, sharedA, sharedB]);
    expect(await queueUnmatchedAccounts([aliasMatch, ambiguous], graph, queue)).toBe(1);
    const items = await queue.listQueue();
    expect(items.map((i) => i.externalAccountId)).toEqual(['account:n8n:ambig1']);
  });

  it('queues each account once, even after an admin resolves it', async () => {
    const { graph, queue } = setup([omarDirectory]);
    await queueUnmatchedAccounts(synced, graph, queue);
    const nadia = (await queue.listQueue()).find((i) => i.externalAccountId === 'account:n8n:u2')!;
    await queue.resolveIgnore(nadia.id, 'user:admin');
    expect(await queueUnmatchedAccounts(synced, graph, queue)).toBe(0);
  });

  it('queues nothing when no directory is connected', async () => {
    const { graph, queue } = setup([]);
    expect(await queueUnmatchedAccounts(synced, graph, queue)).toBe(0);
  });

  it('wires DataService.getLinkRepository() with InMemoryLinkRepository and runs autoLink -> queue pipeline cleanly', async () => {
    DataService.useInitialStateProvider(null);
    const ds1 = DataService.resetInstance();
    const repo1 = ds1.getLinkRepository();
    expect(repo1).toBeInstanceOf(InMemoryLinkRepository);

    const sharedA = person('person:entra:a', 'Alice One', { entraId: 'e-a', email: 'shared@acme.com' });
    const sharedB = person('person:entra:b', 'Alice Two', { entraId: 'e-b', email: 'shared@acme.com' });
    const graph = ds1.getGraph();
    graph.addEntity(omarDirectory, [status(omarDirectory.id, 'active')]);
    graph.addEntity(sharedA, [status(sharedA.id, 'active')]);
    graph.addEntity(sharedB, [status(sharedB.id, 'active')]);

    const batch: CanonicalEntity[] = [
      account('account:n8n:u1', 'omar', { source: 'n8n', email: 'o.farooq@acme.com' }),
      account('account:openai:amb', 'Shared', { source: 'openai', email: 'shared@acme.com' }),
      account('account:n8n:u2', 'Nadia', { source: 'n8n', email: 'nadia@gmail.com' }),
      account('account:n8n:u3', 'Billing bot', { source: 'n8n', email: 'svc-billing@acme.com' }),
    ];

    const stats = await autoLink(autoLinkAccountsFrom(batch), directoryInputsFrom(graph), repo1);
    expect(stats).toEqual({ created: 1, closed: 0, suggested: 2 });

    const activeLinks = await repo1.listActive();
    expect(await queueUnmatchedAccounts(batch, graph, ds1.getQueueService(), activeLinks)).toBe(2);
    const queuedIds = (await ds1.getQueueService().listQueue()).map((q) => q.externalAccountId).sort();
    expect(queuedIds).toEqual(['account:n8n:u2', 'account:openai:amb']);

    const ds2 = DataService.resetInstance();
    expect(ds2.getLinkRepository()).not.toBe(repo1);
    expect(await ds2.getLinkRepository().listActive()).toEqual([]);
  });

  it('skips canonical accounts when identity_queue has pre-2.5 pending or ignored rows keyed by raw platform ID', async () => {
    const { graph, queue } = setup([omarDirectory]);

    // Pre-2.5 pending row with raw platform ID 'u2'
    await queue.enqueueUnmatched({
      source: 'n8n',
      externalAccountId: 'u2',
      email: 'nadia@gmail.com',
      displayName: 'Nadia',
    });
    // Pre-2.5 ignored row with raw platform ID 'ext_usr_9921'
    const ignoredLegacy = await queue.enqueueUnmatched({
      source: 'openai',
      externalAccountId: 'ext_usr_9921',
      email: 'legacy@other.org',
      displayName: 'Legacy User',
    });
    await queue.resolveIgnore(ignoredLegacy.id, 'user:admin');

    // Pre-2.5 ignored row with raw n8nUserId 'u_raw_99'
    const ignoredN8n = await queue.enqueueUnmatched({
      source: 'n8n',
      externalAccountId: 'u_raw_99',
      email: 'raw99@gmail.com',
      displayName: 'Raw 99',
    });
    await queue.resolveIgnore(ignoredN8n.id, 'user:admin');

    const incoming: CanonicalEntity[] = [
      account('account:n8n:u2', 'Nadia', { source: 'n8n', email: 'nadia@gmail.com' }),
      account('account:openai:ext_usr_9921', 'Legacy User', {
        source: 'openai',
        externalId: 'ext_usr_9921',
        email: 'legacy@other.org',
      }),
      account('account:n8n:canon-99', 'Raw 99', {
        source: 'n8n',
        n8nUserId: 'u_raw_99',
        email: 'raw99@gmail.com',
      }),
      account('account:openai:canon-77', 'External 77', {
        source: 'openai',
        externalId: 'ext_usr_9921',
        email: 'ext77@other.org',
      }),
    ];

    expect(await queueUnmatchedAccounts(incoming, graph, queue)).toBe(0);
    expect(await queue.listQueue()).toHaveLength(3);
  });

  it('treats runtime JSON boolean isBot: true (and string "true") as bot in autoLinkAccountsFrom, autoLink, and queueUnmatchedAccounts', async () => {
    const { graph, queue } = setup([omarDirectory]);
    const repo = new InMemoryLinkRepository();

    const boolBot = account('account:slack:bot-bool', 'Deploy Runner', {
      source: 'slack',
      isBot: true,
      email: 'omar@acme.com',
    });
    const strBot = account('account:slack:bot-str', 'CI Runner', {
      source: 'slack',
      isBot: 'true',
      email: 'omar@acme.com',
    });

    const inputs = autoLinkAccountsFrom([boolBot, strBot]);
    expect(inputs).toEqual([
      { id: 'account:slack:bot-bool', email: 'omar@acme.com', displayName: 'Deploy Runner', isBot: true },
      { id: 'account:slack:bot-str', email: 'omar@acme.com', displayName: 'CI Runner', isBot: true },
    ]);

    const stats = await autoLink(inputs, directoryInputsFrom(graph), repo);
    expect(stats).toEqual({ created: 0, closed: 0, suggested: 0 });
    expect(await repo.listActive()).toEqual([]);

    expect(await queueUnmatchedAccounts([boolBot, strBot], graph, queue, [])).toBe(0);
    expect(await queue.listQueue()).toEqual([]);
  });

  it('returns empty aliases when externalRefs.emails is malformed [-prefixed JSON, null, or undefined', () => {
    const malformedOne = person('person:entra:e-bad1', 'Bad One', {
      entraId: 'e-bad1',
      email: 'bad1@acme.com',
      emails: '[broken',
    });
    const malformedTwo = person('person:entra:e-bad2', 'Bad Two', {
      entraId: 'e-bad2',
      email: 'bad2@acme.com',
      emails: '["a@acme.com", bad',
    });
    const nullEmails = person('person:entra:e-null', 'Null Emails', {
      entraId: 'e-null',
      email: 'null@acme.com',
      emails: null,
    });
    const undefinedEmails = person('person:entra:e-undef', 'Undef Emails', {
      entraId: 'e-undef',
      email: 'undef@acme.com',
      emails: undefined,
    });

    const { graph } = setup([malformedOne, malformedTwo, nullEmails, undefinedEmails]);
    const records = directoryFrom(graph);

    expect(records.find((r) => r.id === 'person:entra:e-bad1')?.aliases).toEqual([]);
    expect(records.find((r) => r.id === 'person:entra:e-bad2')?.aliases).toEqual([]);
    expect(records.find((r) => r.id === 'person:entra:e-null')?.aliases).toEqual([]);
    expect(records.find((r) => r.id === 'person:entra:e-undef')?.aliases).toEqual([]);
  });

  it('guards person:google:<id> non-email IDs when email and primaryEmail are absent', () => {
    const noEmailGoogle = person('person:google:g-no-email', 'Google No Email', {
      googleId: 'g-no-email',
    });
    const { graph } = setup([noEmailGoogle]);
    const records = directoryFrom(graph);

    expect(records).toHaveLength(1);
    expect(records[0].primaryEmail).toBe('');
  });
});
