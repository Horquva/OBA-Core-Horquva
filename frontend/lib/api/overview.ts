import type { HeadlineMetrics } from '@horquva/types';
import type { ChangeSummary, CoverageMetrics, NavCounts, SpofAsset } from '@/types/view';
import { request } from './client';

type OverviewResponse = { metrics: HeadlineMetrics & { unknownCriticalAssets?: number } };

/** Existing: GET /api/continuity/overview. `unknown` stays null until B-01. */
export async function fetchCoverage(): Promise<CoverageMetrics> {
  const { metrics: m } = await request<OverviewResponse>('/api/continuity/overview');
  return {
    total: m.totalCriticalAssets,
    covered: m.fullyCoveredCriticalAssets,
    exposed: m.exposedCriticalAssets,
    unknown: typeof m.unknownCriticalAssets === 'number' ? m.unknownCriticalAssets : null,
    definition: m.definition,
  };
}

export function fetchChangeSummary(): Promise<ChangeSummary> {
  return request<ChangeSummary>('/api/changes/summary'); // (planned) B-03 — backend computes "since last visit"
}

export async function fetchSpofAssets(limit = 5): Promise<SpofAsset[]> {
  const r = await request<{ assets: SpofAsset[] }>(`/api/continuity/spof-assets?limit=${limit}`); // (planned) B-04
  return r.assets;
}

/** Existing: GET /api/continuity/briefing */
export async function fetchBriefing(): Promise<string> {
  const r = await request<{ briefing: string }>('/api/continuity/briefing');
  return r.briefing;
}

export function fetchNavCounts(): Promise<NavCounts> {
  return request<NavCounts>('/api/nav-counts'); // (planned) B-05
}
