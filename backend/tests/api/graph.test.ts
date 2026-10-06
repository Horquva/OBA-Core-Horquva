// =============================================================================
// Horquva Continuity Platform — Graph REST API Vitest Suite
// =============================================================================
// Tests SRS Graph Endpoints:
// - GET /api/graph/neighbourhood (2-hop BFS ego-graph extraction)
// - GET /api/graph/blast-radius (Downstream and upstream reachability)
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { authedFetch } from '../helpers/session.js';

describe('Graph REST API', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET /api/graph/neighbourhood extracts 2-hop neighbourhood around root node', async () => {
    const rootId = 'automation:n8n:105'; // Has owner David, calls model GPT-4o
    const res = await authedFetch(`${baseUrl}/api/graph/neighbourhood?root=${encodeURIComponent(rootId)}&hops=2`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.rootId).toBe(rootId);
    expect(Array.isArray(body.nodes)).toBe(true);
    expect(Array.isArray(body.edges)).toBe(true);
    expect(body.nodes.length).toBeGreaterThanOrEqual(2);

    const nodeIds = body.nodes.map((n: any) => n.id);
    expect(nodeIds).toContain(rootId);
    expect(nodeIds).toContain('person:david@acme.com');
  });

  it('GET /api/graph/blast-radius returns downstream and upstream reachable nodes', async () => {
    const rootId = 'model:openai:gpt-4o';
    const res = await authedFetch(`${baseUrl}/api/graph/blast-radius?root=${encodeURIComponent(rootId)}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.rootId).toBe(rootId);
    expect(Array.isArray(body.downstream)).toBe(true);
    expect(Array.isArray(body.upstream)).toBe(true);
  });
});
