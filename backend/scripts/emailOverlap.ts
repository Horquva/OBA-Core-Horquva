// =============================================================================
// Horquva Continuity Platform — Phase 0 email overlap CLI (plan Task 0.2)
// =============================================================================
// Reads every directory address from Entra (mail, userPrincipalName,
// proxyAddresses, otherMails) and every account from Slack, Jira, GitHub and
// n8n, using the credentials in backend/.env.connectors, then prints how many
// accounts per source would link by exact email and which would not.
//
// GET only, apart from the Entra and GitHub App token exchanges. Emails are
// printed (they are identifiers); credential values never are. A source that
// fails is reported and skipped; the others still run.
//
// Usage:
//   cd backend && npx tsx scripts/emailOverlap.ts
// =============================================================================

import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SECRET_ENV, githubAppJwt, jiraBase, redact, type ProbeEnv } from '../src/connectors/probe/probes.js';
import { entraEmails } from '../src/connectors/entra/index.js';
import { overlapReport, type OverlapInput } from '../src/connectors/probe/overlap.js';
import { loadConnectorsEnv } from './platformProbe.js';

const UA = { 'User-Agent': 'Horquva-Probe/1.0' };
const MAX_PAGES = 200; // a runaway-pagination stop, far above a test org

type Account = OverlapInput['accounts'][number];

async function getJson(url: string, headers: Record<string, string>, secrets: string[]): Promise<any> {
  const res = await fetch(url, { headers: { ...UA, ...headers } });
  const text = await res.text();
  if (!res.ok) throw new Error(redact(`${new URL(url).pathname} → HTTP ${res.status}: ${text.slice(0, 200)}`, secrets));
  return text ? JSON.parse(text) : null;
}

