// =============================================================================
// Horquva Continuity Platform — Phase 0 platform probes (plan Task 0.1)
// =============================================================================
// One pure function per platform: is the credential alive, and does each read
// we rely on answer? Every call is a GET except the two token exchanges
// (Entra client credentials, GitHub App installation token).
//
// Results never carry a secret: every detail goes through redact() with every
// configured secret and every token obtained during the run.
// =============================================================================

import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export type ProbeStatus = 'working' | 'rejected' | 'unreachable' | 'missing' | 'unexpected';

export interface ProbeResult {
  platform: string;
  check: string;
  status: ProbeStatus;
  httpStatus: number | null;
  /** Secret-free. */
  detail: string;
}

export type ProbeEnv = Record<string, string | undefined>;
export type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>;

/** Env names whose values are secrets (also listed in backend/.env.connectors.example). */
export const SECRET_ENV = ['ENTRA_CLIENT_SECRET', 'N8N_API_KEY', 'SLACK_BOT_TOKEN', 'JIRA_API_TOKEN', 'GITHUB_TOKEN'] as const;

const USER_AGENT = 'Horquva-Probe/1.0';
const DETAIL_MAX = 200;

/** Replaces every occurrence of each secret (4+ characters) with [redacted]. */
export function redact(text: string, secrets: string[]): string {
  let out = text;
  for (const s of secrets) {
    if (!s || s.length < 4) continue;
    out = out.split(s).join('[redacted]');
  }
  return out;
}

const UNREACHABLE_CODES = new Set(['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT']);

function errorCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}

/** A probe run: collects results and the secrets to redact from them. */
class Run {
  readonly results: ProbeResult[] = [];
  readonly secrets: string[];

  constructor(readonly platform: string, env: ProbeEnv, readonly fetchImpl: FetchImpl) {
    this.secrets = SECRET_ENV.map((k) => env[k] ?? '').filter(Boolean);
  }

  addSecret(s: string | undefined): void {
    if (s) this.secrets.push(s);
  }

  push(check: string, status: ProbeStatus, httpStatus: number | null, detail: string): void {
    this.results.push({ platform: this.platform, check, status, httpStatus, detail: redact(detail, this.secrets).slice(0, DETAIL_MAX) });
  }

  missing(checks: string[], detail: string): ProbeResult[] {
    for (const c of checks) this.push(c, 'missing', null, detail);
    return this.results;
  }

  /**
   * Calls `url` and classifies the answer. Returns the parsed body when the
   * check counts as working, else null. `inspect` may turn a 200 into
   * `unexpected` by returning a reason.
   */
  async call(
    check: string,
    url: string,
    init: RequestInit,
    inspect?: (body: any) => string | null,
  ): Promise<any | null> {
    let res: Response;
    try {
      res = await this.fetchImpl(url, { ...init, headers: { 'User-Agent': USER_AGENT, ...(init.headers ?? {}) } });
    } catch (err) {
      const code = errorCode(err);
      const msg = err instanceof Error ? err.message : String(err);
      if (code && UNREACHABLE_CODES.has(code)) this.push(check, 'unreachable', null, `${code}: ${msg}`);
      else this.push(check, 'unreachable', null, msg);
      return null;
    }
    const text = await res.text().catch(() => '');
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    const path = new URL(url).pathname;
    if (res.status === 401 || res.status === 403) {
      this.push(check, 'rejected', res.status, `${path}: ${text}`);
      return null;
    }
    if (res.status === 404) {
      this.push(check, 'unexpected', 404, `${path} not found`);
      return null;
    }
    if (!res.ok) {
      this.push(check, 'unexpected', res.status, `${path}: ${text}`);
      return null;
    }
    const problem = inspect?.(body) ?? null;
    if (problem) {
      this.push(check, 'unexpected', res.status, problem);
      return null;
    }
    this.push(check, 'working', res.status, 'ok');
    return body;
  }
}

function missingVars(env: ProbeEnv, names: string[]): string[] {
  return names.filter((n) => !env[n]?.trim());
}

// ── Entra ────────────────────────────────────────────────────────────────────

const ENTRA_CHECKS = ['token', 'users', 'groups', 'applications', 'directReports'];

