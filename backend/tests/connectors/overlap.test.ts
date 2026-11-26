// Phase 0 email overlap report (plan Task 0.2).

import { describe, it, expect } from 'vitest';
import { overlapReport } from '../../src/connectors/probe/overlap.js';

describe('email overlap report (Task 0.2)', () => {
  it('case-insensitive exact match counts as matched', () => {
    const r = overlapReport({
      directory: [{ id: 'person:entra:1', emails: ['Omar@Acme.com'] }],
      accounts: [{ source: 'slack', accountId: 'U1', email: 'omar@ACME.com' }],
    });
    expect(r.perSource.slack).toEqual({ total: 1, exactMatch: 1, noEmail: 0, unmatched: [] });
  });

  it('smtp: prefix stripped from proxyAddresses', () => {
    const r = overlapReport({
      directory: [{ id: 'person:entra:1', emails: ['SMTP:omar@acme.com', 'smtp:o.farooq@acme.com'] }],
      accounts: [{ source: 'jira', accountId: 'a-1', email: 'o.farooq@acme.com' }],
    });
    expect(r.perSource.jira.exactMatch).toBe(1);
  });

  it('account without email counted in noEmail and listed unmatched', () => {
    const r = overlapReport({
      directory: [{ id: 'person:entra:1', emails: ['omar@acme.com'] }],
      accounts: [
        { source: 'github', accountId: 'gh-1', email: null, login: 'omarf' },
        { source: 'github', accountId: 'gh-2', email: 'stranger@example.org' },
      ],
    });
    expect(r.perSource.github).toEqual({
      total: 2,
      exactMatch: 0,
      noEmail: 1,
      unmatched: [
        { accountId: 'gh-1', email: null, login: 'omarf', reason: 'no_email' },
        { accountId: 'gh-2', email: 'stranger@example.org', reason: 'not_in_directory' },
      ],
    });
  });

  it('same email in two directory records reported as conflict', () => {
    const r = overlapReport({
      directory: [
        { id: 'person:entra:2', emails: ['ops@acme.com', 'bob@acme.com'] },
        { id: 'person:entra:1', emails: ['alice@acme.com', 'OPS@acme.com'] },
      ],
      accounts: [{ source: 'n8n', accountId: 'u1', email: 'ops@acme.com' }],
    });
    expect(r.conflicts).toEqual([{ email: 'ops@acme.com', directoryIds: ['person:entra:1', 'person:entra:2'] }]);
    // Like autoLink, an address two people hold is not a match.
    expect(r.perSource.n8n.exactMatch).toBe(0);
    expect(r.perSource.n8n.unmatched[0].reason).toBe('ambiguous');
  });
});
