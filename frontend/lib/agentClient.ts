// frontend/lib/agentClient.ts

import { API_BASE, request } from '@/lib/api';
import { clientHeaders } from '@/lib/authFetch';

// ============================================
// TYPES - Matches backend events exactly
// ============================================

interface ToolCall {
  id: string;
  name: string;
  label: string;
  status: 'running' | 'done';
  summary: string | null;
  durationMs: number | null;
}

// Matches propose-navigation.js's tool result data shape exactly --
// { slug, route, label, reason }, not { page, section, ... }.
interface NavigationOffer {
  slug: string;
  route: string;
  label: string;
  reason: string | null;
}

interface Provenance {
  computedAt: string;
  snapshotAt: string;
  source: 'live' | 'graph';
  inputs: Record<string, unknown>;
  graphLoadedAt?: string;
}

interface Usage {
  inputTokens: number;
  outputTokens: number;
  providerCalls: number;
  toolIterations: number;
}

export type AgentEvent =
  | { type: 'ready'; conversationId: string; snapshotAt: string }
  | { type: 'token'; text: string }
  | { type: 'tool_start'; id: string; name: string; label: string }
  | { type: 'tool_done'; id: string; name: string; summary: string; durationMs: number }
  | { type: 'warning'; code: string; message: string }
  | { type: 'done'; text: string; toolTrace: ToolCall[]; navigationOffers: NavigationOffer[]; provenance: Provenance; usage: Usage; validatorStatus: 'clean' | 'repaired' | 'flagged' }
  | { type: 'error'; code: string; message: string; retryable: boolean };

// ============================================
// SSE PARSER - Handles heartbeats and partial events
//
// The backend (routes/agent/chat.js's writeEvent()) writes the standard
// named-event SSE shape: an `event: <name>` line followed by `data: <json>`,
// and deliberately does NOT embed `type` inside the JSON body (it's
// destructured out before serializing). So the event name has to come from
// the `event:` line, not be assumed to live in the payload.
// ============================================

interface RawSSEEvent {
  event: string | null;
  data: string;
}

function parseSSEEvents(buffer: string): { events: RawSSEEvent[]; remaining: string } {
  const events: RawSSEEvent[] = [];
  const lines = buffer.split('\n');

  let currentEvent: RawSSEEvent | null = null;
  let remaining = '';

  for (const line of lines) {
    // Heartbeat (: comment) - ignore
    if (line.startsWith(':')) {
      continue;
    }

    // Event-name line
    if (line.startsWith('event: ')) {
      currentEvent = currentEvent ?? { event: null, data: '' };
      currentEvent.event = line.slice(7);
      continue;
    }

    // Data line
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (currentEvent) {
        currentEvent.data = currentEvent.data ? currentEvent.data + '\n' + data : data;
      } else {
        currentEvent = { event: null, data };
      }
      continue;
    }

    // Empty line ends the event
    if (line === '' && currentEvent) {
      events.push(currentEvent);
      currentEvent = null;
    }
  }

  // Keep partial event for next chunk
  if (currentEvent) {
    remaining =
      (currentEvent.event ? `event: ${currentEvent.event}\n` : '') +
      `data: ${currentEvent.data}\n\n`;
  }

  return { events, remaining };
}

// ============================================
// MAIN STREAM FUNCTION
// ============================================

/**
 * Stream a conversation turn from the agent
 *
 * Returns an async generator that yields typed events
 *
 * @param message - User's message
 * @param conversationId - Existing conversation ID, or undefined for new
 * @param signal - AbortSignal for cancellation
 */
export async function* streamAgent(
  message: string,
  conversationId?: string,
  signal?: AbortSignal
): AsyncGenerator<AgentEvent> {
  // SEC-2: there is no client-readable token any more -- the session is an
  // httpOnly cookie. Send it with credentials: 'include' plus the CSRF
  // client header the backend's cookie-auth guard requires on POST
  // (middleware/auth.js), matching the pattern in lib/api.ts's request().
  const response = await fetch(`${API_BASE}/api/agent/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...clientHeaders(),
    },
    body: JSON.stringify({
      message,
      conversationId: conversationId ?? null,
    }),
    signal,
  });

  // Handle non-200 responses
  if (!response.ok) {
    if (response.status === 429) {
      const data = await response.json().catch(() => ({}));
      throw new Error(`Rate limited: ${data.message || 'Too many requests'}`);
    }
    if (response.status === 401) {
      throw new Error('Unauthorized - please log in again');
    }
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  // Get the response body stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body - server did not return a stream');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      // End of stream
      if (done) break;

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Parse complete events from the buffer
      const result = parseSSEEvents(buffer);
      
      // Yield each complete event, attaching the SSE `event:` line as `type`
      // -- the JSON body itself never carries it (see parseSSEEvents above).
      for (const event of result.events) {
        if (!event.event) continue;
        try {
          const payload = JSON.parse(event.data);
          yield { ...payload, type: event.event } as AgentEvent;
        } catch (parseError) {
          // Log parse error but continue - don't crash the stream
          console.warn('Failed to parse SSE event:', event.data, parseError);
        }
      }

      // Keep any partial event for the next chunk
      buffer = result.remaining;
    }
  } catch (error) {
    // Check if this was an intentional abort
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      // Normal cancellation - don't treat as error
      return;
    }
    // Re-throw other errors
    throw error;
  } finally {
    // Release the reader lock
    try {
      reader.releaseLock();
    } catch {
      // Ignore errors on release - stream is already closed
    }
  }
}

// ============================================
// CONVERSATION HISTORY (backend/routes/agent/conversations.js)
// ============================================

export interface AgentConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
}

export interface AgentConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  validatorStatus?: 'clean' | 'repaired' | 'flagged';
  navigationOffers?: NavigationOffer[];
  provenance?: Provenance;
  usage?: Usage;
}

export interface AgentConversationDetail {
  id: string;
  title: string;
  messages: AgentConversationMessage[];
}

export async function listAgentConversations(): Promise<AgentConversationSummary[]> {
  const data = await request<{ conversations: AgentConversationSummary[] }>('/api/agent/conversations');
  return data.conversations;
}

export async function getAgentConversation(id: string): Promise<AgentConversationDetail> {
  return request<AgentConversationDetail>(`/api/agent/conversations/${encodeURIComponent(id)}`);
}
// ============================================
// STARTER SUGGESTIONS (backend/routes/agent/suggestions.js)
// ============================================

// sessionStorage key AppShell writes the last non-agent route to.
export const AGENT_FROM_ROUTE_KEY = 'agent:fromRoute';

export interface AgentSuggestions {
  slug: string | null;
  pageLabel: string | null;
  prompts: string[];
}

export async function getAgentSuggestions(fromRoute: string | null): Promise<AgentSuggestions> {
  const query = fromRoute ? `?from=${encodeURIComponent(fromRoute)}` : '';
  return request<AgentSuggestions>(`/api/agent/suggestions${query}`);
}
