import type { CampaignCreated, CampaignDetail, CampaignEmailPreview, CampaignPreview, CampaignScope, CampaignSummary, CreateCampaignInput } from '@/types/view';
import { request } from './client';

type CampaignRow = {
  id: string; name: string; status: string; due_date: string; created_at: string;
  total_tasks: number | string; completed_tasks: number | string;
};

/** Existing: GET /api/attestation/campaigns (snake_case rows; counts may arrive as strings). */
export async function fetchCampaigns(): Promise<CampaignSummary[]> {
  const r = await request<{ campaigns: CampaignRow[] }>('/api/attestation/campaigns');
  return r.campaigns.map((c) => ({
    id: c.id, name: c.name, status: c.status, dueDate: c.due_date, createdAt: c.created_at,
    totalTasks: Number(c.total_tasks), completedTasks: Number(c.completed_tasks),
  }));
}

export function fetchCampaignDetail(id: string): Promise<CampaignDetail> {
  return request<CampaignDetail>(`/api/attestation/campaigns/${encodeURIComponent(id)}`);
}

export function previewCampaign(scope: CampaignScope): Promise<CampaignPreview> {
  return request<CampaignPreview>('/api/attestation/campaigns/preview', {
    method: 'POST', body: JSON.stringify({ scope }),
  });
}

export function previewCampaignEmail(
  input: Pick<CreateCampaignInput, 'dueDate' | 'introLine' | 'email' | 'tasks'>,
): Promise<CampaignEmailPreview> {
  return request<CampaignEmailPreview>('/api/attestation/campaigns/email-preview', {
    method: 'POST', body: JSON.stringify(input),
  });
}

/** Creates the campaign and emails each reviewer one link (or logs it when SMTP isn't configured). */
export function createCampaign(input: CreateCampaignInput): Promise<CampaignCreated> {
  return request<CampaignCreated>('/api/attestation/campaigns', {
    method: 'POST', body: JSON.stringify(input),
  });
}
