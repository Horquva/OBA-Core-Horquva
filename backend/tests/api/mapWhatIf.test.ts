// =============================================================================
// Horquva Continuity Platform — Map + What-If (Sprint 2 D10)
// =============================================================================
// Hand-checked against tests/fixtures/handCheckableTruth.json:
//   105 AI Ticket Routing --calls_model--> GPT-4o
//   105 --runs_on_credentials_of--> David
//   So: GPT-4o failing stops 105; David leaving stops 105; 105 failing stops nothing.
//   Omar owns 101 (critical, 500/wk) + 102 (critical, 120/wk), no backups.
//   Chen owns 106 (low) and backs up 103 (Maya still owns it).
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { ContinuityGraph } from '../../src/domain/graph/index.js';
import { SimulationEngine } from '../../src/domain/simulation/index.js';
import { authedFetch } from '../helpers/session.js';

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

async function call(method: string, path: string, body?: unknown) {
  const res = await authedFetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

const names = (refs: Array<{ name: string }>) => refs.map((r) => r.name);

describe('Map: blast radius direction (UI-05)', () => {
  it('a model going down breaks the automations that call it', async () => {
    const { body } = await call('GET', `/api/graph/blast-radius?root=${encodeURIComponent('model:openai:gpt-4o')}`);
    expect(names(body.downstream)).toEqual(['AI Ticket Routing']);
    expect(body.upstream).toEqual([]);
  });

  it("an automation's upstream is what it needs; nothing depends on it", async () => {
    const { body } = await call('GET', `/api/graph/blast-radius?root=${encodeURIComponent('automation:n8n:105')}`);
    expect(body.downstream).toEqual([]);
    expect(names(body.upstream)).toEqual(['David Miller', 'OpenAI GPT-4o']);
  });

  it('a person whose credentials an automation runs on takes it down with them', async () => {
    const { body } = await call('GET', `/api/graph/blast-radius?root=${encodeURIComponent('person:david@acme.com')}`);
    expect(body.downstream).toEqual([{ id: 'automation:n8n:105', kind: 'automation', name: 'AI Ticket Routing' }]);
  });

  it('rejects bad hops and unknown roots', async () => {
    expect((await call('GET', `/api/graph/neighbourhood?root=${encodeURIComponent('automation:n8n:105')}&hops=3`)).status).toBe(400);
    expect((await call('GET', '/api/graph/neighbourhood?root=w-1')).status).toBe(404);
  });
});

describe('What-If: combined scenario (S4, SIM-03)', () => {
  const combined = (body: unknown) => call('POST', '/api/continuity/simulations/combined', body);

  it('Omar leaving + GPT-4o down: two orphaned critical assets, 105 stopped, 3,120 runs/wk', async () => {
    const { status, body } = await combined({ departingPersonIds: ['person:omar@acme.com'], unavailableIds: ['model:openai:gpt-4o'] });
    expect(status).toBe(200);
    expect(body.orphanedCriticalAssets.map((o: any) => [o.asset.id, o.criticality, o.priorOwner.name])).toEqual([
      ['automation:n8n:101', 'critical', 'Omar Farooq'],
      ['automation:n8n:102', 'critical', 'Omar Farooq'],
    ]);
    expect(body.stoppedAutomations).toEqual([
      { workflow: { id: 'automation:n8n:105', kind: 'automation', name: 'AI Ticket Routing' }, credentialOwner: null, weeklyRuns: 2500 },
    ]);
    expect(body.runsPerWeekAffected).toBe(3120);
    expect(body.runsUnknownCount).toBe(0);
  });

  it('a low-criticality asset is not reported as "orphaned critical"', async () => {
    const { body } = await combined({ departingPersonIds: ['person:chen@acme.com'] });
    expect(body.orphanedCriticalAssets).toEqual([]); // 106 is low; 103 still has Maya
  });

  it('rejects an empty selection, unknown ids, and non-people as leavers', async () => {
    expect((await combined({})).status).toBe(400);
    expect((await combined({ departingPersonIds: ['p-1'] })).status).toBe(400);
    expect((await combined({ departingPersonIds: ['model:openai:gpt-4o'] })).status).toBe(400);
  });
});

describe('What-If: unknowns and cascades (engine)', () => {
  const now = '2025-01-01T00:00:00Z';
  const graph = ContinuityGraph.fromSnapshot(
    [
      { id: 'a:upstream', kind: 'automation', name: 'Upstream Feed' },
      { id: 'a:report', kind: 'automation', name: 'Weekly Report' },
    ] as any,
    [{ id: 'e1', fromId: 'a:report', toId: 'a:upstream', type: 'depends_on', grade: 'stated', source: 'n8n', validFrom: now }] as any,
    [{ entityId: 'a:report', attribute: 'run_volume_weekly', value: 7, grade: 'stated', source: 'n8n', validFrom: now }] as any,
  );

  it('a missing run volume is unknown, never 0; dependants cascade', () => {
    const r = new SimulationEngine(graph).simulateCombined({ failingAssetIds: ['a:upstream'] });
    expect(r.stoppedAutomations[0]).toMatchObject({ workflow: { id: 'a:upstream' }, weeklyRuns: null });
    expect(r.runsPerWeekAffected).toBe(0);
    expect(r.runsUnknownCount).toBe(1);
    expect(r.unknownFactsEncountered).toBe(1);
    expect(r.downstream.map((d) => d.id)).toEqual(['a:report']);
  });
});

describe('What-If: worst single losses (S6, SEC-07)', () => {
  it('ranks GPT-4o by what it stops; people are only an aggregate count', async () => {
    const { body } = await call('GET', '/api/continuity/simulations/worst-losses');
    expect(body.vendorsAndModels).toEqual([
      { entity: { id: 'model:openai:gpt-4o', kind: 'model', name: 'OpenAI GPT-4o' }, automationsHalted: 1, runsPerWeekAffected: 2500, runsUnknownCount: 0 },
    ]);
    expect(body.peopleHoldingManyUnbacked).toBe(1); // Omar (101, 102); Sarah has departed
    expect(JSON.stringify(body)).not.toMatch(/Omar|person:/);
  });
});
