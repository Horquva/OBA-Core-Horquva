import type { HeadlineMetrics } from '@horquva/types';
import type { BriefingDetail, ChangeSummary, CoverageTrend, ExposureCause, HistoryPoint, NavCounts, OrphanScanResult, OverviewCoverage, SpofAsset } from '@/types/view';
import { apiUrl, request } from './client';

type OverviewResponse = { metrics: HeadlineMetrics & { unknownCriticalAssets?: number }; trend?: CoverageTrend | null; exposureByCause?: ExposureCause[] };

/** GET /api/continuity/overview: headline counts plus the week-on-week trend. */
export async function fetchCoverage(): Promise<OverviewCoverage> {
  const { metrics: m, trend, exposureByCause } = await request<OverviewResponse>('/api/continuity/overview');
  return {
    total: m.totalCriticalAssets,
    covered: m.fullyCoveredCriticalAssets,
    exposed: m.exposedCriticalAssets,
    unknown: typeof m.unknownCriticalAssets === 'number' ? m.unknownCriticalAssets : null,
    definition: m.definition,
    trend: trend ?? null,
    exposureByCause: exposureByCause ?? [],
  };
}

/** GET /api/continuity/history: one point per daily snapshot, oldest first, ending today. */
export async function fetchCoverageHistory(days: number): Promise<HistoryPoint[]> {
  return (await request<{ points: HistoryPoint[] }>(`/api/continuity/history?days=${days}`)).points;
}

export function fetchChangeSummary(): Promise<ChangeSummary> {
  return request<ChangeSummary>('/api/changes/summary'); // (planned) B-03 — backend computes "since last visit"
}

/** GET /api/continuity/orphan-scan: what is already orphaned, ranked. */
export function fetchOrphanScan(): Promise<OrphanScanResult> {
  return request<OrphanScanResult>('/api/continuity/orphan-scan');
}

/** The same scan as a CSV download (an <a href>, so the browser sends the session cookie). */
export const orphanScanCsvUrl = () => apiUrl('/api/continuity/orphan-scan?format=csv');

export async function fetchSpofAssets(limit = 5): Promise<SpofAsset[]> {
  const r = await request<{ assets: SpofAsset[] }>(`/api/continuity/spof-assets?limit=${limit}`); // (planned) B-04
  return r.assets;
}

/** Existing: GET /api/continuity/briefing */
export async function fetchBriefing(): Promise<string> {
  return (await fetchBriefingDetail()).text;
}

export async function fetchBriefingDetail(): Promise<BriefingDetail> {
  const r = await request<{ briefing: string; writtenBy: BriefingDetail['writtenBy']; generatedAt: string; figures: BriefingDetail['figures'] }>(
    '/api/continuity/briefing',
  );
  return { text: r.briefing, writtenBy: r.writtenBy, generatedAt: r.generatedAt, figures: r.figures };
}

export function fetchNavCounts(): Promise<NavCounts> {
  return request<NavCounts>('/api/nav-counts'); // (planned) B-05
}
