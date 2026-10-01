// =============================================================================
// Horquva Continuity Platform — Typed API Client
// =============================================================================
// Interfaces directly with the new Greenfield Horquva Backend:
// - Overview & Headline Metrics
// - Inventory Catalog
// - What-If Simulations (S1 Leaver, S2 Outage, S3 Succession)
// - Confirmation Campaigns & Single-Use Attestation Magic Links
// - Ask Horquva (Gemini Grounded Assistant)
// - Free v0 n8n Ownership Check
// =============================================================================

import {
  HeadlineMetrics,
  CheckResult,
  CanonicalEntity,
  WhatIfScenarioResult,
  SuccessionTestResult,
  AttestationTask,
  AttestationAnswers,
} from '@horquva/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE.replace(/\/+$/, '')}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// 1. Overview & Headline Metrics
export async function fetchOverview(): Promise<{
  metrics: HeadlineMetrics;
  activeAlerts: CheckResult[];
  unknownChecks: CheckResult[];
}> {
  return request('/api/continuity/overview');
}

// 2. Inventory Catalog
export async function fetchInventory(kind?: string): Promise<{ entities: CanonicalEntity[] }> {
  const query = kind ? `?kind=${encodeURIComponent(kind)}` : '';
  return request(`/api/continuity/inventory${query}`);
}

// 3. What-If Simulations
export async function simulateLeaver(departingPersonIds: string[]): Promise<{ success: boolean; result: WhatIfScenarioResult }> {
  return request('/api/continuity/simulations/leaver', {
    method: 'POST',
    body: JSON.stringify({ departingPersonIds }),
  });
}

export async function simulateOutage(modelEntityId: string): Promise<{
  success: boolean;
  result: { affectedAutomations: Array<{ id: string; name: string; weeklyRuns: number }>; totalRunsPerWeekAffected: number };
}> {
  return request('/api/continuity/simulations/outage', {
    method: 'POST',
    body: JSON.stringify({ modelEntityId }),
  });
}

export async function testSuccession(
  departingPersonId: string,
  successorPersonId: string
): Promise<{ success: boolean; result: SuccessionTestResult }> {
  return request('/api/continuity/simulations/succession', {
    method: 'POST',
    body: JSON.stringify({ departingPersonId, successorPersonId }),
  });
}

// 4. Ask Horquva Grounded Assistant
export async function askHorquva(queryText: string): Promise<{ success: boolean; answer: string }> {
  return request('/api/continuity/assistant/ask', {
    method: 'POST',
    body: JSON.stringify({ query: queryText }),
  });
}

export async function fetchWeeklyBriefing(): Promise<{ success: boolean; briefing: string }> {
  return request('/api/continuity/briefing');
}

// 5. Attestation Campaigns & Web Form
export async function fetchCampaigns(): Promise<{
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    due_date: string;
    total_tasks: number;
    completed_tasks: number;
  }>;
}> {
  return request('/api/attestation/campaigns');
}

export async function createCampaign(
  name: string,
  dueDate: Date,
  tasks: Array<{ reviewerPersonId: string; assetEntityId: string }>
): Promise<{ success: boolean; campaignId: string }> {
  return request('/api/attestation/campaigns', {
    method: 'POST',
    body: JSON.stringify({ name, dueDate: dueDate.toISOString(), tasks }),
  });
}

export async function fetchReviewTask(token: string): Promise<{
  success: boolean;
  task: AttestationTask;
  assetName: string;
  reviewerName: string;
  reviewerEmail: string;
}> {
  return request(`/api/attestation/review/${token}`);
}

export async function submitReview(
  token: string,
  answers: AttestationAnswers
): Promise<{ success: boolean; message: string }> {
  return request(`/api/attestation/review/${token}`, {
    method: 'POST',
    body: JSON.stringify(answers),
  });
}

// 6. Free v0 n8n Ownership Check
export async function runV0N8nCheck(
  n8nUrl: string,
  n8nApiKey: string
): Promise<Record<string, unknown>> {
  return request('/api/v0/n8n-check', {
    method: 'POST',
    body: JSON.stringify({ n8nUrl, n8nApiKey }),
  });
}
