import type { ActionStatus, ActionView } from '@/types/view';
import { request } from './client';

export async function fetchActions(params: { status?: ActionStatus; limit?: number } = {}): Promise<ActionView[]> {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  const r = await request<{ actions: ActionView[] }>(`/api/actions${qs ? `?${qs}` : ''}`); // (planned) B-07
  return r.actions;
}

export function assignBackup(actionId: string, personId: string): Promise<void> {
  return request<void>(`/api/actions/${encodeURIComponent(actionId)}/assign-backup`, {
    method: 'POST', body: JSON.stringify({ personId }),
  }); // (planned) B-07
}

export function acceptRisk(actionId: string, input: { reason: string; expiresAt: string }): Promise<void> {
  return request<void>(`/api/actions/${encodeURIComponent(actionId)}/accept-risk`, {
    method: 'POST', body: JSON.stringify(input),
  }); // (planned) B-07
}
