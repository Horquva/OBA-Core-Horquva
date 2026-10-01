import type { PersonDetail, TeamDetail, TeamSummary } from '@/types/view';
import { request } from './client';

export function fetchTeams(): Promise<{ teams: TeamSummary[]; minGroupSize: number }> {
  return request('/api/people/teams'); // (planned) B-10
}

export function fetchTeam(id: string): Promise<TeamDetail> {
  return request<TeamDetail>(`/api/people/teams/${encodeURIComponent(id)}`); // (planned) B-10
}

export function fetchPerson(id: string): Promise<PersonDetail> {
  return request<PersonDetail>(`/api/people/${encodeURIComponent(id)}`); // (planned) B-10
}
