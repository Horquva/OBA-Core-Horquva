// =============================================================================
// Horquva Continuity Platform — Graded Automatic Identity Linking
// =============================================================================
// Reconciles external accounts against corporate directory records inside a
// single transaction, producing temporal `identity_link` rows with strict
// evidence grading:
//   - Unique exact/alias email match -> stated / exact_email
//   - Ambiguous email or >=0.85 display name similarity -> inferred / suggested
//   - Bot / service accounts -> never linked (closes prior non-admin links)
//   - Admin links (`admin_link`) -> never overridden or closed automatically
// =============================================================================

import type { IdentityLink } from '@horquva/types';
import { IdentityMatcher } from './matcher.js';
import { linkRepository, type LinkRepository } from './linkRepository.js';

export interface AutoLinkAccountInput {
  id: string;
  email: string | null;
  displayName?: string | null;
  isBot: boolean;
}

export interface AutoLinkDirectoryInput {
  personId: string;
  emails: string[];
  displayName?: string | null;
}

export interface AutoLinkStats {
  created: number;
  closed: number;
  suggested: number;
}

const NAME_SIMILARITY_THRESHOLD = 0.85;

function normalizeExactEmail(email: string | null | undefined): string {
  return email ? email.trim().toLowerCase() : '';
}

function normalizeDisplayName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes Jaro-Winkler similarity in [0, 1] on two normalized strings.
 */
