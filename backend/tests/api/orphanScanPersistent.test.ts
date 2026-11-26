import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import http from 'node:http';
import type { CanonicalEdge, CanonicalEntity, CanonicalFact, IdentityLink } from '@horquva/types';

vi.mock('../../src/db/client.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/db/client.js')>();
  return {
    ...actual,
    query: vi.fn(async (sql: string) => {
      if (sql.includes('FROM connection')) {
        return { rows: [{ id: 'conn:entra', type: 'entra', name: 'Entra ID' }], rowCount: 1 } as any;
      }
      return { rows: [], rowCount: 0 } as any;
    }),
  };
});

import { app } from '../../src/server.js';
import { authedFetch } from '../helpers/session.js';
import { DataService } from '../../src/services/dataService.js';
import * as graphRepo from '../../src/repositories/graphRepository.js';
import { ContinuityGraph } from '../../src/domain/graph/index.js';
import { attributeAccounts } from '../../src/domain/identity/attribution.js';

const NOW = new Date('2026-11-10T12:00:00Z');

const entity = (
  id: string,
  kind: CanonicalEntity['kind'],
  name: string,
  externalRefs: Record<string, string> = {}
): CanonicalEntity => ({
  id,
  kind,
  name,
  externalRefs,
  createdAt: NOW,
  updatedAt: NOW,
});

const edge = (
  id: string,
  fromId: string,
  type: CanonicalEdge['type'],
  toId: string,
  grade: CanonicalEdge['grade'] = 'stated'
): CanonicalEdge => ({
  id,
  fromId,
  toId,
  type,
  grade,
  source: 'connector:n8n',
  validFrom: NOW,
  validTo: null,
});

const fact = (
  entityId: string,
  attribute: CanonicalFact['attribute'],
  value: unknown
): CanonicalFact => ({
  entityId,
  attribute,
  value,
  grade: 'stated',
  source: 'connector:entra',
  validFrom: NOW,
  validTo: null,
});

describe('GET /api/continuity/orphan-scan persistent-mode consistency & fallback logging', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${(server.address() as any).port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    DataService.resetInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses fresh DB graph and active links when a link was closed in Postgres (detects owner_not_in_directory)', async () => {
    const ds = DataService.getInstance();
    const priya = entity('person:entra:p1', 'person', 'Priya Active', { entraId: 'e-p1' });
    const acc = entity('account:n8n:u1', 'account', 'Priya n8n', { source: 'n8n' });
    const wf = entity('automation:n8n:w1', 'automation', 'Orphaned After Unlink');
    const priyaStatus = fact(priya.id, 'status', 'active');

    // Stale ds.getGraph() still thinks acc is linked to priya.
    const oldLink: IdentityLink = {
      id: 'link-old',
      accountId: acc.id,
      personId: priya.id,
      grade: 'stated',
      method: 'exact_email',
      linkedBy: 'autoLink',
      note: null,
      validFrom: NOW,
      validTo: null,
    };
    const staleAttr = attributeAccounts(
      {
        entities: [priya, acc, wf],
        edges: [edge('e1', acc.id, 'owns', wf.id)],
        facts: [priyaStatus],
      },
      [oldLink]
    );
    (ds as any).graph = ContinuityGraph.fromSnapshot(
      staleAttr.entities,
      staleAttr.edges,
      staleAttr.facts,
      { linkedAccountIds: [acc.id] }
    );

    // Fresh DB snapshot has the link closed (listActive() = []).
    vi.spyOn(ds, 'isPersistent').mockReturnValue(true);
    vi.spyOn(graphRepo, 'loadActiveGraph').mockResolvedValue({
      entities: [priya, acc, wf],
      edges: [edge('e1', acc.id, 'owns', wf.id)],
      facts: [priyaStatus],
    });
    vi.spyOn(ds.getLinkRepository(), 'listActive').mockResolvedValue([]);

    const res = await authedFetch(`${baseUrl}/api/continuity/orphan-scan`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'owner_not_in_directory',
          asset: expect.objectContaining({ id: wf.id }),
          owner: expect.objectContaining({ id: acc.id, reason: 'not_in_directory' }),
        }),
      ])
    );
  });

  it('uses fresh DB graph and active links when a new link points to a departed person (detects key_owner_gone)', async () => {
    const ds = DataService.getInstance();
    const omar = entity('person:entra:gone1', 'person', 'Omar Gone', { entraId: 'e-gone1', accountEnabled: 'false' });
    const acc = entity('account:openai:u2', 'account', 'Omar OpenAI', { source: 'openai' });
    const key = entity('credential:openai:k_gone', 'credential', 'Departed Key', { vendor: 'openai' });
    const omarStatus = fact(omar.id, 'status', 'departed');

    // Stale ds.getGraph() has acc unlinked (no omar -> key attributed edge).
    (ds as any).graph = ContinuityGraph.fromSnapshot(
      [omar, acc, key],
      [edge('ek1', acc.id, 'owns', key.id)],
      [omarStatus]
    );

    const freshLink: IdentityLink = {
      id: 'link-gone',
      accountId: acc.id,
      personId: omar.id,
      grade: 'confirmed',
      method: 'admin_link',
      linkedBy: 'user:admin',
      note: null,
      validFrom: NOW,
      validTo: null,
    };

    vi.spyOn(ds, 'isPersistent').mockReturnValue(true);
    vi.spyOn(graphRepo, 'loadActiveGraph').mockResolvedValue({
      entities: [omar, acc, key],
      edges: [edge('ek1', acc.id, 'owns', key.id)],
      facts: [omarStatus],
    });
    vi.spyOn(ds.getLinkRepository(), 'listActive').mockResolvedValue([freshLink]);

    const res = await authedFetch(`${baseUrl}/api/continuity/orphan-scan`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'key_owner_gone',
          asset: expect.objectContaining({ id: key.id }),
          owner: expect.objectContaining({ id: omar.id, reason: 'account_disabled' }),
        }),
      ])
    );
  });

  it('logs a console.warn when loadGraphFromDatabase falls back to ds.getGraph()', async () => {
    const ds = DataService.getInstance();
    vi.spyOn(ds, 'isPersistent').mockReturnValue(true);
    vi.spyOn(graphRepo, 'loadActiveGraph').mockRejectedValue(new Error('pg connection refused'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const res = await authedFetch(`${baseUrl}/api/continuity/overview`);
    expect(res.status).toBe(200);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/loadGraphFromDatabase|fallback|database/i);
  });
});
