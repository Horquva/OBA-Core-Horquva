import type { AttestationAnswers, AttestationTask } from '@horquva/types';
import type { AttestAnswers, AttestSession, EntityRef } from '@/types/view';
import { ApiError, request } from './client';
import { fetchEntities } from './entities';

type LegacyTask = { task: AttestationTask; assetName: string; reviewerName: string; reviewerEmail: string };

/** Planned multi-asset endpoint (B-15); falls back to the existing single-task endpoint. */
export async function fetchAttestSession(token: string): Promise<AttestSession> {
  const t = encodeURIComponent(token);
  try {
    const s = await request<Omit<AttestSession, 'token' | 'legacy'>>(`/api/attest/${t}`);
    return { ...s, token, legacy: false };
  } catch (e) {
    if (!(e instanceof ApiError) || !e.notAvailable) throw e;
  }
  const l = await request<LegacyTask>(`/api/attestation/review/${t}`);
  return {
    token, legacy: true,
    reviewer: { name: l.reviewerName, email: l.reviewerEmail },
    requestedBy: null, company: null, expired: false,
    submitted: l.task.status === 'submitted',
    assets: [{
      taskId: l.task.id,
      asset: { id: l.task.assetEntityId, kind: 'automation', name: l.assetName },
      status: l.task.status === 'submitted' ? 'saved' : 'todo',
    }],
  };
}

export class UnsupportedAnswerError extends Error {}

function toLegacy(a: AttestAnswers): AttestationAnswers {
  if (a.fallback === 'unknown') {
    throw new UnsupportedAnswerError('This deployment can’t record “Don’t know” yet. Choose Yes or No, or ask your admin.');
  }
  return {
    isOwner: a.isOwner,
    backupPersonId: a.backup.kind === 'person' ? a.backup.personId : null,
    criticality: a.criticality,
    criticalityReason: a.criticalityReason,
    isDocumented: a.runbook.kind === 'url',
    documentationUrl: a.runbook.kind === 'url' ? a.runbook.url : undefined,
    fallbackExists: a.fallback === 'yes',
  };
}

export function saveAttestAnswers(session: AttestSession, taskId: string, answers: AttestAnswers): Promise<void> {
  const t = encodeURIComponent(session.token);
  if (session.legacy) {
    return request<void>(`/api/attestation/review/${t}`, { method: 'POST', body: JSON.stringify(toLegacy(answers)) });
  }
  return request<void>(`/api/attest/${t}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PUT', body: JSON.stringify(answers),
  }); // (planned) B-15
}

/** People the reviewer can pick as backup/owner. */
export async function loadAttestPeople(session: AttestSession): Promise<EntityRef[]> {
  if (session.legacy) return fetchEntities('person');
  const r = await request<{ people: EntityRef[] }>(`/api/attest/${encodeURIComponent(session.token)}/people`); // (planned) B-15
  return r.people;
}
