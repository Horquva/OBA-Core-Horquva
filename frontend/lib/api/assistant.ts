import type { ChatMessage, Conversation } from '@/types/view';
import { ApiError, apiUrl, request } from './client';

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

export async function renameConversation(id: string, title: string): Promise<Conversation> {
  const r = await request<{ conversation: Conversation }>(`/api/assistant/conversations/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify({ title }),
  });
  return r.conversation;
}

export function deleteConversation(id: string): Promise<void> {
  return request(`/api/assistant/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export interface StreamHandlers {
  /** The question was recorded; `conversationId` is new when the thread was. */
  onStart?: (e: { conversationId: string; conversation: Conversation; userMessage: ChatMessage }) => void;
  /** The next piece of the answer, citations already turned into oba:// links. */
  onDelta?: (text: string) => void;
  onDone?: (e: { conversationId: string; conversation: Conversation; message: ChatMessage }) => void;
}

/**
 * POST /api/assistant/messages/stream, read as Server-Sent Events. Resolves when the
 * stream ends; rejects with ApiError when the request is refused or the answer breaks
 * off. Abort the signal to stop reading (the server still finishes and saves the turn).
 */
export async function streamMessage(conversationId: string | null, query: string, handlers: StreamHandlers, signal?: AbortSignal): Promise<void> {
  let res: Response;
  try {
    res = await fetch(apiUrl('/api/assistant/messages/stream'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ conversationId, query }),
      signal,
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return;
    throw new ApiError(0, "We couldn't reach OBA.");
  }
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body && typeof body.error === 'string' ? body.error : `Request failed (${res.status}).`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;

  const handle = (block: string) => {
    const event = /^event: (.+)$/m.exec(block)?.[1];
    const raw = /^data: (.+)$/m.exec(block)?.[1];
    if (!event || raw === undefined) return;
    const data = JSON.parse(raw);
    if (event === 'start') handlers.onStart?.(data);
    else if (event === 'delta') handlers.onDelta?.(data.text);
    else if (event === 'done') {
      finished = true;
      handlers.onDone?.(data);
    } else if (event === 'error') throw new ApiError(502, data.error ?? 'The answer was interrupted.');
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        handle(buffer.slice(0, sep));
        buffer = buffer.slice(sep + 2);
      }
    }
    if (buffer.trim()) handle(buffer);
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return;
    throw e instanceof ApiError ? e : new ApiError(0, 'The connection dropped while answering.');
  }
  if (!finished && !signal?.aborted) throw new ApiError(0, 'The answer was cut off. Try again.');
}
