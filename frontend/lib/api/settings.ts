import type {
  AuditEntry, ConnectionView, IdentityQueueItemView, IdentityResolution, N8nCheckReport, OrganizationSettings, UserView,
} from '@/types/view';
import { request } from './client';

export async function fetchConnections(): Promise<ConnectionView[]> {
  const r = await request<{ connections: ConnectionView[] }>('/api/connections'); // (planned) B-17
  return r.connections;
}

export function syncConnection(id: string): Promise<void> {
  return request<void>(`/api/connections/${encodeURIComponent(id)}/sync`, { method: 'POST' }); // (planned) B-17
}

type V0Response = {
  scannedAt: string;
  summary: N8nCheckReport['summary'];
  singleOwner?: N8nCheckReport['singleOwner'];
  personalCredential?: N8nCheckReport['personalCredential'];
  failing?: N8nCheckReport['failing'];
  abandoned?: N8nCheckReport['abandoned'];
};

/** Existing: POST /api/v0/n8n-check. The four named lists need B-12; absent lists stay null. */
export async function runN8nCheck(n8nUrl: string, n8nApiKey: string): Promise<N8nCheckReport> {
  const r = await request<V0Response>('/api/v0/n8n-check', { method: 'POST', body: JSON.stringify({ n8nUrl, n8nApiKey }) });
  return {
    scannedAt: r.scannedAt, summary: r.summary,
    singleOwner: r.singleOwner ?? null, personalCredential: r.personalCredential ?? null,
    failing: r.failing ?? null, abandoned: r.abandoned ?? null,
  };
}

export async function fetchIdentityQueue(): Promise<IdentityQueueItemView[]> {
  const r = await request<{ items: IdentityQueueItemView[] }>('/api/identity-queue'); // (planned) B-18
  return r.items;
}

export function resolveIdentity(id: string, resolution: IdentityResolution): Promise<void> {
  return request<void>(`/api/identity-queue/${encodeURIComponent(id)}/resolve`, {
    method: 'POST', body: JSON.stringify(resolution),
  }); // (planned) B-18
}

export async function fetchUsers(): Promise<UserView[]> {
  const r = await request<{ users: UserView[] }>('/api/users'); // (planned) B-02
  return r.users;
}

export function updateUser(id: string, patch: Partial<Pick<UserView, 'role' | 'isHrManager'>>): Promise<void> {
  return request<void>(`/api/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }); // (planned) B-02
}

export function fetchOrganization(): Promise<OrganizationSettings> {
  return request<OrganizationSettings>('/api/settings/organization'); // (planned) B-19
}

export function saveOrganization(s: OrganizationSettings): Promise<void> {
  return request<void>('/api/settings/organization', { method: 'PUT', body: JSON.stringify(s) }); // (planned) B-19
}

export async function fetchAuditLog(filters: { action?: string; from?: string; to?: string } = {}): Promise<AuditEntry[]> {
  const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => !!v) as Array<[string, string]>).toString();
  const r = await request<{ entries: AuditEntry[] }>(`/api/audit-log${q ? `?${q}` : ''}`); // (planned) B-20
  return r.entries;
}
