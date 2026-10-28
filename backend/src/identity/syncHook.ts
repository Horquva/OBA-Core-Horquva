// =============================================================================
// Horquva Continuity Platform — Identity hygiene after a sync
// =============================================================================
// Accounts from tools (n8n, OpenAI, Anthropic) are matched against the people
// the directory (Entra / Google) knows. Accounts nobody in the directory
// matches go to the identity review queue, where an admin links them, marks
// them a service account or ignores them.
// - With no directory connected there is nothing to match against, so nothing
//   is queued (every account would be "unmatched").
// - An account already in the queue, in any state, is not queued again: an
//   admin's "ignore" must survive the next hourly sync.
// =============================================================================

import type { CanonicalEntity } from '@horquva/types';
import type { ContinuityGraph } from '../domain/graph/index.js';
import { IdentityMatcher, type DirectoryPersonRecord, type MatchCandidate } from './matcher.js';
import type { IdentityQueueService } from './queue.js';

/** externalRefs key → queue source, for accounts that come from a tool. */
const TOOL_ACCOUNT_REFS: Array<[ref: string, source: string]> = [
  ['n8nUserId', 'n8n'],
  ['openaiUserId', 'openai'],
  ['anthropicUserId', 'anthropic'],
];

const isDirectoryPerson = (e: CanonicalEntity) => Boolean(e.externalRefs?.entraId || e.externalRefs?.googleId);
const emailOf = (e: CanonicalEntity) => e.externalRefs?.email || e.externalRefs?.primaryEmail || e.id.replace(/^person:/, '');

export function directoryFrom(graph: ContinuityGraph): DirectoryPersonRecord[] {
  return graph
    .getAllNodes()
    .filter((n) => n.entity.kind === 'person' && isDirectoryPerson(n.entity))
    .map((n) => ({
      id: n.entity.id,
      primaryEmail: emailOf(n.entity),
      displayName: n.entity.name,
      status: n.facts.get('status')?.value === 'departed' ? 'departed' : 'active',
    }));
}

/** The tool accounts in one sync's entities. A directory person is never a candidate. */
export function toolAccounts(entities: CanonicalEntity[]): MatchCandidate[] {
  const out: MatchCandidate[] = [];
  for (const e of entities) {
    if (e.kind !== 'person' || isDirectoryPerson(e)) continue;
    for (const [ref, source] of TOOL_ACCOUNT_REFS) {
      const id = e.externalRefs?.[ref];
      if (id) out.push({ source, externalAccountId: String(id), email: emailOf(e), displayName: e.name });
    }
  }
  return out;
}

/**
 * Queues the tool accounts from `entities` that no directory person matches.
 * `graph` is the hydrated graph after the sync, so the directory includes
 * every directory connection, not just this one. Returns how many were queued.
 */
export async function queueUnmatchedAccounts(entities: CanonicalEntity[], graph: ContinuityGraph, queue: IdentityQueueService): Promise<number> {
  const directory = directoryFrom(graph);
  if (directory.length === 0) return 0;
  const candidates = toolAccounts(entities);
  if (candidates.length === 0) return 0;

  const matcher = new IdentityMatcher(directory);
  const known = new Set<string>();
  for (const source of new Set(candidates.map((c) => c.source))) {
    for (const item of await queue.listQueue({ source })) known.add(`${item.source}:${item.externalAccountId}`);
  }

  let queued = 0;
  for (const candidate of candidates) {
    if (known.has(`${candidate.source}:${candidate.externalAccountId}`)) continue;
    // Settled: the same email (or a known alias) as a directory person, or a
    // service account by its name. A username-only match ("omar@gmail.com" vs
    // "omar@acme.com") is a guess, so it is queued and the queue suggests it.
    const { matchType } = matcher.match(candidate);
    if (matchType === 'exact_email' || matchType === 'alias' || matchType === 'service_account') continue;
    await queue.enqueueUnmatched(candidate);
    known.add(`${candidate.source}:${candidate.externalAccountId}`);
    queued++;
  }
  return queued;
}
