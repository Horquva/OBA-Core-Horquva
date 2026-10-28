import { afterEach, describe, expect, it, vi } from 'vitest';
import * as overview from '@/lib/api/overview';
import * as changes from '@/lib/api/changes';
import * as assets from '@/lib/api/assets';
import * as actions from '@/lib/api/actions';
import * as confirmations from '@/lib/api/confirmations';
import * as departures from '@/lib/api/departures';
import * as people from '@/lib/api/people';
import * as graph from '@/lib/api/graph';
import * as sims from '@/lib/api/simulations';
import * as assistant from '@/lib/api/assistant';
import * as reviewer from '@/lib/api/reviewer';
import * as settings from '@/lib/api/settings';
import * as attest from '@/lib/api/attest';

function respond(body: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));
}
const call = (spy: ReturnType<typeof respond>, i = 0) => ({
  url: String(spy.mock.calls[i][0]).replace('http://localhost:4000', ''),
  method: (spy.mock.calls[i][1] as RequestInit | undefined)?.method ?? 'GET',
  body: (spy.mock.calls[i][1] as RequestInit | undefined)?.body,
});

describe('API contracts', () => {
  afterEach(() => vi.restoreAllMocks());

  it('adapts existing overview metrics; unknown stays null until B-01', async () => {
    respond({ metrics: { totalCriticalAssets: 52, fullyCoveredCriticalAssets: 38, exposedCriticalAssets: 14, unknownCriticalFacts: 5, definition: 'd' } });
    await expect(overview.fetchCoverage()).resolves.toEqual({ total: 52, covered: 38, exposed: 14, unknown: null, definition: 'd', trend: null, exposureByCause: [] });
  });

  it('passes the week-on-week trend through', async () => {
    const trend = { comparedTo: '2026-10-06', covered: 1, exposed: -1, unknown: 0 };
    respond({ metrics: { totalCriticalAssets: 4, fullyCoveredCriticalAssets: 1, exposedCriticalAssets: 3, unknownCriticalFacts: 0, definition: 'd' }, trend });
    await expect(overview.fetchCoverage()).resolves.toMatchObject({ trend });
  });

  it('uses unknownCriticalAssets once the backend sends it', async () => {
    respond({ metrics: { totalCriticalAssets: 52, fullyCoveredCriticalAssets: 38, exposedCriticalAssets: 9, unknownCriticalFacts: 5, unknownCriticalAssets: 5, definition: 'd' } });
    await expect(overview.fetchCoverage()).resolves.toMatchObject({ exposed: 9, unknown: 5 });
  });

  it('maps snake_case campaigns', async () => {
    respond({ campaigns: [{ id: 'c1', name: 'Q4', status: 'active', due_date: '2026-10-08', created_at: '2026-10-01', total_tasks: '4', completed_tasks: '1' }] });
    await expect(confirmations.fetchCampaigns()).resolves.toEqual([
      { id: 'c1', name: 'Q4', status: 'active', dueDate: '2026-10-08', createdAt: '2026-10-01', totalTasks: 4, completedTasks: 1 },
    ]);
  });

  it.each([
    ['changes', () => changes.fetchChanges(), { events: [] }, '/api/changes?acknowledged=false', 'GET'],
    ['ack', () => changes.acknowledgeChange('e/1'), {}, '/api/changes/e%2F1/ack', 'POST'],
    ['assets', () => assets.fetchAssets(), { assets: [] }, '/api/assets', 'GET'],
    ['actions', () => actions.fetchActions({ status: 'open', limit: 3 }), { actions: [] }, '/api/actions?status=open&limit=3', 'GET'],
    ['departures', () => departures.fetchDepartures(), { departures: [] }, '/api/departures', 'GET'],
    ['teams', () => people.fetchTeams(), { teams: [], minGroupSize: 5 }, '/api/people/teams', 'GET'],
    ['neighbourhood', () => graph.fetchNeighbourhood('a:1'), { rootId: 'a:1', nodes: [], edges: [] }, '/api/graph/neighbourhood?root=a%3A1&hops=2', 'GET'],
    ['worst', () => sims.fetchWorstLosses(), { vendorsAndModels: [], peopleHoldingManyUnbacked: 0, threshold: 3 }, '/api/continuity/simulations/worst-losses', 'GET'],
    ['convos', () => assistant.fetchConversations(), { conversations: [] }, '/api/assistant/conversations', 'GET'],
    ['tasks', () => reviewer.fetchReviewerTasks(), { confirmations: [], handovers: [] }, '/api/me/tasks', 'GET'],
    ['connections', () => settings.fetchConnections(), { store: 'unavailable', connections: [], sources: [] }, '/api/connections', 'GET'],
    ['identity', () => settings.fetchIdentityQueue(), { items: [] }, '/api/identity-queue', 'GET'],
    ['orphan scan', () => overview.fetchOrphanScan(), { findings: [] }, '/api/continuity/orphan-scan', 'GET'],
  ])('%s hits the contract path', async (_n, fn, body, url, method) => {
    const spy = respond(body);
    await fn();
    expect(call(spy)).toMatchObject({ url, method });
  });

  it('sends a people-only scenario to the combined endpoint too (one shape, real names)', async () => {
    const spy = respond({ orphanedCriticalAssets: [], stoppedAutomations: [], runsPerWeekAffected: 0, runsUnknownCount: 0, downstream: [], unknownFactsEncountered: 0 });
    await sims.runScenario({ people: [{ id: 'person:a', kind: 'person', name: 'A' }], unavailable: [], failing: [] });
    expect(call(spy)).toMatchObject({ url: '/api/continuity/simulations/combined', method: 'POST' });
  });

  it('routes a combined scenario to the combined endpoint', async () => {
    const spy = respond({ orphanedCriticalAssets: [], stoppedAutomations: [], runsPerWeekAffected: 0, downstream: [], unknownFactsEncountered: 0 });
    await sims.runScenario({
      people: [{ id: 'person:a', kind: 'person', name: 'A' }],
      unavailable: [{ id: 'vendor:openai', kind: 'vendor', name: 'OpenAI' }], failing: [],
    });
    expect(call(spy).url).toBe('/api/continuity/simulations/combined');
  });

  it('reads the magic-link session and saves answers on /api/attest (no legacy fallback)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        reviewer: { name: 'Sara', email: 's@acme.com' }, requestedBy: 'Alex', company: null,
        expired: false, submitted: false,
        assets: [{ taskId: 't1', asset: { id: 'automation:1', kind: 'automation', name: 'Invoice sync' }, status: 'todo' }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const s = await attest.fetchAttestSession('tok');
    expect(call(spy).url).toBe('/api/attest/tok');
    expect(s).toMatchObject({ token: 'tok', assets: [{ taskId: 't1' }] });
    await attest.saveAttestAnswers(s, 't1', { isOwner: false, ownerPersonId: null });
    expect(call(spy, 1)).toMatchObject({ url: '/api/attest/tok/tasks/t1', method: 'PUT' });
  });
});
