import type { DepartureDetail, DepartureSummary, SuccessionPlanResult, SuccessorAssignment } from '@/types/view';
import { request } from './client';

export async function fetchDepartures(): Promise<DepartureSummary[]> {
  const r = await request<any>('/api/departures'); // (planned) B-09
  if (Array.isArray(r)) return r;
  return r?.departures ?? [];
}

export function fetchDeparture(id: string): Promise<DepartureDetail> {
  return request<DepartureDetail>(`/api/departures/${encodeURIComponent(id)}`); // (planned) B-09
}

export async function initiateDeparture(input: { personId: string; leaveDate: string; note: string | null }): Promise<string> {
  const r = await request<{ id: string }>('/api/departures', { method: 'POST', body: JSON.stringify(input) }); // (planned) B-09
  return r.id;
}

export function simulateSuccessionPlan(departureId: string, assignments: SuccessorAssignment[]): Promise<SuccessionPlanResult> {
  return request<SuccessionPlanResult>(`/api/departures/${encodeURIComponent(departureId)}/succession-test`, {
    method: 'POST', body: JSON.stringify({ assignments }),
  }); // (planned) B-09
}

export function saveSuccessors(departureId: string, assignments: SuccessorAssignment[]): Promise<void> {
  return request<void>(`/api/departures/${encodeURIComponent(departureId)}/successors`, {
    method: 'PUT', body: JSON.stringify({ assignments }),
  }); // (planned) B-09
}

/** Marks named successors as asked to accept; returns how many were asked. No email is sent yet. */
export async function sendAcceptanceRequests(departureId: string): Promise<number> {
  const r = await request<{ requested: number }>(`/api/departures/${encodeURIComponent(departureId)}/acceptance-requests`, { method: 'POST' });
  return r.requested;
}

/** Stage 4: the leaver's account was disabled (allowed at any point). */
export function markAccountDisabled(departureId: string): Promise<{ stage: string }> {
  return request<{ stage: string }>(`/api/departures/${encodeURIComponent(departureId)}/account-disabled`, { method: 'POST' });
}

/** Stage 5: close the departure. Backend requires account disabled + every handover accepted. */
export function verifyDeparture(departureId: string): Promise<{ stage: string }> {
  return request<{ stage: string }>(`/api/departures/${encodeURIComponent(departureId)}/verify`, { method: 'POST' });
}

/** HR/admin: hand one unaccepted row to someone else (works after the account is disabled). The new successor is asked directly. */
export function reassignHandover(handoverId: string, successorId: string, reason: string): Promise<{ stage: string }> {
  return request<{ stage: string }>(`/api/handovers/${encodeURIComponent(handoverId)}/reassign`, {
    method: 'POST', body: JSON.stringify({ successorId, reason }),
  });
}
