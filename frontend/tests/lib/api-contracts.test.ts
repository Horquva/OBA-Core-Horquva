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
    await expect(overview.fetchCoverage()).resolves.toEqual({ total: 52, covered: 38, exposed: 14, unknown: null, definition: 'd' });
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
    ['connections', () => settings.fetchConnections(), { connections: [] }, '/api/connections', 'GET'],
    ['identity', () => settings.fetchIdentityQueue(), { items: [] }, '/api/identity-queue', 'GET'],
  ])('%s hits the contract path', async (_n, fn, body, url, method) => {
    const spy = respond(body);
    await fn();
    expect(call(spy)).toMatchObject({ url, method });
  });

  it('routes a people-only scenario to the existing leaver endpoint', async () => {
    const spy = respond({ result: { orphanedCriticalAssets: [], stoppedPersonalCredentialAutomations: [], totalRunsPerWeekAffected: 0, affectedDownstreamAssetIds: [], unknownFactsEncountered: 0 } });
    await sims.runScenario({ people: [{ id: 'person:a', kind: 'person', name: 'A' }], unavailable: [], failing: [] });
    expect(call(spy)).toMatchObject({ url: '/api/continuity/simulations/leaver', method: 'POST' });
  });

  it('routes a combined scenario to the planned combined endpoint', async () => {
    const spy = respond({ orphanedCriticalAssets: [], stoppedAutomations: [], runsPerWeekAffected: 0, downstream: [], unknownFactsEncountered: 0 });
    await sims.runScenario({
      people: [{ id: 'person:a', kind: 'person', name: 'A' }],
      unavailable: [{ id: 'vendor:openai', kind: 'vendor', name: 'OpenAI' }], failing: [],
    });
    expect(call(spy).url).toBe('/api/continuity/simulations/combined');
  });

  it('falls back to the legacy attestation endpoint and refuses to write "Don’t know" there', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('<pre>Cannot GET</pre>', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        task: { id: 't1', assetEntityId: 'automation:1', status: 'pending' }, assetName: 'Invoice sync',
        reviewerName: 'Sara', reviewerEmail: 's@acme.com',
      }), { status: 200 }));
    const s = await attest.fetchAttestSession('tok');
    expect(s.legacy).toBe(true);
    expect(s.assets[0].asset.name).toBe('Invoice sync');
    expect(call(spy, 1).url).toBe('/api/attestation/review/tok');
    expect(() => attest.saveAttestAnswers(s, 't1', {
      isOwner: true, ownerPersonId: null, backup: { kind: 'none' }, criticality: 'high', criticalityReason: 'r',
      runbook: { kind: 'not_documented' }, fallback: 'unknown',
    })).toThrow(attest.UnsupportedAnswerError);
  });
});
