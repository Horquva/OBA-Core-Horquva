import type { ReviewerTasks } from '@/types/view';
import { request } from './client';

export function fetchReviewerTasks(): Promise<ReviewerTasks> {
  return request<ReviewerTasks>('/api/me/tasks'); // (planned) B-16
}

export function acceptHandover(id: string): Promise<void> {
  return request<void>(`/api/handovers/${encodeURIComponent(id)}/accept`, { method: 'POST' }); // (planned) B-16
}

export function declineHandover(id: string, reason: string): Promise<void> {
  return request<void>(`/api/handovers/${encodeURIComponent(id)}/decline`, {
    method: 'POST', body: JSON.stringify({ reason }),
  }); // (planned) B-16
}
