import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { parsePage } from '../../src/connectors/sdk/validate.js';
import { SyncIssues } from '../../src/connectors/sdk/issues.js';
import { REF_KEYS, STATED_RULES, assertGradeRules } from '../../src/connectors/sdk/sourceRules.js';
import { ReadOnlyHttpGuard, SecurityViolationError, TOKEN_ENDPOINTS } from '../../src/connectors/sdk/guard.js';
import type { SyncResult } from '../../src/connectors/sdk/types.js';

describe('Task 0.A Contracts & Shared Foundation', () => {
  describe('Boundary Page Parser (parsePage)', () => {
    const userSchema = z.object({
      id: z.string(),
      email: z.string().email(),
      displayName: z.string(),
      department: z.string().nullable(),
    });

    it('parses a raw array of valid items', () => {
      const issues = new SyncIssues();
      const raw = [
        { id: '1', email: 'alice@acme.com', displayName: 'Alice', department: 'Engineering' },
        { id: '2', email: 'bob@acme.com', displayName: 'Bob', department: null },
      ];

      const result = parsePage(userSchema, raw, 'users', issues);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].department).toBeNull();
      expect(issues.stats().errors).toBe(0);
    });

    it('unwraps Microsoft Graph format ({ value: [] })', () => {
      const issues = new SyncIssues();
      const data = {
        '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users',
        value: [
          { id: 'u1', email: 'carol@acme.com', displayName: 'Carol', department: 'Product' },
        ],
      };

      const result = parsePage(userSchema, data, 'entra_users', issues);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('carol@acme.com');
      expect(issues.stats().errors).toBe(0);
    });

    it('unwraps Jira format ({ values: [] })', () => {
      const issues = new SyncIssues();
      const data = {
        startAt: 0,
        maxResults: 50,
        total: 1,
        values: [
          { id: 'j1', email: 'dave@acme.com', displayName: 'Dave', department: null },
        ],
      };

      const result = parsePage(userSchema, data, 'jira_users', issues);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('j1');
      expect(issues.stats().errors).toBe(0);
    });

    it('unwraps Slack format ({ members: [] })', () => {
      const issues = new SyncIssues();
      const data = {
        ok: true,
        members: [
          { id: 's1', email: 'eve@acme.com', displayName: 'Eve', department: 'Design' },
        ],
      };

      const result = parsePage(userSchema, data, 'slack_users', issues);

      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe('Eve');
      expect(issues.stats().errors).toBe(0);
    });

    it('returns empty array on unexpected container or null without throwing', () => {
      const issues = new SyncIssues();

      expect(parsePage(userSchema, null, 'null_test', issues)).toEqual([]);
      expect(parsePage(userSchema, undefined, 'undef_test', issues)).toEqual([]);
      expect(parsePage(userSchema, 'invalid string', 'str_test', issues)).toEqual([]);
      expect(parsePage(userSchema, { otherField: [1, 2, 3] }, 'obj_test', issues)).toEqual([]);
      expect(issues.stats().errors).toBe(0);
    });

    it('skips corrupted items, records issues.core with field paths, and does NOT throw', () => {
      const issues = new SyncIssues();
      const raw = [
        { id: 'ok-1', email: 'good1@acme.com', displayName: 'Good One', department: null },
        { id: 'bad-1', email: 'not-an-email', displayName: 'Bad One', department: null },
        { id: 'ok-2', email: 'good2@acme.com', displayName: 'Good Two', department: 'Ops' },
        { id: 'bad-2' }, // missing email and displayName
      ];

      const result = parsePage(userSchema, raw, 'mixed_users', issues);

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.id)).toEqual(['ok-1', 'ok-2']);

      const stats = issues.stats();
      expect(stats.errors).toBe(2);
      expect(issues.errorReasons[0]).toContain('mixed_users');
      expect(issues.errorReasons[0]).toContain('Item 1 schema violation: email');
      expect(issues.errorReasons[1]).toContain('mixed_users');
      expect(issues.errorReasons[1]).toContain('Item 3 schema violation');
    });

    it('preserves documented nullables without fake fallback defaults', () => {
      const issues = new SyncIssues();
      const raw = [{ id: 'null-dept', email: 'frank@acme.com', displayName: 'Frank', department: null }];

      const result = parsePage(userSchema, raw, 'nullables', issues);

      expect(result).toHaveLength(1);
      expect(result[0].department).toBeNull();
      expect(result[0].department).not.toBeUndefined();
    });
  });

  describe('Source Rules & Grade Enforcement (sourceRules)', () => {
    it('exports REF_KEYS for all required platforms with authoritative keys', () => {
      expect(REF_KEYS.entra).toEqual(['entraId', 'objectId', 'entraAppId']);
      expect(REF_KEYS.n8n).toEqual(['n8nUserId', 'n8n']);
      expect(REF_KEYS.ai_admin).toEqual(['openaiUserId', 'modelId', 'vendorId']);
      expect(REF_KEYS.google).toEqual(['googleId']);
      expect(REF_KEYS.csv).toEqual(['csvRow', 'csvId', 'email']);
      expect(REF_KEYS.slack).toEqual(['slackUserId', 'slackChannelId']);
      expect(REF_KEYS.jira).toEqual(['jiraAccountId', 'jiraProjectId', 'jiraComponentId']);
      expect(REF_KEYS.github).toEqual(['githubUserId', 'githubRepoId', 'githubTeamId']);
    });

    it('contains authoritative stated edge combinations in STATED_RULES', () => {
      expect(STATED_RULES.has('connector:entra|owns|app')).toBe(true);
      expect(STATED_RULES.has('connector:entra|member_of|group')).toBe(true);
      expect(STATED_RULES.has('connector:entra|reports_to|person')).toBe(true);
      expect(STATED_RULES.has('connector:entra|grants_access_to|vendor')).toBe(true);
      expect(STATED_RULES.has('connector:n8n|owns|workflow')).toBe(true);
      expect(STATED_RULES.has('connector:n8n|depends_on|workflow')).toBe(true);
      expect(STATED_RULES.has('connector:n8n|depends_on|credential')).toBe(true);
      expect(STATED_RULES.has('connector:n8n|runs_on_credentials_of|credential')).toBe(true);
      expect(STATED_RULES.has('connector:n8n|runs_on_credentials_of|person')).toBe(true);
      expect(STATED_RULES.has('connector:n8n|calls_model|model')).toBe(true);
      expect(STATED_RULES.has('connector:jira|owns|project')).toBe(true);
      expect(STATED_RULES.has('connector:jira|backs_up|person')).toBe(true);
      expect(STATED_RULES.has('connector:jira|backs_up|project')).toBe(true);
      expect(STATED_RULES.has('connector:slack|member_of|channel')).toBe(true);
      expect(STATED_RULES.has('connector:github|member_of|team')).toBe(true);
      expect(STATED_RULES.has('connector:google|owns|app')).toBe(true);
      expect(STATED_RULES.has('connector:google|reports_to|person')).toBe(true);
    });

    it('passes assertGradeRules when all stated edges conform to rules', () => {
      const now = new Date();
      const mockResult: SyncResult = {
        entities: [],
        edges: [
          {
            fromId: 'person:alice@acme.com',
            toId: 'app:entra:guid1',
            type: 'owns',
            grade: 'stated',
            source: 'connector:entra',
            validFrom: now,
          },
          {
            fromId: 'person:bob@acme.com',
            toId: 'group:entra:sales',
            type: 'member_of',
            grade: 'stated',
            source: 'connector:entra',
            validFrom: now,
          },
          {
            fromId: 'automation:n8n:42',
            toId: 'credential:n8n:c1',
            type: 'runs_on_credentials_of',
            grade: 'stated',
            source: 'connector:n8n',
            validFrom: now,
          },
          {
            fromId: 'automation:n8n:42',
            toId: 'person:alice@acme.com',
            type: 'runs_on_credentials_of',
            grade: 'stated',
            source: 'connector:n8n',
            validFrom: now,
          },
          {
            fromId: 'automation:n8n:42',
            toId: 'credential:n8n:slack',
            type: 'depends_on',
            grade: 'stated',
            source: 'connector:n8n',
            validFrom: now,
          },
          {
            fromId: 'person:alice@acme.com',
            toId: 'project:jira:proj1',
            type: 'backs_up',
            grade: 'stated',
            source: 'connector:jira',
            validFrom: now,
          },
        ],
        facts: [],
        rawPayloads: [],
        stats: { fetched: 6, entitiesCreated: 0, edgesCreated: 6, factsCreated: 0, errors: 0 },
        coverage: { entra: 10, n8n: 5, jira: 2 },
      };

      const violations = assertGradeRules(mockResult);
      expect(violations).toEqual([]);
    });

    it('validates canonical connector edges: n8n runs_on_credentials_of person, depends_on credential, and jira backs_up project', () => {
      const now = new Date();
      const mockResult: SyncResult = {
        entities: [],
        edges: [
          {
            fromId: 'automation:n8n:wf-1',
            toId: 'person:alice@acme.com',
            type: 'runs_on_credentials_of',
            grade: 'stated',
            source: 'connector:n8n',
            validFrom: now,
          },
          {
            fromId: 'automation:n8n:wf-1',
            toId: 'credential:n8n:slack',
            type: 'depends_on',
            grade: 'stated',
            source: 'connector:n8n',
            validFrom: now,
          },
          {
            fromId: 'person:carol@acme.com',
            toId: 'project:jira:proj1',
            type: 'backs_up',
            grade: 'stated',
            source: 'connector:jira',
            validFrom: now,
          },
        ],
        facts: [],
        rawPayloads: [],
        stats: { fetched: 3, entitiesCreated: 0, edgesCreated: 3, factsCreated: 0, errors: 0 },
        coverage: { n8n: 2, jira: 1 },
      };

      const violations = assertGradeRules(mockResult);
      expect(violations).toEqual([]);
    });

    it('defensively handles non-string toId and undefined source without throwing TypeError', () => {
      const now = new Date();
      const malformedResult: SyncResult = {
        entities: [],
        edges: [
          {
            fromId: 'automation:n8n:42',
            toId: 12345 as any,
            type: 'runs_on_credentials_of',
            grade: 'stated',
            source: undefined as any,
            validFrom: now,
          },
          {
            fromId: 'automation:n8n:42',
            toId: null as any,
            type: 'depends_on',
            grade: 'stated',
            source: 'connector:n8n',
            validFrom: now,
          },
          {
            fromId: 'person:alice@acme.com',
            toId: 'project:jira:proj1',
            type: 'backs_up',
            grade: 'stated',
            source: undefined as any,
            validFrom: now,
          },
        ],
        facts: [],
        rawPayloads: [],
        stats: { fetched: 3, entitiesCreated: 0, edgesCreated: 3, factsCreated: 0, errors: 0 },
        coverage: {},
      };

      let violations: string[] = [];
      expect(() => {
        violations = assertGradeRules(malformedResult);
      }).not.toThrow();

      expect(violations).toHaveLength(3);
      expect(violations[0]).toContain('Illegal stated edge:  -> runs_on_credentials_of (target: 12345)');
      expect(violations[1]).toContain('Illegal stated edge: connector:n8n -> depends_on (target: )');
      expect(violations[2]).toContain('Illegal stated edge:  -> backs_up (target: project:jira:proj1)');
    });

    it('detects violations when an edge is marked stated but violates STATED_RULES', () => {
      const now = new Date();
      const mockResult: SyncResult = {
        entities: [],
        edges: [
          {
            fromId: 'person:alice@acme.com',
            toId: 'app:slack:guid1',
            type: 'owns', // slack does not declare stated owns app
            grade: 'stated',
            source: 'connector:slack',
            validFrom: now,
          },
          {
            fromId: 'person:bob@acme.com',
            toId: 'credential:secret:1',
            type: 'runs_on_credentials_of', // google does not declare runs_on_credentials_of
            grade: 'stated',
            source: 'connector:google',
            validFrom: now,
          },
          {
            // Inferred or confirmed grades are not restricted by stated rules
            fromId: 'person:carol@acme.com',
            toId: 'automation:custom:1',
            type: 'owns',
            grade: 'inferred',
            source: 'heuristic',
            validFrom: now,
          },
        ],
        facts: [],
        rawPayloads: [],
        stats: { fetched: 3, entitiesCreated: 0, edgesCreated: 3, factsCreated: 0, errors: 0 },
        coverage: {},
      };

      const violations = assertGradeRules(mockResult);
      expect(violations).toHaveLength(2);
      expect(violations[0]).toContain('Illegal stated edge: connector:slack -> owns');
      expect(violations[1]).toContain('Illegal stated edge: connector:google -> runs_on_credentials_of');
    });
  });

  describe('Read-Only HTTP Guard Token Exchange (postTokenRequest)', () => {
    let guard: ReadOnlyHttpGuard;
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      guard = new ReadOnlyHttpGuard();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('defines regex allowlist for Microsoft Online and GitHub App token endpoints', () => {
      const msUrl = 'https://login.microsoftonline.com/tenant-123-abc/oauth2/v2.0/token';
      const ghUrl = 'https://api.github.com/app/installations/987654/access_tokens';
      const badMsUrl = 'https://login.microsoftonline.com/common/discovery/keys';
      const badGhUrl = 'https://api.github.com/repos/owner/repo';

      expect(TOKEN_ENDPOINTS.some((p) => p.test(msUrl))).toBe(true);
      expect(TOKEN_ENDPOINTS.some((p) => p.test(ghUrl))).toBe(true);
      expect(TOKEN_ENDPOINTS.some((p) => p.test(badMsUrl))).toBe(false);
      expect(TOKEN_ENDPOINTS.some((p) => p.test(badGhUrl))).toBe(false);
    });

    it('permits POST to Microsoft Online token endpoint with URLSearchParams', async () => {
      const msUrl = 'https://login.microsoftonline.com/tenant-guid-1234/oauth2/v2.0/token';
      const mockResponseData = {
        token_type: 'Bearer',
        expires_in: 3599,
        access_token: 'fake-access-token-123',
      };

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponseData,
      });
      globalThis.fetch = fetchSpy;

      const body = new URLSearchParams({
        client_id: 'client-abc',
        client_secret: 'secret-xyz',
        grant_type: 'client_credentials',
        scope: 'https://graph.microsoft.com/.default',
      });

      const res = await guard.postTokenRequest(msUrl, body);

      expect(res.status).toBe(200);
      expect(res.data).toEqual(mockResponseData);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const [calledUrl, calledOptions] = fetchSpy.mock.calls[0];
      expect(calledUrl).toBe(msUrl);
      expect(calledOptions.method).toBe('POST');
      expect(calledOptions.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(calledOptions.body).toBe(body.toString());
    });

    it('permits POST to GitHub App installations token endpoint with JSON body', async () => {
      const ghUrl = 'https://api.github.com/app/installations/42/access_tokens';
      const mockResponseData = {
        token: 'ghs_fakeInstallationToken456',
        expires_at: '2026-11-24T16:00:00Z',
      };

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponseData,
      });
      globalThis.fetch = fetchSpy;

      const body = { repositories: ['repo-1', 'repo-2'] };
      const res = await guard.postTokenRequest(ghUrl, body, {
        Authorization: 'Bearer jwt-token',
        Accept: 'application/vnd.github+json',
      });

      expect(res.status).toBe(201);
      expect(res.data).toEqual(mockResponseData);

      const [calledUrl, calledOptions] = fetchSpy.mock.calls[0];
      expect(calledUrl).toBe(ghUrl);
      expect(calledOptions.method).toBe('POST');
      expect(calledOptions.headers['Content-Type']).toBe('application/json');
      expect(calledOptions.headers['Authorization']).toBe('Bearer jwt-token');
      expect(calledOptions.body).toBe(JSON.stringify(body));
    });

    it('throws SecurityViolationError for forbidden endpoints', async () => {
      const forbiddenUrls = [
        'https://graph.microsoft.com/v1.0/users',
        'https://api.github.com/user',
        'https://slack.com/api/oauth.v2.access',
        'https://login.microsoftonline.com/tenant-123/unauthorized-endpoint',
        'http://login.microsoftonline.com/tenant-123/oauth2/v2.0/token', // HTTP insecure
        'https://evil-login.microsoftonline.com/tenant-123/oauth2/v2.0/token',
      ];

      for (const url of forbiddenUrls) {
        await expect(guard.postTokenRequest(url, {})).rejects.toThrow(SecurityViolationError);
      }
    });

    it('throws Error when token endpoint returns non-2xx status', async () => {
      const msUrl = 'https://login.microsoftonline.com/tenant-guid-1234/oauth2/v2.0/token';
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify({ error: 'invalid_client', error_description: 'Bad secret' }),
      });

      await expect(guard.postTokenRequest(msUrl, {})).rejects.toThrow(/HTTP Error 401 Unauthorized/);
    });
  });
});