function jaroWinkler(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const lenA = a.length;
  const lenB = b.length;
  const matchWindow = Math.max(0, Math.floor(Math.max(lenA, lenB) / 2) - 1);

  const aMatched = new Array<boolean>(lenA).fill(false);
  const bMatched = new Array<boolean>(lenB).fill(false);

  let matches = 0;
  for (let i = 0; i < lenA; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(lenB - 1, i + matchWindow);
    for (let j = start; j <= end; j++) {
      if (bMatched[j] || a[i] !== b[j]) continue;
      aMatched[i] = true;
      bMatched[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < lenA; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / lenA + matches / lenB + (matches - transpositions / 2) / matches) / 3;

  let prefix = 0;
  const maxPrefix = Math.min(4, lenA, lenB);
  while (prefix < maxPrefix && a[prefix] === b[prefix]) {
    prefix++;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

interface NormalizedDirectoryPerson {
  personId: string;
  displayName: string;
  normalizedName: string;
}

export async function autoLink(
  accounts: AutoLinkAccountInput[],
  directory: AutoLinkDirectoryInput[],
  repo: LinkRepository = linkRepository
): Promise<AutoLinkStats> {
  if (accounts.length === 0 || directory.length === 0) {
    return { created: 0, closed: 0, suggested: 0 };
  }

  return repo.runInTransaction(async (tx) => {
    const stats: AutoLinkStats = { created: 0, closed: 0, suggested: 0 };

    // Build deduplicated directory indexes first so blank-personId directories
    // short-circuit before loading or closing any links.
    const emailIndex = new Map<string, Map<string, NormalizedDirectoryPerson>>();
    const directoryPeople = new Map<string, NormalizedDirectoryPerson>();

    for (const entry of directory) {
      if (!entry.personId?.trim()) continue;

      let person = directoryPeople.get(entry.personId);
      const normName = normalizeDisplayName(entry.displayName);
      if (!person) {
        const displayName = entry.displayName?.trim() || entry.personId;
        person = {
          personId: entry.personId,
          displayName,
          normalizedName: normName,
        };
        directoryPeople.set(entry.personId, person);
      } else if (!person.normalizedName && normName) {
        person.displayName = entry.displayName!.trim();
        person.normalizedName = normName;
      }

      for (const rawEmail of entry.emails) {
        const normEmail = normalizeExactEmail(rawEmail);
        if (!normEmail) continue;
        let bucket = emailIndex.get(normEmail);
        if (!bucket) {
          bucket = new Map();
          emailIndex.set(normEmail, bucket);
        }
        bucket.set(person.personId, person);
      }
    }

    if (directoryPeople.size === 0) {
      return stats;
    }

    // Deduplicate and sort accounts deterministically by account.id so all
    // concurrent identity_link writers acquire advisory locks in identical order.
    const deduplicatedAccounts = new Map<string, AutoLinkAccountInput>();
    for (const account of accounts) {
      if (!deduplicatedAccounts.has(account.id)) {
        deduplicatedAccounts.set(account.id, account);
      }
    }
    const sortedAccounts = Array.from(deduplicatedAccounts.values()).sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    );
    const sortedAccountIds = sortedAccounts.map((a) => a.id);

    await tx.lockAccounts(sortedAccountIds);

    // Single query for all open links (zero N+1 queries)
    const openLinks = await tx.listAllOpen();

    const activeByAccount = new Map<string, IdentityLink>();
    const suggestionsByAccount = new Map<string, IdentityLink[]>();

    for (const link of openLinks) {
      if (link.method === 'suggested') {
        const list = suggestionsByAccount.get(link.accountId) ?? [];
        list.push(link);
        suggestionsByAccount.set(link.accountId, list);
      } else {
        activeByAccount.set(link.accountId, link);
      }
    }

    const uniqueDirectoryPeople = Array.from(directoryPeople.values());

    for (const account of sortedAccounts) {

      const activeLink = activeByAccount.get(account.id);
      const openSuggestions = suggestionsByAccount.get(account.id) ?? [];

      // Rule 3: Automatic match never overrides a confirmed admin_link
      if (activeLink?.method === 'admin_link') {
        continue;
      }

      // Rule 6: Bot / service accounts are never linked and close prior non-admin links
      const isBot =
        account.isBot ||
        IdentityMatcher.isServiceAccountPattern(
          account.email ?? '',
          account.displayName ?? undefined
        );

      if (isBot) {
        if (activeLink || openSuggestions.length > 0) {
          stats.closed += await tx.closeActiveByAccount(account.id, [
            'exact_email',
            'suggested',
          ]);
        }
        continue;
      }

      const normEmail = normalizeExactEmail(account.email);
      const emailMatches = normEmail
        ? Array.from(emailIndex.get(normEmail)?.values() ?? [])
        : [];

      // Rules 1 & 2: Unique exact or alias email match -> stated / exact_email
      if (emailMatches.length === 1) {
        const matched = emailMatches[0];

        if (openSuggestions.length > 0) {
          stats.closed += await tx.closeActiveByAccount(account.id, ['suggested']);
        }

        if (activeLink && activeLink.personId === matched.personId) {
          // Idempotent: exact_email link already points to the same person
          continue;
        }

        if (activeLink) {
          await tx.close(activeLink.id);
          stats.closed += 1;
        }

        await tx.create({
          accountId: account.id,
          personId: matched.personId,
          grade: 'stated',
          method: 'exact_email',
          linkedBy: 'autoLink',
          note: `Exact email match (${normEmail})`,
        });
        stats.created += 1;
        continue;
      }

      // Rule 5: Ambiguous email -> close exact_email link and emit only suggestions
      if (emailMatches.length > 1) {
        if (activeLink) {
          await tx.close(activeLink.id);
          stats.closed += 1;
        }

        const desiredByPerson = new Map<string, string>();
        const candidateIds = emailMatches.map((p) => p.personId).join(', ');
        for (const candidate of emailMatches) {
          desiredByPerson.set(
            candidate.personId,
            `Ambiguous email "${normEmail}" matches ${emailMatches.length} directory people (${candidateIds})`
          );
        }

        await reconcileSuggestions(tx, account.id, openSuggestions, desiredByPerson, stats);
        continue;
      }

      // Rule 4: Email changed to unknown or lost -> close prior automatic link
      if (activeLink) {
        await tx.close(activeLink.id);
        stats.closed += 1;
      }

      // Rule 8: Display name similarity >= 0.85 -> inferred / suggested only
      const desiredByPerson = new Map<string, string>();
      const normAccountName = normalizeDisplayName(account.displayName);
      if (normAccountName.length >= 2) {
        for (const person of uniqueDirectoryPeople) {
          if (person.normalizedName.length < 2) continue;
          const score = jaroWinkler(normAccountName, person.normalizedName);
          if (score >= NAME_SIMILARITY_THRESHOLD) {
            desiredByPerson.set(
              person.personId,
              `Display name similarity ${score.toFixed(2)} ("${account.displayName}" ~ "${person.displayName}")`
            );
          }
        }
      }

      await reconcileSuggestions(tx, account.id, openSuggestions, desiredByPerson, stats);
    }

    return stats;
  });
}

async function reconcileSuggestions(
  tx: LinkRepository,
  accountId: string,
  existingSuggestions: IdentityLink[],
  desiredByPerson: Map<string, string>,
  stats: AutoLinkStats
): Promise<void> {
  const existingPersonIds = new Set<string>();

  for (const existing of existingSuggestions) {
    if (!desiredByPerson.has(existing.personId)) {
      await tx.close(existing.id);
      stats.closed += 1;
    } else {
      existingPersonIds.add(existing.personId);
    }
  }

  for (const [personId, note] of desiredByPerson.entries()) {
    if (existingPersonIds.has(personId)) {
      continue;
    }
    await tx.create({
      accountId,
      personId,
      grade: 'inferred',
      method: 'suggested',
      linkedBy: 'autoLink',
      note,
    });
    stats.suggested += 1;
  }
}
