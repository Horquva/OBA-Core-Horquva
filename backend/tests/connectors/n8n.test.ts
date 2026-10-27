// n8n connector mapping against n8n's real public-API response shape
// (tests/fixtures/n8nPublicApi.json): ownership through shared[] + project
// members, cursor pagination, and personal-credential edges.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { N8nConnector } from '../../src/connectors/n8n/index.js';
import type { SyncResult } from '../../src/connectors/sdk/types.js';

const api = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../fixtures/n8nPublicApi.json'), 'utf-8'));

/** The fake server returns at most 2 items per page, so every list must be paged with nextCursor. */
const PAGE = 2;
let server: http.Server;
let base: string;
const requests: URL[] = [];

function page(items: unknown[], url: URL) {
  const limit = Number(url.searchParams.get('limit') ?? 100);
  const offset = Number(url.searchParams.get('cursor') ?? 0);
  const size = Math.min(limit, PAGE);
  const next = offset + size < items.length ? String(offset + size) : null;
  return { data: items.slice(offset, offset + size), nextCursor: next };
}

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url!, 'http://x');
    requests.push(url);
    const send = (status: number, body: unknown) => res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    if (req.headers['x-n8n-api-key'] !== 'test-key') return send(401, { message: 'unauthorized' });

    const p = url.pathname;
    if (p === '/api/v1/users') {
      const projectId = url.searchParams.get('projectId');
      const users = projectId
        ? (api.projectMembers[projectId] ?? []).map((id: string) => api.users.find((u: any) => u.id === id))
        : api.users;
      return send(200, page(users, url));
    }
    if (p === '/api/v1/credentials') return send(200, page(api.credentials, url));
    if (p === '/api/v1/workflows') return send(200, page(api.workflows, url));
    const wf = p.match(/^\/api\/v1\/workflows\/([^/]+)$/);
    if (wf) {
      const found = api.workflows.find((w: any) => w.id === wf[1]);
      return found ? send(200, found) : send(404, { message: 'not found' });
    }
    send(404, { message: `no route ${p}` });
  });
  await new Promise<void>((r) => server.listen(0, () => r()));
  base = `http://localhost:${(server.address() as any).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

async function sync(): Promise<SyncResult> {
  requests.length = 0;
  return new N8nConnector('conn_n8n', 'n8n', { baseUrl: base, apiKey: 'test-key' }).sync();
}

const edgesOf = (r: SyncResult, type: string) =>
  r.edges.filter((e) => e.type === type).map((e) => `${e.fromId} -> ${e.toId}`).sort();

describe('N8nConnector.sync against the public API shape', () => {
  it('follows nextCursor, so lists longer than one page are read in full', async () => {
    const r = await sync();
    expect(r.entities.filter((e) => e.kind === 'automation').map((e) => e.id).sort()).toEqual([
      'automation:n8n:wf-alerts',
      'automation:n8n:wf-drafts',
      'automation:n8n:wf-invoices',
    ]);
    expect(r.entities.filter((e) => e.kind === 'credential')).toHaveLength(3);
    expect(r.entities.filter((e) => e.kind === 'person').map((e) => e.id).sort()).toEqual([
      'person:maya@acme.com',
      'person:omar@acme.com',
      'person:sam@acme.com',
    ]);
    expect(requests.some((u) => u.pathname === '/api/v1/workflows' && u.searchParams.get('cursor') === '2')).toBe(true);
    for (const u of requests) {
      if (u.searchParams.has('limit')) expect(Number(u.searchParams.get('limit'))).toBeLessThanOrEqual(250);
    }
  });

  it('reads workflow owners from shared[] workflow:owner via the owning project\'s single member', async () => {
    const r = await sync();
    expect(edgesOf(r, 'owns')).toEqual([
      'person:maya@acme.com -> automation:n8n:wf-drafts',
      'person:omar@acme.com -> automation:n8n:wf-invoices',
    ]);
    expect(r.edges.filter((e) => e.type === 'owns').every((e) => e.grade === 'stated')).toBe(true);
  });

  it('leaves a workflow owned by a shared project without an owner edge (unknown, never guessed)', async () => {
    const r = await sync();
    expect(r.edges.some((e) => e.type === 'owns' && e.toId === 'automation:n8n:wf-alerts')).toBe(false);
    expect(r.entities.find((e) => e.id === 'automation:n8n:wf-alerts')?.externalRefs.n8nProject).toBe('p-ops');
  });

  it('links a workflow to the person whose personal credential it runs on', async () => {
    const r = await sync();
    expect(edgesOf(r, 'runs_on_credentials_of')).toEqual([
      'automation:n8n:wf-drafts -> person:maya@acme.com',
      'automation:n8n:wf-invoices -> person:maya@acme.com',
      'automation:n8n:wf-invoices -> person:omar@acme.com',
    ]);
    // Every runs_on_credentials_of edge points at a person: that is what every consumer assumes.
    expect(r.edges.filter((e) => e.type === 'runs_on_credentials_of').every((e) => e.toId.startsWith('person:'))).toBe(true);
  });

  it('records which credential each workflow uses as a depends_on edge', async () => {
    const r = await sync();
    expect(edgesOf(r, 'depends_on')).toEqual([
      'automation:n8n:wf-alerts -> credential:n8n:c-slack',
      'automation:n8n:wf-drafts -> credential:n8n:c-openai',
      'automation:n8n:wf-invoices -> credential:n8n:c-gsheets',
      'automation:n8n:wf-invoices -> credential:n8n:c-openai',
    ]);
  });

  it('reads status from activeVersionId (active is deprecated)', async () => {
    const r = await sync();
    const status = (id: string) => r.facts.find((f) => f.entityId === id && f.attribute === 'status')?.value;
    expect(status('automation:n8n:wf-invoices')).toBe('active');
    expect(status('automation:n8n:wf-drafts')).toBe('inactive');
  });

  it('only resolves the projects that own something, and never calls licence-gated project endpoints', async () => {
    await sync();
    const lookups = requests.filter((u) => u.pathname === '/api/v1/users' && u.searchParams.has('projectId'));
    expect(new Set(lookups.map((u) => u.searchParams.get('projectId')))).toEqual(new Set(['p-omar', 'p-maya', 'p-ops']));
    expect(requests.some((u) => u.pathname.startsWith('/api/v1/projects'))).toBe(false);
  });
});
