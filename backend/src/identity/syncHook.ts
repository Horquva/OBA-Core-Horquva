// =============================================================================
// Horquva Continuity Platform — Identity hygiene after a sync
// =============================================================================
// Accounts (`kind: 'account'`) from tools (n8n, OpenAI, Anthropic, etc.) are
// matched against the people the directory (Entra / Google) knows.
// - With no directory connected there is nothing to match against, so nothing
//   is queued (every account would be "unmatched").
// - Accounts with an active non-suggested IdentityLink or flagged/detected as
//   bots/service accounts are skipped.
// - Unmatched accounts and ambiguous/suggested-only accounts are queued once
//   so an admin's resolution (including "ignore") survives future syncs.
// =============================================================================

import type { CanonicalEntity, IdentityLink } from '@horquva/types';
import type { ContinuityGraph } from '../domain/graph/index.js';
import type { AutoLinkAccountInput, AutoLinkDirectoryInput } from './autoLink.js';
import { IdentityMatcher, type DirectoryPersonRecord, type MatchCandidate } from './matcher.js';
import type { IdentityQueueService } from './queue.js';

const isDirectoryPerson = (e: CanonicalEntity): boolean =>
  Boolean(e.externalRefs?.entraId || e.externalRefs?.googleId);

function primaryEmailOf(e: CanonicalEntity): string {
  const emailRef =
    typeof e.externalRefs?.email === 'string' ? e.externalRefs.email.trim() : '';
  if (emailRef) return emailRef;

  const primaryRef =
    typeof e.externalRefs?.primaryEmail === 'string' ? e.externalRefs.primaryEmail.trim() : '';
  if (primaryRef) return primaryRef;

  const stripped = e.id.replace(/^person:/, '');
  if (
    stripped.includes('@') &&
    !stripped.startsWith('entra:') &&
    !stripped.startsWith('google:')
  ) {
    return stripped;
  }
  return '';
}

function parseEmailAliases(raw: unknown, primaryEmail: string): string[] {
  if (raw === undefined || raw === null) return [];

  let items: unknown[] = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        items = Array.isArray(parsed) ? parsed : trimmed.split(',');
      } catch {
        items = trimmed.split(',');
      }
    } else {
      items = trimmed.split(',');
    }
  } else {
    return [];
  }

  const primaryLower = primaryEmail.trim().toLowerCase();
  const seen = new Set<string>();
  const aliases: string[] = [];

  for (const entry of items) {
    if (typeof entry !== 'string') continue;
    const normalized = entry.trim().toLowerCase();
    if (!normalized || normalized === primaryLower || seen.has(normalized)) continue;
    seen.add(normalized);
    aliases.push(normalized);
  }

  return aliases;
}

function accountEmailOf(e: CanonicalEntity): string | undefined {
  const emailRef =
    typeof e.externalRefs?.email === 'string' ? e.externalRefs.email.trim() : '';
  if (emailRef) return emailRef;

  const primaryRef =
    typeof e.externalRefs?.primaryEmail === 'string' ? e.externalRefs.primaryEmail.trim() : '';
  if (primaryRef) return primaryRef;

  return undefined;
}

function accountSourceOf(e: CanonicalEntity): string {
  const refSource =
    typeof e.externalRefs?.source === 'string' ? e.externalRefs.source.trim() : '';
  if (refSource) return refSource;

  if (e.id.startsWith('account:')) {
    const segment = e.id.split(':')[1]?.trim();
    if (segment) return segment;
  }
  return 'unknown';
}

export function directoryFrom(graph: ContinuityGraph): DirectoryPersonRecord[] {
  return graph
    .getAllNodes()
    .filter((n) => n.entity.kind === 'person' && isDirectoryPerson(n.entity))
    .map((n) => {
      const primaryEmail = primaryEmailOf(n.entity);
      const aliases = parseEmailAliases(
        (n.entity.externalRefs as Record<string, unknown> | undefined)?.emails,
        primaryEmail
      );
      return {
        id: n.entity.id,
        primaryEmail,
        displayName: n.entity.name,
        aliases,
        status: n.facts.get('status')?.value === 'departed' ? 'departed' : 'active',
      };
    });
}

