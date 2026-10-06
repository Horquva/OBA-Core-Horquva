import type { SuccessionTestResult } from '@horquva/types';
import type { ScenarioResult, ScenarioSelection, SuccessionTestView, WorstLosses } from '@/types/view';
import { request } from './client';

/**
 * Every What-If scenario goes through the combined endpoint (S4), which covers
 * leavers (S1), outages (S2) and failing assets in one shape with real names.
 */
export function runScenario(sel: ScenarioSelection): Promise<ScenarioResult> {
  return request<ScenarioResult>('/api/continuity/simulations/combined', {
    method: 'POST',
    body: JSON.stringify({
      departingPersonIds: sel.people.map((p) => p.id),
      unavailableIds: sel.unavailable.map((u) => u.id),
      failingAssetIds: sel.failing.map((f) => f.id),
    }),
  });
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
  return request<WorstLosses>('/api/continuity/simulations/worst-losses');
}
