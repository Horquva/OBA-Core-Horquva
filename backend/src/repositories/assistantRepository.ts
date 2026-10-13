// =============================================================================
// Horquva Continuity Platform — Ask OBA conversation repository (migration 007)
// =============================================================================

import { query as defaultQuery } from '../db/client.js';
import type { Query } from './graphRepository.js';
import type { AssistantMessage, StoredConversation } from '../assistant/assistantService.js';

const iso = (v: unknown): string => (v instanceof Date ? v : new Date(v as string)).toISOString();

/** Every conversation with its messages, oldest message first. */
export async function loadAll(q: Query = defaultQuery): Promise<StoredConversation[]> {
  const convos = await q(`SELECT id, owner_user_id, title, created_at, updated_at FROM assistant_conversation`);
  const msgs = await q(
    `SELECT id, conversation_id, role, content, sources, answered_by, created_at
       FROM assistant_message ORDER BY created_at, id`,
  );
  const byConvo = new Map<string, AssistantMessage[]>();
  for (const r of msgs.rows as any[]) {
    const list = byConvo.get(r.conversation_id) ?? [];
    list.push({
      id: r.id,
      role: r.role,
      content: r.content,
      sources: typeof r.sources === 'string' ? JSON.parse(r.sources) : r.sources,
      answeredBy: r.answered_by ?? null,
      createdAt: iso(r.created_at),
    });
    byConvo.set(r.conversation_id, list);
  }
  return (convos.rows as any[]).map((r) => ({
    id: r.id,
    ownerUserId: r.owner_user_id,
    title: r.title,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    messages: byConvo.get(r.id) ?? [],
  }));
}

export async function saveConversation(c: Omit<StoredConversation, 'messages'>, q: Query = defaultQuery): Promise<void> {
  await q(
    `INSERT INTO assistant_conversation (id, owner_user_id, title, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, updated_at = EXCLUDED.updated_at`,
    [c.id, c.ownerUserId, c.title, c.createdAt, c.updatedAt],
  );
}

export async function insertMessage(conversationId: string, m: AssistantMessage, q: Query = defaultQuery): Promise<void> {
  await q(
    `INSERT INTO assistant_message (id, conversation_id, role, content, sources, answered_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
    [m.id, conversationId, m.role, m.content, JSON.stringify(m.sources), m.answeredBy, m.createdAt],
  );
}

export async function deleteConversation(id: string, q: Query = defaultQuery): Promise<void> {
  await q(`DELETE FROM assistant_conversation WHERE id = $1`, [id]);
}
