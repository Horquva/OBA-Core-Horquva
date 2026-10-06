import type { AttestAnswers, AttestSession, EntityRef } from '@/types/view';
import { request } from './client';

/** Magic-link session: the reviewer and every system they're asked about in this campaign. */
export async function fetchAttestSession(token: string): Promise<AttestSession> {
  const s = await request<Omit<AttestSession, 'token'>>(`/api/attest/${encodeURIComponent(token)}`);
  return { ...s, token };
}

export function saveAttestAnswers(session: AttestSession, taskId: string, answers: AttestAnswers): Promise<void> {
  return request<void>(`/api/attest/${encodeURIComponent(session.token)}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PUT',
    body: JSON.stringify(answers),
  });
}

/** People the reviewer can name as owner or backup (current directory, no departed people). */
export async function loadAttestPeople(session: AttestSession): Promise<EntityRef[]> {
  const r = await request<{ people: EntityRef[] }>(`/api/attest/${encodeURIComponent(session.token)}/people`);
  return r.people;
}
