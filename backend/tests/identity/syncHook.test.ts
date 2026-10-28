import { describe, it, expect } from 'vitest';
import type { CanonicalEntity, CanonicalFact } from '@horquva/types';
import { ContinuityGraph } from '../../src/domain/graph/index.js';
import { IdentityQueueService, InMemoryIdentityQueueAdapter } from '../../src/identity/queue.js';
import { queueUnmatchedAccounts, toolAccounts } from '../../src/identity/syncHook.js';

const person = (email: string, name: string, externalRefs: Record<string, string>): CanonicalEntity => ({
  id: `person:${email}`, kind: 'person', name, externalRefs: { email, ...externalRefs }, createdAt: new Date(), updatedAt: new Date(),
});
const status = (email: string, value: string): CanonicalFact => ({ entityId: `person:${email}`, attribute: 'status', value, grade: 'stated', source: 'connector:entra', validFrom: new Date() });

const omarDirectory = person('omar@acme.com', 'Omar Farooq', { entraId: 'e-omar' });
const mayaDirectory = person('maya@acme.com', 'Maya Chen', { googleId: 'g-maya' });

function setup(directory: CanonicalEntity[]) {
  const graph = ContinuityGraph.fromSnapshot(directory, [], directory.map((d) => status(d.id.slice(7), 'active')));
  const queue = new IdentityQueueService(new InMemoryIdentityQueueAdapter());
  return { graph, queue };
}

describe('identity hygiene after a sync', () => {
  const synced = [
    person('omar@acme.com', 'omar', { n8nUserId: 'u1' }), // same email as the Entra person
    person('nadia@gmail.com', 'Nadia', { n8nUserId: 'u2' }), // nobody in the directory
    person('maya@other.org', 'Maya', { openaiUserId: 'user-m' }), // username only: a guess
    person('svc-billing@acme.com', 'Billing bot', { n8nUserId: 'u3' }), // a service account
  ];

  it('queues accounts with no settled directory match, including username-only guesses', async () => {
    const { graph, queue } = setup([omarDirectory, mayaDirectory]);
    expect(await queueUnmatchedAccounts(synced, graph, queue)).toBe(2);
    const items = await queue.listQueue();
    expect(items.map((i) => [i.source, i.externalAccountId]).sort()).toEqual([['n8n', 'u2'], ['openai', 'user-m']]);
  });

  it('queues each account once, even after an admin resolves it', async () => {
    const { graph, queue } = setup([omarDirectory]);
    await queueUnmatchedAccounts(synced, graph, queue);
    const nadia = (await queue.listQueue()).find((i) => i.externalAccountId === 'u2')!;
    await queue.resolveIgnore(nadia.id, 'user:admin');
    expect(await queueUnmatchedAccounts(synced, graph, queue)).toBe(0);
  });

  it('queues nothing when no directory is connected', async () => {
    const { graph, queue } = setup([]);
    expect(await queueUnmatchedAccounts(synced, graph, queue)).toBe(0);
  });

  it('never treats a directory person as a tool account', () => {
    expect(toolAccounts([omarDirectory, person('chen@acme.com', 'Chen', { entraId: 'e-chen', n8nUserId: 'u9' })])).toEqual([]);
  });
});