async function entraDirectory(env: ProbeEnv, secrets: string[]): Promise<OverlapInput['directory']> {
  const form = new URLSearchParams({ client_id: env.ENTRA_CLIENT_ID!, client_secret: env.ENTRA_CLIENT_SECRET!, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' });
  const tokRes = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(env.ENTRA_TENANT_ID!)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const tok = await tokRes.json().catch(() => ({}));
  if (!tokRes.ok || typeof tok.access_token !== 'string') throw new Error(redact(`token → HTTP ${tokRes.status}: ${tok.error ?? ''} ${tok.error_description ?? ''}`, secrets));
  secrets.push(tok.access_token);
  const headers = { Authorization: `Bearer ${tok.access_token}` };
  const out: OverlapInput['directory'] = [];
  let next: string | null = 'https://graph.microsoft.com/v1.0/users?$select=id,mail,userPrincipalName,proxyAddresses,otherMails&$top=999';
  for (let i = 0; next && i < MAX_PAGES; i++) {
    const page = await getJson(next, headers, secrets);
    for (const u of page.value ?? []) out.push({ id: `person:entra:${u.id}`, emails: entraEmails(u) });
    next = page['@odata.nextLink'] ?? null;
  }
  return out;
}

async function slackAccounts(env: ProbeEnv, secrets: string[]): Promise<Account[]> {
  const headers = { Authorization: `Bearer ${env.SLACK_BOT_TOKEN}` };
  const out: Account[] = [];
  let cursor = '';
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await getJson(`https://slack.com/api/users.list?limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, headers, secrets);
    if (!page.ok) throw new Error(`users.list: ${page.error}`);
    for (const m of page.members ?? []) {
      if (m.is_bot || m.deleted || m.id === 'USLACKBOT') continue;
      out.push({ source: 'slack', accountId: m.id, email: m.profile?.email ?? null, login: m.name });
    }
    cursor = page.response_metadata?.next_cursor ?? '';
    if (!cursor) break;
  }
  return out;
}

async function jiraAccounts(env: ProbeEnv, secrets: string[]): Promise<Account[]> {
  const basic = Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString('base64');
  secrets.push(basic);
  const headers = { Authorization: `Basic ${basic}`, Accept: 'application/json' };
  const out: Account[] = [];
  for (let start = 0, i = 0; i < MAX_PAGES; i++, start += 100) {
    const page: any[] = await getJson(`${jiraBase(env.JIRA_SITE!)}/rest/api/3/users/search?startAt=${start}&maxResults=100`, headers, secrets);
    // Only real people: app and customer accounts never belong in the directory.
    for (const u of page) if (u.accountType === 'atlassian' && u.active !== false) out.push({ source: 'jira', accountId: u.accountId, email: u.emailAddress ?? null, login: u.displayName });
    if (page.length < 100) break;
  }
  return out;
}

async function githubToken(env: ProbeEnv, secrets: string[]): Promise<string> {
  if (env.GITHUB_TOKEN) return env.GITHUB_TOKEN;
  const jwt = githubAppJwt(env.GITHUB_APP_ID!, await readFile(env.GITHUB_APP_PRIVATE_KEY_PATH!, 'utf8'));
  secrets.push(jwt);
  const gh = { Authorization: `Bearer ${jwt}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const inst = await getJson(`https://api.github.com/orgs/${encodeURIComponent(env.GITHUB_ORG!)}/installation`, gh, secrets);
  const res = await fetch(`https://api.github.com/app/installations/${inst.id}/access_tokens`, { method: 'POST', headers: { ...UA, ...gh } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || typeof body.token !== 'string') throw new Error(`installation token → HTTP ${res.status}`);
  secrets.push(body.token);
  return body.token;
}

async function githubAccounts(env: ProbeEnv, secrets: string[]): Promise<Account[]> {
  const token = await githubToken(env, secrets);
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const out: Account[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const members: any[] = await getJson(`https://api.github.com/orgs/${encodeURIComponent(env.GITHUB_ORG!)}/members?per_page=100&page=${page}`, headers, secrets);
    // The members list has no email; GitHub only exposes a public profile email, if any.
    for (const m of members) out.push({ source: 'github', accountId: String(m.id), email: null, login: m.login });
    if (members.length < 100) break;
  }
  return out;
}

async function n8nAccounts(env: ProbeEnv, secrets: string[]): Promise<Account[]> {
  const base = env.N8N_BASE_URL!.replace(/\/+$/, '');
  const headers = { 'X-N8N-API-KEY': env.N8N_API_KEY!, Accept: 'application/json' };
  const out: Account[] = [];
  let cursor = '';
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await getJson(`${base}/api/v1/users?limit=250${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, headers, secrets);
    for (const u of page.data ?? []) out.push({ source: 'n8n', accountId: String(u.id), email: u.email ?? null });
    cursor = page.nextCursor ?? '';
    if (!cursor) break;
  }
  return out;
}

const SOURCES: Array<{ name: string; needs: string[]; run: (env: ProbeEnv, secrets: string[]) => Promise<Account[]> }> = [
  { name: 'slack', needs: ['SLACK_BOT_TOKEN'], run: slackAccounts },
  { name: 'jira', needs: ['JIRA_SITE', 'JIRA_EMAIL', 'JIRA_API_TOKEN'], run: jiraAccounts },
  { name: 'github', needs: ['GITHUB_ORG'], run: githubAccounts },
  { name: 'n8n', needs: ['N8N_BASE_URL', 'N8N_API_KEY'], run: n8nAccounts },
];

async function main(): Promise<void> {
  const env: ProbeEnv = loadConnectorsEnv();
  const secrets = SECRET_ENV.map((k) => env[k] ?? '').filter(Boolean);
  const has = (names: string[]) => names.every((n) => env[n]?.trim());

  if (!has(['ENTRA_TENANT_ID', 'ENTRA_CLIENT_ID', 'ENTRA_CLIENT_SECRET'])) {
    console.error('[overlap] Entra credentials are not set in backend/.env.connectors: there is no directory to match against.');
    process.exit(1);
  }
  const directory = await entraDirectory(env, secrets);
  console.log(`Directory (Entra): ${directory.length} people, ${directory.reduce((n, d) => n + d.emails.length, 0)} addresses\n`);

  const accounts: Account[] = [];
  for (const s of SOURCES) {
    if (!has(s.needs) || (s.name === 'github' && !env.GITHUB_TOKEN && !has(['GITHUB_APP_ID', 'GITHUB_APP_PRIVATE_KEY_PATH']))) {
      console.log(`${s.name}: skipped (credentials not set)`);
      continue;
    }
    try {
      accounts.push(...(await s.run(env, secrets)));
    } catch (err) {
      console.log(`${s.name}: failed: ${redact(err instanceof Error ? err.message : String(err), secrets)}`);
    }
  }

  const report = overlapReport({ directory, accounts });
  console.log('\nsource   total  exact  no email  unmatched');
  for (const [src, r] of Object.entries(report.perSource)) {
    console.log(`${src.padEnd(8)} ${String(r.total).padStart(5)}  ${String(r.exactMatch).padStart(5)}  ${String(r.noEmail).padStart(8)}  ${String(r.unmatched.length).padStart(9)}`);
  }
  for (const [src, r] of Object.entries(report.perSource)) {
    if (!r.unmatched.length) continue;
    console.log(`\nUnmatched in ${src}:`);
    for (const u of r.unmatched) console.log(`  ${u.accountId}  ${u.email ?? '(no email)'}${u.login ? `  ${u.login}` : ''}  [${u.reason}]`);
  }
  if (report.conflicts.length) {
    console.log('\nAddresses shared by several directory records:');
    for (const c of report.conflicts) console.log(`  ${c.email}: ${c.directoryIds.join(', ')}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error('[overlap] failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
