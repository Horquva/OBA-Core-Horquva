import type { ChatMessage, Conversation } from '@/types/view';
import { request } from './client';

/** The signed-in user's own conversations, newest first. */
export async function fetchConversations(): Promise<Conversation[]> {
  const r = await request<{ conversations: Conversation[] }>('/api/assistant/conversations');
  return r.conversations;
}

export function fetchConversation(id: string): Promise<{ conversation: Conversation; messages: ChatMessage[] }> {
  return request(`/api/assistant/conversations/${encodeURIComponent(id)}`);
}

/** Starts a conversation when `conversationId` is null. */
export function sendMessage(conversationId: string | null, query: string): Promise<{ conversationId: string; message: ChatMessage }> {
  return request('/api/assistant/messages', {
    method: 'POST', body: JSON.stringify({ conversationId, query }),
  });
}
