// =============================================================================
// Horquva Continuity Platform — GET /api/departures/at-risk
// =============================================================================
// Hand-checked against handCheckableTruth.json: Omar owns 101 (critical, 500/wk)
// and 102 (critical, 120/wk), neither backed up. 105 "AI Ticket Routing" runs on
// David's personal credentials (2,500/wk). Sarah's demo departure is in the past.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { DataService } from '../../src/services/dataService.js';
import { authedFetch } from '../helpers/session.js';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  DataService.resetInstance();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${(server.address() as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  DataService.resetInstance();
});

const post = (path: string, body: unknown) =>
  authedFetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const atRisk = async () => (await (await authedFetch(`${baseUrl}/api/departures/at-risk`)).json()) as any;

describe('GET /api/departures/at-risk', () => {
  it('is empty when no open departure leaves critical work uncovered (past departures do not count)', async () => {
    const body = await atRisk();
    expect(body.assets).toEqual([]);
    expect(body.totals).toEqual({ assets: 0, runsPerWeek: 0, unknownRuns: 0, personalCredential: 0, keys: 0, people: 0 });
  });

  it("lists a leaver's unbacked critical assets and what runs on their credentials, soonest leaver first", async () => {
    const soon = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const later = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10);
    expect((await post('/api/departures', { personId: 'person:david@acme.com', leaveDate: later })).status).toBe(201);
    expect((await post('/api/departures', { personId: 'person:omar@acme.com', leaveDate: soon })).status).toBe(201);

    const { assets, totals } = await atRisk();
    const ids = assets.map((a: any) => a.asset.id);
    // Omar leaves first: his two critical assets, busiest first; then David's credential-bound automation.
    expect(ids.slice(0, 2)).toEqual(['automation:n8n:101', 'automation:n8n:102']);
    expect(ids).toContain('automation:n8n:105');

    const billing = assets.find((a: any) => a.asset.id === 'automation:n8n:101');
    expect(billing).toMatchObject({ owner: { id: 'person:omar@acme.com' }, noSuccessor: true, runsPerWeek: 500, successor: null });
    const routing = assets.find((a: any) => a.asset.id === 'automation:n8n:105');
    expect(routing).toMatchObject({ owner: { id: 'person:david@acme.com' }, personalCredential: true, runsPerWeek: 2500 });

    expect(totals.people).toBe(2);
    expect(totals.personalCredential).toBeGreaterThanOrEqual(1);
    expect(totals.runsPerWeek).toBe(assets.reduce((n: number, a: any) => n + (a.runsPerWeek ?? 0), 0));
  });

  it('an accepted successor takes the asset off the list', async () => {
    const before = await atRisk();
    const omar = before.assets.find((a: any) => a.asset.id === 'automation:n8n:102');
    const dep = DataService.getInstance().getDeparture(omar.departureId)!;
    const h = dep.handovers.find((x) => x.assetId === 'automation:n8n:102')!;
    h.successorId = 'person:chen@acme.com';
    h.acceptance = 'accepted';

    const after = await atRisk();
    expect(after.assets.some((a: any) => a.asset.id === 'automation:n8n:102')).toBe(false);
  });

  it("lists the AI vendor keys a leaver owns, in the pack but without a handover row", async () => {
    const ds = DataService.getInstance();
    const graph = ds.getGraph();
    const now = new Date();
    graph.addEntity(
      { id: 'credential:openai:key_chen', kind: 'credential', name: 'Chen prod key', externalRefs: { vendor: 'openai' }, createdAt: now, updatedAt: now },
      [{ entityId: 'credential:openai:key_chen', attribute: 'last_used_at', value: '2026-10-30T09:00:00Z', grade: 'stated', source: 'connector:ai_admin', validFrom: now }]
    );
    graph.addEdge({ fromId: 'person:chen@acme.com', toId: 'credential:openai:key_chen', type: 'owns', grade: 'stated', source: 'connector:ai_admin', ownerKind: 'key_principal', validFrom: now });

    const leaveDate = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
    const res = await post('/api/departures', { personId: 'person:chen@acme.com', leaveDate });
    expect(res.status).toBe(201);
    const { id } = (await res.json()) as any;

    const { assets, totals } = await atRisk();
    expect(assets.find((a: any) => a.asset.id === 'credential:openai:key_chen')).toMatchObject({
      owner: { id: 'person:chen@acme.com' }, departureId: id, vendorKey: true, noSuccessor: false, personalCredential: false,
    });
    expect(totals.keys).toBe(1);

    // Handover rows are for what a successor takes over; a key is rotated, so it is in the pack instead.
    const dep = ds.getDeparture(id)!;
    expect(dep.handovers.some((h) => h.assetId === 'credential:openai:key_chen')).toBe(false);
    expect(dep.handoverPack?.keys).toEqual([
      { keyId: 'credential:openai:key_chen', keyName: 'Chen prod key', ownerId: 'person:chen@acme.com', vendor: 'openai', lastUsedAt: '2026-10-30T09:00:00.000Z' },
    ]);
  });
});
