import type { SuccessionTestResult, WhatIfScenarioResult } from '@horquva/types';
import type { EntityRef, ScenarioResult, ScenarioSelection, SuccessionTestView, WorstLosses } from '@/types/view';
import { request } from './client';
import { lookupEntityName } from './entities';

function ref(id: string, kind: EntityRef['kind']): EntityRef {
  return { id, kind, name: lookupEntityName(id) };
}

function fromLeaver(r: WhatIfScenarioResult): ScenarioResult {
  return {
    orphanedCriticalAssets: r.orphanedCriticalAssets.map((a) => ({
      asset: { id: a.entityId, kind: 'automation', name: a.name },
      priorOwner: a.priorOwnerId ? ref(a.priorOwnerId, 'person') : null,
      criticality: a.criticality,
    })),
    stoppedAutomations: r.stoppedPersonalCredentialAutomations.map((s) => ({
      workflow: { id: s.workflowId, kind: 'automation', name: s.workflowName },
      credentialOwner: s.credentialOwnerId ? ref(s.credentialOwnerId, 'person') : null,
      weeklyRuns: s.weeklyRuns,
    })),
    runsPerWeekAffected: r.totalRunsPerWeekAffected,
    downstream: r.affectedDownstreamAssetIds.map((id) => ref(id, 'automation')),
    unknownFactsEncountered: r.unknownFactsEncountered,
  };
}

type OutageResult = { affectedAutomations: Array<{ id: string; name: string; weeklyRuns: number }>; totalRunsPerWeekAffected: number };

function fromOutage(r: OutageResult): ScenarioResult {
  return {
    orphanedCriticalAssets: [],
    stoppedAutomations: r.affectedAutomations.map((a) => ({
      workflow: { id: a.id, kind: 'automation', name: a.name }, credentialOwner: null, weeklyRuns: a.weeklyRuns,
    })),
    runsPerWeekAffected: r.totalRunsPerWeekAffected,
    downstream: [],
    unknownFactsEncountered: 0,
  };
}

/** Routes to the existing S1/S2 endpoints when possible, otherwise the planned combined endpoint (B-13). */
export async function runScenario(sel: ScenarioSelection): Promise<ScenarioResult> {
  const onlyPeople = sel.people.length > 0 && sel.unavailable.length === 0 && sel.failing.length === 0;
  const onlyOneModel = sel.people.length === 0 && sel.failing.length === 0 && sel.unavailable.length === 1;

  if (onlyPeople) {
    const r = await request<{ result: WhatIfScenarioResult }>('/api/continuity/simulations/leaver', {
      method: 'POST', body: JSON.stringify({ departingPersonIds: sel.people.map((p) => p.id) }),
    });
    return fromLeaver(r.result);
  }
  if (onlyOneModel) {
    const r = await request<{ result: OutageResult }>('/api/continuity/simulations/outage', {
      method: 'POST', body: JSON.stringify({ modelEntityId: sel.unavailable[0].id }),
    });
    return fromOutage(r.result);
  }
  return request<ScenarioResult>('/api/continuity/simulations/combined', {
    method: 'POST',
    body: JSON.stringify({
      departingPersonIds: sel.people.map((p) => p.id),
      unavailableIds: sel.unavailable.map((u) => u.id),
      failingAssetIds: sel.failing.map((f) => f.id),
    }),
  }); // (planned) B-13
}

/** Existing: POST /api/continuity/simulations/succession */
export async function testSuccession(departingPersonId: string, successorPersonId: string): Promise<SuccessionTestView> {
  const { result } = await request<{ result: SuccessionTestResult }>('/api/continuity/simulations/succession', {
    method: 'POST', body: JSON.stringify({ departingPersonId, successorPersonId }),
  });
  return {
    coveredCount: result.postHandoverCoverage.coveredCount,
    stillExposedCount: result.postHandoverCoverage.stillExposedCount,
    totalCriticalAssetsOwned: result.successorNewConcentrationLoad.totalCriticalAssetsOwned,
    sharePct: result.successorNewConcentrationLoad.shareOfCompanyCriticalAutomationsPct,
    overloadWarning: result.successorNewConcentrationLoad.overloadWarning,
  };
}

export function fetchWorstLosses(): Promise<WorstLosses> {
  return request<WorstLosses>('/api/continuity/simulations/worst-losses'); // (planned) B-13
}
