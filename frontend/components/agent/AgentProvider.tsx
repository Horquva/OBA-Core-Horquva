// frontend/components/agent/AgentProvider.tsx

'use client';

import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import { streamAgent, listAgentConversations, getAgentConversation } from '@/lib/agentClient';
import { useAuth } from '@/lib/AuthContext';

// ============================================
// TYPES
// ============================================

interface ToolCall {
  id: string;
  name: string;
  label: string;
  status: 'running' | 'done';
  summary: string | null;
  durationMs: number | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  validatorStatus?: 'clean' | 'repaired' | 'flagged';
  navigationOffers?: NavigationOffer[];
  provenance?: Provenance;
  usage?: Usage;
  timestamp: Date;
}

// Matches propose-navigation.js's tool result data shape exactly --
// { slug, route, label, reason }, not { page, section, ... }. The agent may
// call propose_navigation more than once per turn (one answer can span
// several dashboard pages), so this always flows through as an array.
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

interface AgentState {
  conversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  currentStream: {
    text: string;
    toolCalls: ToolCall[];
  } | null;
  error: string | null;
}

// ============================================
// ACTIONS
// ============================================

type AgentAction =
  | { type: 'START_STREAM'; conversationId?: string; userMessage: string }
  | { type: 'APPEND_TOKEN'; text: string }
  | { type: 'TOOL_START'; id: string; name: string; label: string }
  | { type: 'TOOL_DONE'; id: string; summary: string; durationMs: number }
  | { type: 'END_STREAM';
      finalText: string;
      toolCalls: ToolCall[];
      validatorStatus?: 'clean' | 'repaired' | 'flagged';
      navigationOffers?: NavigationOffer[];
      provenance?: Provenance;
      usage?: Usage;
    }
  | { type: 'STREAM_ERROR'; error: string }
  | { type: 'SET_CONVERSATION_ID'; conversationId: string }
  | { type: 'RESTORE_CONVERSATION'; messages: Message[]; conversationId: string | null }
  | { type: 'NEW_CONVERSATION' };

// ============================================
// REDUCER
// ============================================

function agentReducer(state: AgentState, action: AgentAction): AgentState {
  switch (action.type) {
    case 'START_STREAM': {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: action.userMessage,
        timestamp: new Date(),
      };

      return {
        ...state,
        isStreaming: true,
        error: null,
        conversationId: action.conversationId ?? state.conversationId,
        currentStream: { text: '', toolCalls: [] },
        messages: [...state.messages, userMessage],
      };
    }

    case 'APPEND_TOKEN': {
      if (!state.currentStream) return state;
      return {
        ...state,
        currentStream: {
          ...state.currentStream,
          text: state.currentStream.text + action.text,
        },
      };
    }

    case 'TOOL_START': {
      if (!state.currentStream) return state;
      return {
        ...state,
        currentStream: {
          ...state.currentStream,
          toolCalls: [
            ...state.currentStream.toolCalls,
            {
              id: action.id,
              name: action.name,
              label: action.label,
              status: 'running',
              summary: null,
              durationMs: null,
            },
          ],
        },
      };
    }

    case 'TOOL_DONE': {
      if (!state.currentStream) return state;
      const toolCalls = state.currentStream.toolCalls.map((tc) =>
        tc.id === action.id
          ? { ...tc, status: 'done' as const, summary: action.summary, durationMs: action.durationMs }
          : tc
      );
      return {
        ...state,
        currentStream: { ...state.currentStream, toolCalls },
      };
    }

    case 'END_STREAM': {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: action.finalText,
        toolCalls: action.toolCalls,
        validatorStatus: action.validatorStatus,
        navigationOffers: action.navigationOffers,
        provenance: action.provenance,
        usage: action.usage,
        timestamp: new Date(),
      };

      return {
        ...state,
        isStreaming: false,
        currentStream: null,
        messages: [...state.messages, assistantMessage],
      };
    }

    case 'STREAM_ERROR': {
      return {
        ...state,
        isStreaming: false,
        currentStream: null,
        error: action.error,
      };
    }

    case 'SET_CONVERSATION_ID': {
      return {
        ...state,
        conversationId: action.conversationId,
      };
    }

    case 'RESTORE_CONVERSATION': {
      return {
        ...state,
        messages: action.messages,
        conversationId: action.conversationId,
      };
    }

    case 'NEW_CONVERSATION': {
      return {
        ...state,
        messages: [],
        conversationId: null,
        error: null,
      };
    }

    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

