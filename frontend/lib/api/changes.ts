import type { ChangeEventView } from '@/types/view';
import { request } from './client';

export async function fetchChanges(): Promise<ChangeEventView[]> {
  const r = await request<{ events: ChangeEventView[] }>('/api/changes?acknowledged=false');
  return r.events;
}

export function acknowledgeChange(id: string): Promise<void> {
  return request<void>(`/api/changes/${encodeURIComponent(id)}/ack`, { method: 'POST' });
}

export function acknowledgeAllChanges(): Promise<void> {
  return request<void>('/api/changes/ack-all', { method: 'POST' });
}

export interface DataFreshness {
  latestDataAt: string | null;
  sources: Array<{ source: string; latestAt: string | null }>;
  /** Connector sync runs aren't tracked yet, so there is no "N/N synced". */
  syncStatus: 'not_tracked';
}

export function fetchFreshness(): Promise<DataFreshness> {
  return request<DataFreshness>('/api/freshness');
}
