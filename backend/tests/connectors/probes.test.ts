// Phase 0 platform probes (plan Task 0.1), against an injected fetch.

import { describe, it, expect, vi } from 'vitest';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import {
  probeEntra,
  probeN8n,
  probeSlack,
  probeJira,
  probeGitHub,
  redact,
  githubAppJwt,
  jiraBase,
  type FetchImpl,
  type ProbeEnv,
} from '../../src/connectors/probe/probes.js';

type Route = (url: URL, init?: RequestInit) => Response | Promise<Response>;

/** A fetch that answers by path; unknown paths are 404. Records every call. */
function fakeFetch(routes: Record<string, Route>) {
  const calls: Array<{ url: string; method: string }> = [];
  const impl: FetchImpl = async (input, init) => {
    const url = new URL(String(input));
    calls.push({ url: url.toString(), method: init?.method ?? 'GET' });
    const route = routes[url.pathname];
    return route ? route(url, init) : new Response('{"message":"not found"}', { status: 404 });
  };
  return { impl, calls };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const N8N_ENV: ProbeEnv = { N8N_BASE_URL: 'https://n8n.example.test/', N8N_API_KEY: 'n8n-key-SECRET-123' };

describe('platform probes (Task 0.1)', () => {
  it('classifies 200 as working', async () => {
    const { impl } = fakeFetch({
      '/api/v1/users': () => json({ data: [] }),
      '/api/v1/workflows': () => json({ data: [] }),
      '/api/v1/credentials': () => json({ data: [] }),
    });
    const r = await probeN8n(N8N_ENV, impl);
    expect(r.map((x) => [x.check, x.status, x.httpStatus])).toEqual([
      ['users', 'working', 200],
      ['workflows', 'working', 200],
      ['credentials', 'working', 200],
    ]);
  });

  it('classifies 401 and 403 as rejected', async () => {
    const { impl } = fakeFetch({
      '/api/v1/users': () => json({ message: 'unauthorized' }, 401),
      '/api/v1/workflows': () => json({ message: 'forbidden' }, 403),
      '/api/v1/credentials': () => json({ data: [] }),
    });
    const r = await probeN8n(N8N_ENV, impl);
    expect(r.map((x) => x.status)).toEqual(['rejected', 'rejected', 'working']);
  });

  it('classifies ENOTFOUND and ECONNREFUSED as unreachable', async () => {
    let n = 0;
    const impl: FetchImpl = async () => {
      n++;
      throw Object.assign(new TypeError('fetch failed'), { cause: { code: n === 1 ? 'ENOTFOUND' : 'ECONNREFUSED' } });
    };
    const r = await probeN8n(N8N_ENV, impl);
    expect(r.map((x) => x.status)).toEqual(['unreachable', 'unreachable', 'unreachable']);
    expect(r[0].detail).toContain('ENOTFOUND');
    expect(r[1].detail).toContain('ECONNREFUSED');
  });

  it('missing env var yields missing without calling fetch', async () => {
    const impl = vi.fn<FetchImpl>();
    const results = [
      ...(await probeEntra({ ENTRA_TENANT_ID: 't' }, impl)),
      ...(await probeN8n({}, impl)),
      ...(await probeSlack({}, impl)),
      ...(await probeJira({ JIRA_SITE: 'acme' }, impl)),
      ...(await probeGitHub({}, impl)),
    ];
    expect(impl).not.toHaveBeenCalled();
    expect(results.every((r) => r.status === 'missing')).toBe(true);
    expect(results.find((r) => r.platform === 'entra')!.detail).toBe('not set: ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET');
  });

  it('slack users.list without profile.email is unexpected with detail "users:read.email scope missing"', async () => {
    const { impl } = fakeFetch({
      '/api/auth.test': () => json({ ok: true }),
      '/api/users.list': () => json({ ok: true, members: [{ id: 'USLACKBOT', profile: {} }, { id: 'U1', is_bot: false, profile: { real_name: 'Omar' } }] }),
      '/api/conversations.list': () => json({ ok: true, channels: [] }),
    });
    const r = await probeSlack({ SLACK_BOT_TOKEN: 'xoxb-SECRET-TOKEN' }, impl);
    expect(r.find((x) => x.check === 'users.list')).toMatchObject({ status: 'unexpected', detail: 'users:read.email scope missing' });
  });

  it('slack ok:false invalid_auth is rejected, not unexpected', async () => {
    const { impl } = fakeFetch({
      '/api/auth.test': () => json({ ok: false, error: 'invalid_auth' }),
      '/api/users.list': () => json({ ok: false, error: 'missing_scope', needed: 'users:read' }),
      '/api/conversations.list': () => json({ ok: true, channels: [] }),
    });
    const r = await probeSlack({ SLACK_BOT_TOKEN: 'xoxb-SECRET-TOKEN' }, impl);
    expect(r.map((x) => [x.check, x.status])).toEqual([
      ['auth.test', 'rejected'],
      ['users.list', 'unexpected'],
      ['conversations.list', 'working'],
    ]);
    expect(r[1].detail).toBe('missing_scope: needs users:read');
  });

  it('jira 404 on search/jql is unexpected and records the path', async () => {
    const { impl, calls } = fakeFetch({
      '/rest/api/3/myself': () => json({ accountId: 'a1' }),
      '/rest/api/3/project/search': () => json({ values: [{ key: 'OPS', lead: { accountId: 'a1' } }] }),
      '/rest/api/3/project/OPS/components': () => json([]),
      '/rest/api/3/project/OPS/role': () => json({}),
      '/rest/api/3/users/search': () => json([]),
    });
    const r = await probeJira({ JIRA_SITE: 'acme', JIRA_EMAIL: 'me@acme.test', JIRA_API_TOKEN: 'jira-SECRET-tok' }, impl);
    expect(r.find((x) => x.check === 'search/jql')).toMatchObject({ status: 'unexpected', httpStatus: 404, detail: '/rest/api/3/search/jql not found' });
    expect(r.filter((x) => x.status === 'working')).toHaveLength(5);
    expect(calls.every((c) => c.method === 'GET' && c.url.startsWith('https://acme.atlassian.net/'))).toBe(true);
  });

  it('detail never contains any configured secret value', async () => {
    const env: ProbeEnv = {
      ENTRA_TENANT_ID: 'tenant-1',
      ENTRA_CLIENT_ID: 'client-1',
      ENTRA_CLIENT_SECRET: 'entra-SECRET-value',
      N8N_BASE_URL: 'https://n8n.example.test',
      N8N_API_KEY: 'n8n-key-SECRET-123',
      SLACK_BOT_TOKEN: 'xoxb-SECRET-TOKEN',
      JIRA_SITE: 'acme',
      JIRA_EMAIL: 'me@acme.test',
      JIRA_API_TOKEN: 'jira-SECRET-tok',
      GITHUB_ORG: 'acme',
      GITHUB_TOKEN: 'ghp_SECRET_pat',
    };
    const secrets = ['entra-SECRET-value', 'n8n-key-SECRET-123', 'xoxb-SECRET-TOKEN', 'jira-SECRET-tok', 'ghp_SECRET_pat', 'ACCESS-TOKEN-SECRET'];
    // The Entra access token exists only in the Entra run, so only Graph can echo it.
    const leaky = `echo: ${secrets.filter((x) => x !== 'ACCESS-TOKEN-SECRET').join(' ')}`;
    const graphLeaky = `echo: ${secrets.join(' ')}`;
    const impl: FetchImpl = async (input) => {
      const url = String(input);
      if (url.includes('/oauth2/v2.0/token')) return json({ access_token: 'ACCESS-TOKEN-SECRET' });
      if (url.includes('graph.microsoft.com')) return new Response(graphLeaky, { status: 403 });
      if (url.includes('slack.com')) return json({ ok: false, error: leaky });
      return new Response(leaky, { status: 500 });
    };
    const all = [
      ...(await probeEntra(env, impl)),
      ...(await probeN8n(env, impl)),
      ...(await probeSlack(env, impl)),
      ...(await probeJira(env, impl)),
      ...(await probeGitHub(env, impl)),
    ];
    const details = all.map((r) => r.detail).join('\n');
    for (const s of secrets) expect(details).not.toContain(s);
    expect(details).toContain('[redacted]');
  });

  it('entra: no token means the Graph checks do not run', async () => {
    const { impl, calls } = fakeFetch({ '/t/oauth2/v2.0/token': () => json({ error: 'invalid_client' }, 401) });
    const r = await probeEntra({ ENTRA_TENANT_ID: 't', ENTRA_CLIENT_ID: 'c', ENTRA_CLIENT_SECRET: 'entra-SECRET-value' }, impl);
    expect(r[0]).toMatchObject({ check: 'token', status: 'rejected' });
    expect(r.slice(1).every((x) => x.status === 'missing')).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('POST');
  });

  it('github app: JWT, installation, token, members; only the token call is a POST', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const { impl, calls } = fakeFetch({
      '/orgs/acme': () => json({ login: 'acme' }),
      '/app': () => json({ id: 1 }),
      '/orgs/acme/installation': () => json({ id: 77 }),
      '/app/installations/77/access_tokens': () => json({ token: 'ghs_INSTALL_SECRET' }, 201),
      '/orgs/acme/members': () => json([]),
    });
    const r = await probeGitHub(
      { GITHUB_ORG: 'acme', GITHUB_TOKEN: 'ghp_SECRET_pat', GITHUB_APP_ID: '123', GITHUB_APP_PRIVATE_KEY_PATH: '/keys/app.pem' },
      impl,
      async () => pem,
    );
    expect(r.map((x) => [x.check, x.status])).toEqual([
      ['pat: org', 'working'],
      ['app', 'working'],
      ['app: installation', 'working'],
      ['app: token', 'working'],
      ['app: members', 'working'],
    ]);
    expect(calls.filter((c) => c.method !== 'GET').map((c) => new URL(c.url).pathname)).toEqual(['/app/installations/77/access_tokens']);

    const jwt = githubAppJwt('123', pem, 1_000_000);
    const [h, p, sig] = jwt.split('.');
    expect(JSON.parse(Buffer.from(p, 'base64url').toString())).toEqual({ iat: 999_940, exp: 1_000_540, iss: '123' });
    const verify = createVerify('RSA-SHA256');
    verify.update(`${h}.${p}`);
    expect(verify.verify(publicKey, Buffer.from(sig, 'base64url'))).toBe(true);
  });

  it('redact removes every secret and ignores short ones', () => {
    expect(redact('a abcd b abcd', ['abcd', 'a'])).toBe('a [redacted] b [redacted]');
  });

  it('jiraBase accepts a site name or a host', () => {
    expect(jiraBase('acme')).toBe('https://acme.atlassian.net');
    expect(jiraBase('https://acme.atlassian.net/')).toBe('https://acme.atlassian.net');
  });
});
