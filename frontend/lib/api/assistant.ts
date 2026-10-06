import type { ChatMessage, Conversation } from '@/types/view';
import { request } from './client';

export async function fetchConversations(): Promise<Conversation[]> {
  const r = await request<{ conversations: Conversation[] }>('/api/assistant/conversations'); // (planned) B-14
  return r.conversations;
}

export function fetchConversation(id: string): Promise<{ conversation: Conversation; messages: ChatMessage[] }> {
  return request(`/api/assistant/conversations/${encodeURIComponent(id)}`); // (planned) B-14
}

export function sendMessage(conversationId: string | null, query: string): Promise<{ conversationId: string; message: ChatMessage }> {
  return request('/api/assistant/messages', {
    method: 'POST', body: JSON.stringify({ conversationId, query }),
  }); // (planned) B-14
}

/** Existing: POST /api/continuity/assistant/ask. No history, no structured sources. */
export async function askOnce(query: string): Promise<ChatMessage> {
  const r = await request<{ answer: string }>('/api/continuity/assistant/ask', {
    method: 'POST', body: JSON.stringify({ query }),
  });
  return { id: `local-${Date.now()}`, role: 'assistant', content: r.answer, sources: [], createdAt: new Date().toISOString() };
}
