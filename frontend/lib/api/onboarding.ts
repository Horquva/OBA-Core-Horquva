import type { OnboardingStatus } from '@/types/view';
import { request } from './client';

export function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  return request<OnboardingStatus>('/api/onboarding/status');
}

export function dismissOnboarding(): Promise<{ dismissedAt: string }> {
  return request<{ dismissedAt: string }>('/api/onboarding/dismiss', { method: 'POST' });
}
