import type {
  AuditLogPage, ConnectionsOverview, ConnectionTestResult, CsvImportResult, IdentityQueueItemView, IdentityResolution,
  N8nCheckReport, OrganizationSettings, Role, SyncableConnectionType, UserView,
} from '@/types/view';
import { request } from './client';

export function fetchConnections(): Promise<ConnectionsOverview> {
  return request<ConnectionsOverview>('/api/connections');
}

/** Saves a connector; its settings are encrypted on the server and never sent back. */
export function createConnection(input: { type: SyncableConnectionType; name: string; config: Record<string, string> }): Promise<{ id: string }> {
  return request<{ id: string }>('/api/connections', { method: 'POST', body: JSON.stringify(input) });
}

/** Tries credentials without saving them. */
export function testConnectionConfig(type: SyncableConnectionType, config: Record<string, string>): Promise<ConnectionTestResult> {
  return request<ConnectionTestResult>('/api/connections/test', { method: 'POST', body: JSON.stringify({ type, config }) });
}

export function testSavedConnection(id: string): Promise<ConnectionTestResult> {
  return request<ConnectionTestResult>(`/api/connections/${encodeURIComponent(id)}/test`, { method: 'POST' });
}

/** 202: the sync runs in the background; poll fetchConnections until the status leaves 'syncing'. */
export function syncConnection(id: string): Promise<{ syncRunId: string; status: 'queued' }> {
  return request<{ syncRunId: string; status: 'queued' }>(`/api/connections/${encodeURIComponent(id)}/sync`, { method: 'POST' });
}

/** One-off CSV import (people and/or automations). The files are not kept in the connection settings. */
export function importCsv(input: { peopleCsv?: string; automationsCsv?: string }): Promise<CsvImportResult> {
  return request<CsvImportResult>('/api/connections/csv', { method: 'POST', body: JSON.stringify(input) });
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
  const r = await request<{ items: IdentityQueueItemView[] }>('/api/identity-queue');
  return r.items;
}

export function resolveIdentity(id: string, resolution: IdentityResolution): Promise<void> {
  return request<void>(`/api/identity-queue/${encodeURIComponent(id)}/resolve`, {
    method: 'POST', body: JSON.stringify(resolution),
  });
}

export async function fetchUsers(): Promise<UserView[]> {
  const r = await request<{ users: UserView[] }>('/api/users');
  return r.users;
}

export function updateUser(id: string, patch: Partial<Pick<UserView, 'role' | 'isHrManager'>>): Promise<void> {
  return request<void>(`/api/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function inviteUser(input: { email: string; name: string; role: Role; isHrManager?: boolean }): Promise<UserView> {
  const r = await request<{ user: UserView }>('/api/users', { method: 'POST', body: JSON.stringify(input) });
  return r.user;
}

export function removeUser(id: string): Promise<void> {
  return request<void>(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function fetchOrganization(): Promise<OrganizationSettings> {
  return request<OrganizationSettings>('/api/settings/organization');
}

export function saveOrganization(s: OrganizationSettings): Promise<void> {
  return request<void>('/api/settings/organization', { method: 'PUT', body: JSON.stringify(s) });
}

export function fetchAuditLog(filters: { action?: string; from?: string; to?: string; limit?: number; hideReads?: boolean } = {}): Promise<AuditLogPage> {
  const q = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== '' && v !== false).map(([k, v]) => [k, String(v)]),
  ).toString();
  return request<AuditLogPage>(`/api/audit-log${q ? `?${q}` : ''}`);
}