interface AgentContextValue {
  state: AgentState;
  sendMessage: (text: string) => Promise<void>;
  abort: () => void;
  newConversation: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
}

const AgentContext = createContext<AgentContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [state, dispatch] = useReducer(agentReducer, {
    conversationId: null,
    messages: [],
    isStreaming: false,
    currentStream: null,
    error: null,
  });

  // Fetches one conversation's full messages and swaps it in. Shared by the
  // mount-time "resume the latest chat" effect below and ConversationHistory
  // (the sidebar rail) manually switching conversations -- one code path for
  // "load this conversation" rather than two copies that could drift.
  const loadConversation = useCallback(async (conversationId: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const conversation = await getAgentConversation(conversationId);
    dispatch({
      type: 'RESTORE_CONVERSATION',
      conversationId: conversation.id,
      messages: conversation.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })),
    });
  }, []);

  // Conversation history now lives in Supabase (agent_conversations /
  // agent_messages -- backend/agent/persistence.js), not the browser. On
  // mount, pick up wherever the most recent conversation left off, the same
  // way opening claude.ai resumes your last chat. Silently does nothing on
  // failure (e.g. no conversations yet) -- an empty chat is the correct
  // starting state, not an error.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const conversations = await listAgentConversations();
        if (cancelled || conversations.length === 0) return;
        if (!cancelled) await loadConversation(conversations[0].id);
      } catch {
        // No history yet, or the fetch failed -- start fresh either way.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loadConversation]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || state.isStreaming) return;

      // SEC-2: no client-readable token to check -- the session is an
      // httpOnly cookie, so `user` being non-null is what "signed in" means
      // on the client (see lib/AuthContext.tsx). The server re-checks the
      // cookie itself on every request regardless.
      if (!user) {
        dispatch({ type: 'STREAM_ERROR', error: 'Not authenticated' });
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      dispatch({
        type: 'START_STREAM',
        conversationId: state.conversationId || undefined,
        userMessage: text.trim(),
      });

      // Task 12.5: buffer token deltas to ~30ms frames instead of one
      // dispatch (one React render) per streamed token.
      let tokenBuffer = '';
      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      const flushTokens = () => {
        flushTimer = null;
        if (!tokenBuffer) return;
        const text = tokenBuffer;
        tokenBuffer = '';
        dispatch({ type: 'APPEND_TOKEN', text });
      };
      const queueToken = (delta: string) => {
        tokenBuffer += delta;
        if (!flushTimer) {
          flushTimer = setTimeout(flushTokens, 30);
        }
      };

      try {
        for await (const event of streamAgent(
          text.trim(),
          state.conversationId || undefined,
          controller.signal
        )) {
          switch (event.type) {
            case 'ready':
              // Only sets the id -- START_STREAM already appended the user
              // message above. Re-dispatching START_STREAM here (as before)
              // appended it a second time on every new conversation, since
              // state.conversationId is still the stale pre-turn value in
              // this closure.
              dispatch({ type: 'SET_CONVERSATION_ID', conversationId: event.conversationId });
              break;

            case 'token':
              queueToken(event.text);
              break;

            case 'tool_start':
              dispatch({
                type: 'TOOL_START',
                id: event.id,
                name: event.name,
                label: event.label,
              });
              break;

            case 'tool_done':
              dispatch({
                type: 'TOOL_DONE',
                id: event.id,
                summary: event.summary,
                durationMs: event.durationMs,
              });
              break;

            case 'done':
              dispatch({
                type: 'END_STREAM',
                finalText: event.text,
                toolCalls: event.toolTrace,
                validatorStatus: event.validatorStatus,
                navigationOffers: event.navigationOffers,
                provenance: event.provenance,
                usage: event.usage,
              });
              break;

            case 'warning':
              console.warn('Agent warning:', event.message);
              break;

            case 'error':
              dispatch({ type: 'STREAM_ERROR', error: event.message });
              break;
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        dispatch({
          type: 'STREAM_ERROR',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        if (flushTimer) clearTimeout(flushTimer);
        abortControllerRef.current = null;
      }
    },
    [user, state.conversationId, state.isStreaming]
  );

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch({ type: 'STREAM_ERROR', error: 'Stream cancelled' });
  }, []);

  const newConversation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch({ type: 'NEW_CONVERSATION' });
  }, []);

  return (
    <AgentContext.Provider value={{ state, sendMessage, abort, newConversation, loadConversation }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgent must be used within AgentProvider');
  }
  return context;
}