export function directoryInputsFrom(graph: ContinuityGraph): AutoLinkDirectoryInput[] {
  return directoryFrom(graph).map((d) => ({
    personId: d.id,
    emails: [d.primaryEmail, ...(d.aliases ?? [])].filter(Boolean),
    displayName: d.displayName,
  }));
}

/** Structural tool accounts in one sync's entities (`kind === 'account'`). */
export function toolAccounts(entities: CanonicalEntity[]): MatchCandidate[] {
  const out: MatchCandidate[] = [];
  for (const e of entities) {
    if (e.kind !== 'account') continue;
    out.push({
      source: accountSourceOf(e),
      externalAccountId: e.id,
      email: accountEmailOf(e),
      displayName: e.name,
    });
  }
  return out;
}

export function autoLinkAccountsFrom(entities: CanonicalEntity[]): AutoLinkAccountInput[] {
  const out: AutoLinkAccountInput[] = [];
  for (const e of entities) {
    if (e.kind !== 'account') continue;
    const email = accountEmailOf(e) ?? null;
    const isBot =
      e.externalRefs?.isBot === 'true' ||
      IdentityMatcher.isServiceAccountPattern(email ?? '', e.name);
    out.push({
      id: e.id,
      email,
      displayName: e.name,
      isBot,
    });
  }
  return out;
}

/**
 * Queues the tool accounts from `entities` that do not have an active
 * non-suggested IdentityLink (or directory match when `activeLinks` is omitted).
 * Bots/service accounts are skipped; ambiguous/suggested-only accounts are queued.
 * Returns how many new queue items were created.
 */
export async function queueUnmatchedAccounts(
  entities: CanonicalEntity[],
  graph: ContinuityGraph,
  queue: IdentityQueueService,
  activeLinks?: IdentityLink[]
): Promise<number> {
  const directory = directoryFrom(graph);
  if (directory.length === 0) return 0;

  const candidates = toolAccounts(entities);
  if (candidates.length === 0) return 0;

  const linkedAccountIds = new Set(
    (activeLinks ?? [])
      .filter((l) => l.validTo === null && l.method !== 'suggested')
      .map((l) => l.accountId)
  );

  const botAccountIds = new Set(
    autoLinkAccountsFrom(entities)
      .filter((a) => a.isBot)
      .map((a) => a.id)
  );

  const known = new Set<string>();
  for (const source of new Set(candidates.map((c) => c.source))) {
    for (const item of await queue.listQueue({ source })) {
      known.add(`${item.source}:${item.externalAccountId}`);
    }
  }

  let matcher: IdentityMatcher | null = null;
  const emailOwners = new Map<string, Set<string>>();
  if (activeLinks === undefined) {
    matcher = new IdentityMatcher(directory);
    for (const person of directory) {
      for (const rawEmail of [person.primaryEmail, ...(person.aliases ?? [])]) {
        const norm = IdentityMatcher.normalizeEmail(rawEmail);
        if (!norm) continue;
        let owners = emailOwners.get(norm);
        if (!owners) {
          owners = new Set<string>();
          emailOwners.set(norm, owners);
        }
        owners.add(person.id);
      }
    }
  }

  let queued = 0;
  for (const candidate of candidates) {
    const key = `${candidate.source}:${candidate.externalAccountId}`;
    if (known.has(key)) continue;

    if (
      botAccountIds.has(candidate.externalAccountId) ||
      IdentityMatcher.isServiceAccountPattern(candidate.email ?? '', candidate.displayName)
    ) {
      continue;
    }

    if (linkedAccountIds.has(candidate.externalAccountId)) continue;

    if (activeLinks === undefined && matcher) {
      const normEmail = candidate.email ? IdentityMatcher.normalizeEmail(candidate.email) : '';
      const ownerCount = normEmail ? (emailOwners.get(normEmail)?.size ?? 0) : 0;
      const { matchType } = matcher.match(candidate);
      if (
        (matchType === 'exact_email' ||
          matchType === 'alias' ||
          matchType === 'service_account') &&
        ownerCount < 2
      ) {
        continue;
      }
    }

    await queue.enqueueUnmatched(candidate);
    known.add(key);
    queued++;
  }

  return queued;
}
