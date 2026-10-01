import type { CampaignDetail, CampaignPreview, CampaignScope, CampaignSummary, CreateCampaignInput } from '@/types/view';
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
  return request<CampaignDetail>(`/api/attestation/campaigns/${encodeURIComponent(id)}`); // (planned) B-08
}

export function previewCampaign(scope: CampaignScope): Promise<CampaignPreview> {
  return request<CampaignPreview>('/api/attestation/campaigns/preview', {
    method: 'POST', body: JSON.stringify({ scope }),
  }); // (planned) B-08
}

/** Existing: POST /api/attestation/campaigns. `introLine` and `sendAt` need B-08 to be honoured. */
export async function createCampaign(input: CreateCampaignInput): Promise<string> {
  const r = await request<{ campaignId: string }>('/api/attestation/campaigns', {
    method: 'POST', body: JSON.stringify(input),
  });
  return r.campaignId;
}
