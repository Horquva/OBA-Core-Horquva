import type { DepartureDetail, DepartureSummary, SuccessionPlanResult, SuccessorAssignment } from '@/types/view';
import { request } from './client';

export async function fetchDepartures(): Promise<DepartureSummary[]> {
  const r = await request<{ departures: DepartureSummary[] }>('/api/departures'); // (planned) B-09
  return r.departures;
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

export function sendAcceptanceRequests(departureId: string): Promise<void> {
  return request<void>(`/api/departures/${encodeURIComponent(departureId)}/acceptance-requests`, { method: 'POST' }); // (planned) B-09
}
