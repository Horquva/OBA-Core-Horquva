// =============================================================================
// Horquva Continuity Platform — Phase 0 email overlap report (plan Task 0.2)
// =============================================================================
// How many tool accounts would link to a directory person by exact email, as
// autoLink does it: case-insensitive, against every directory address, and
// only when exactly one person holds the address. The unmatched list per
// source is the alias list the owner fixes in R2.
// =============================================================================

export interface OverlapInput {
  directory: Array<{ id: string; emails: string[] }>;
  accounts: Array<{ source: string; accountId: string; email: string | null; login?: string }>;
}

export interface UnmatchedAccount {
  accountId: string;
  email: string | null;
  login?: string;
  /** Why it did not match: no email, nobody has it, or several people do. */
  reason: 'no_email' | 'not_in_directory' | 'ambiguous';
}

export interface SourceOverlap {
  total: number;
  exactMatch: number;
  noEmail: number;
  unmatched: UnmatchedAccount[];
}

export interface OverlapReport {
  perSource: Record<string, SourceOverlap>;
  /** Addresses that two or more directory records share. */
  conflicts: Array<{ email: string; directoryIds: string[] }>;
}

/** Lower-cased, trimmed, with an Exchange `smtp:` prefix (any case) removed. */
export function normalizeAddress(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.trim().replace(/^smtp:/i, '').toLowerCase();
}

export function overlapReport(input: OverlapInput): OverlapReport {
  const owners = new Map<string, Set<string>>();
  for (const person of input.directory) {
    for (const raw of person.emails) {
      const email = normalizeAddress(raw);
      if (!email.includes('@')) continue;
      const set = owners.get(email) ?? new Set<string>();
      set.add(person.id);
      owners.set(email, set);
    }
  }

  const conflicts = [...owners.entries()]
    .filter(([, ids]) => ids.size > 1)
    .map(([email, ids]) => ({ email, directoryIds: [...ids].sort() }))
    .sort((a, b) => a.email.localeCompare(b.email));

  const perSource: Record<string, SourceOverlap> = {};
  for (const acc of input.accounts) {
    const s = (perSource[acc.source] ??= { total: 0, exactMatch: 0, noEmail: 0, unmatched: [] });
    s.total++;
    const email = normalizeAddress(acc.email);
    const base = { accountId: acc.accountId, email: acc.email, ...(acc.login ? { login: acc.login } : {}) };
    if (!email) {
      s.noEmail++;
      s.unmatched.push({ ...base, reason: 'no_email' });
      continue;
    }
    const holders = owners.get(email)?.size ?? 0;
    if (holders === 1) s.exactMatch++;
    else s.unmatched.push({ ...base, reason: holders === 0 ? 'not_in_directory' : 'ambiguous' });
  }
  return { perSource, conflicts };
}