export async function probeEntra(env: ProbeEnv, fetchImpl: FetchImpl, graphBase = 'https://graph.microsoft.com/v1.0'): Promise<ProbeResult[]> {
  const run = new Run('entra', env, fetchImpl);
  const gone = missingVars(env, ['ENTRA_TENANT_ID', 'ENTRA_CLIENT_ID', 'ENTRA_CLIENT_SECRET']);
  if (gone.length) return run.missing(ENTRA_CHECKS, `not set: ${gone.join(', ')}`);

  const form = new URLSearchParams({
    client_id: env.ENTRA_CLIENT_ID!,
    client_secret: env.ENTRA_CLIENT_SECRET!,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const tokenBody = await run.call(
    'token',
    `https://login.microsoftonline.com/${encodeURIComponent(env.ENTRA_TENANT_ID!)}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() },
    (b) => (typeof b?.access_token === 'string' ? null : 'token response has no access_token'),
  );
  if (!tokenBody) return run.missing(ENTRA_CHECKS.slice(1), 'not run: needs a working token');
  run.addSecret(tokenBody.access_token);
  const headers = { Authorization: `Bearer ${tokenBody.access_token}` };

  const users = await run.call('users', `${graphBase}/users?$top=1`, { headers });
  await run.call('groups', `${graphBase}/groups?$top=1`, { headers });
  await run.call('applications', `${graphBase}/applications?$top=1`, { headers });
  const firstId = users?.value?.[0]?.id;
  if (firstId) await run.call('directReports', `${graphBase}/users/${encodeURIComponent(firstId)}/directReports`, { headers });
  else run.push('directReports', 'missing', null, 'not run: no user to read');
  return run.results;
}

// ── n8n ──────────────────────────────────────────────────────────────────────

export async function probeN8n(env: ProbeEnv, fetchImpl: FetchImpl): Promise<ProbeResult[]> {
  const run = new Run('n8n', env, fetchImpl);
  const checks = ['users', 'workflows', 'credentials'];
  const gone = missingVars(env, ['N8N_BASE_URL', 'N8N_API_KEY']);
  if (gone.length) return run.missing(checks, `not set: ${gone.join(', ')}`);
  const base = env.N8N_BASE_URL!.replace(/\/+$/, '');
  const headers = { 'X-N8N-API-KEY': env.N8N_API_KEY!, Accept: 'application/json' };
  for (const c of checks) await run.call(c, `${base}/api/v1/${c}?limit=1`, { headers });
  return run.results;
}

// ── Slack ────────────────────────────────────────────────────────────────────

const SLACK_REJECTED = new Set(['invalid_auth', 'not_authed', 'account_inactive', 'token_revoked', 'token_expired']);

/** Slack answers 200 with ok:false; turn that into rejected or unexpected. */
function slackProblem(body: any): string | null {
  if (body?.ok === true) return null;
  const error = String(body?.error ?? 'no ok flag');
  if (body?.error === 'missing_scope') return `missing_scope: needs ${body?.needed ?? 'a scope'}`;
  return error;
}

export async function probeSlack(env: ProbeEnv, fetchImpl: FetchImpl, base = 'https://slack.com/api'): Promise<ProbeResult[]> {
  const run = new Run('slack', env, fetchImpl);
  const checks = ['auth.test', 'users.list', 'conversations.list'];
  if (!env.SLACK_BOT_TOKEN?.trim()) return run.missing(checks, 'not set: SLACK_BOT_TOKEN');
  const headers = { Authorization: `Bearer ${env.SLACK_BOT_TOKEN}` };

  // An invalid token is a 200 with ok:false: report it as rejected, not unexpected.
  const slackCall = async (check: string, url: string, inspect?: (b: any) => string | null) => {
    let rejected = false;
    const body = await run.call(check, url, { headers }, (b) => {
      const p = slackProblem(b);
      if (p && SLACK_REJECTED.has(p)) {
        rejected = true;
        return p;
      }
      return p ?? inspect?.(b) ?? null;
    });
    if (rejected) {
      const last = run.results[run.results.length - 1];
      last.status = 'rejected';
    }
    return body;
  };

  await slackCall('auth.test', `${base}/auth.test`);
  await slackCall('users.list', `${base}/users.list?limit=20`, (b) => {
    const humans = (b?.members ?? []).filter((m: any) => !m.is_bot && !m.deleted && m.id !== 'USLACKBOT');
    if (humans.length === 0) return null; // nobody to check yet
    return humans.some((m: any) => typeof m.profile?.email === 'string' && m.profile.email) ? null : 'users:read.email scope missing';
  });
  await slackCall('conversations.list', `${base}/conversations.list?limit=1&types=public_channel,private_channel`);
  return run.results;
}

// ── Jira ─────────────────────────────────────────────────────────────────────

/** JIRA_SITE may be "acme" or a full host such as "acme.atlassian.net". */
export function jiraBase(site: string): string {
  const s = site.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return `https://${s.includes('.') ? s : `${s}.atlassian.net`}`;
}

export async function probeJira(env: ProbeEnv, fetchImpl: FetchImpl): Promise<ProbeResult[]> {
  const run = new Run('jira', env, fetchImpl);
  const checks = ['myself', 'project/search', 'components', 'role', 'search/jql', 'users/search'];
  const gone = missingVars(env, ['JIRA_SITE', 'JIRA_EMAIL', 'JIRA_API_TOKEN']);
  if (gone.length) return run.missing(checks, `not set: ${gone.join(', ')}`);
  const basic = Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString('base64');
  run.addSecret(basic);
  const headers = { Authorization: `Basic ${basic}`, Accept: 'application/json' };
  const api = `${jiraBase(env.JIRA_SITE!)}/rest/api/3`;

  await run.call('myself', `${api}/myself`, { headers });
  const projects = await run.call('project/search', `${api}/project/search?maxResults=1&expand=lead`, { headers });
  const key = projects?.values?.[0]?.key;
  if (key) {
    await run.call('components', `${api}/project/${encodeURIComponent(key)}/components`, { headers });
    await run.call('role', `${api}/project/${encodeURIComponent(key)}/role`, { headers });
  } else {
    run.push('components', 'missing', null, 'not run: no project to read');
    run.push('role', 'missing', null, 'not run: no project to read');
  }
  await run.call('search/jql', `${api}/search/jql?jql=order%20by%20updated&maxResults=1`, { headers });
  await run.call('users/search', `${api}/users/search?maxResults=1`, { headers });
  return run.results;
}

// ── GitHub ───────────────────────────────────────────────────────────────────

/** RS256 JWT for a GitHub App: iat 60 s in the past, exp 9 minutes ahead. */
export function githubAppJwt(appId: string, privateKeyPem: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const b64url = (v: string | Buffer) => Buffer.from(v).toString('base64url');
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iat: nowSeconds - 60, exp: nowSeconds + 540, iss: appId }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  return `${header}.${payload}.${signer.sign(privateKeyPem).toString('base64url')}`;
}

export async function probeGitHub(
  env: ProbeEnv,
  fetchImpl: FetchImpl,
  readKey: (path: string) => Promise<string> = (p) => readFile(p, 'utf8'),
  api = 'https://api.github.com',
): Promise<ProbeResult[]> {
  const run = new Run('github', env, fetchImpl);
  const gh = (token: string, scheme = 'Bearer') => ({
    Authorization: `${scheme} ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  });
  const org = env.GITHUB_ORG?.trim();

  // Personal access token.
  const patGone = missingVars(env, ['GITHUB_ORG', 'GITHUB_TOKEN']);
  if (patGone.length) run.push('pat: org', 'missing', null, `not set: ${patGone.join(', ')}`);
  else await run.call('pat: org', `${api}/orgs/${encodeURIComponent(org!)}`, { headers: gh(env.GITHUB_TOKEN!) });

  // GitHub App.
  const appChecks = ['app', 'app: installation', 'app: token', 'app: members'];
  const appGone = missingVars(env, ['GITHUB_ORG', 'GITHUB_APP_ID', 'GITHUB_APP_PRIVATE_KEY_PATH']);
  if (appGone.length) return run.missing(appChecks, `not set: ${appGone.join(', ')}`);

  let jwt: string;
  try {
    const pem = await readKey(env.GITHUB_APP_PRIVATE_KEY_PATH!);
    jwt = githubAppJwt(env.GITHUB_APP_ID!, pem);
  } catch (err) {
    return run.missing(appChecks, `private key unreadable: ${err instanceof Error ? err.message : String(err)}`);
  }
  run.addSecret(jwt);

  if (!(await run.call('app', `${api}/app`, { headers: gh(jwt) }))) return run.missing(appChecks.slice(1), 'not run: app JWT rejected');
  const inst = await run.call('app: installation', `${api}/orgs/${encodeURIComponent(org!)}/installation`, { headers: gh(jwt) });
  if (!inst?.id) return run.missing(appChecks.slice(2), 'not run: app not installed on the org');
  const tok = await run.call(
    'app: token',
    `${api}/app/installations/${encodeURIComponent(String(inst.id))}/access_tokens`,
    { method: 'POST', headers: gh(jwt) },
    (b) => (typeof b?.token === 'string' ? null : 'token response has no token'),
  );
  if (!tok) return run.missing(appChecks.slice(3), 'not run: no installation token');
  run.addSecret(tok.token);
  await run.call('app: members', `${api}/orgs/${encodeURIComponent(org!)}/members?per_page=1`, { headers: gh(tok.token) });
  return run.results;
}

/** Every probe, in the order the results doc lists them. */
export async function probeAll(env: ProbeEnv, fetchImpl: FetchImpl): Promise<ProbeResult[]> {
  return [
    ...(await probeEntra(env, fetchImpl)),
    ...(await probeN8n(env, fetchImpl)),
    ...(await probeSlack(env, fetchImpl)),
    ...(await probeJira(env, fetchImpl)),
    ...(await probeGitHub(env, fetchImpl)),
  ];
}
