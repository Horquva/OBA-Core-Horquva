'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAgent } from './AgentProvider';
import { listAgentConversations, type AgentConversationSummary } from '@/lib/agentClient';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// The rail of past conversations -- chat history previously had no visible
// UI at all: the most recent conversation silently auto-loaded on open, but
// there was no way to see it existed, switch to an older one, or tell that
// anything was even being remembered.
export function ConversationHistory() {
  const { state, newConversation, loadConversation } = useAgent();
  const [conversations, setConversations] = useState<AgentConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Refetches on mount and after every completed turn (isStreaming going
  // false) -- a turn can create a brand-new conversation or move the active
  // one to the top, and this is the one signal that both happened.
  useEffect(() => {
    if (state.isStreaming) return;
    let cancelled = false;

    listAgentConversations()
      .then((data) => {
        if (!cancelled) setConversations(data);
      })
      .catch(() => {
        // No history yet, or not signed in -- an empty rail is correct.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [state.isStreaming]);

  return (
    <div className="flex w-[260px] flex-shrink-0 flex-col border-r border-[var(--border-subtle)]">
      <div className="flex h-14 flex-shrink-0 items-center px-3">
        <button
          onClick={newConversation}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
        >
          <Plus size={16} />
          New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {!loading && conversations.length === 0 && (
          <p className="px-2.5 py-2 text-xs text-[var(--text-tertiary)]">
            Your conversations will appear here.
          </p>
        )}

        <div className="flex flex-col gap-0.5">
          {conversations.map((c) => {
            const isActive = c.id === state.conversationId;
            return (
              <button
                key={c.id}
                onClick={() => loadConversation(c.id)}
                className={`rounded-lg px-2.5 py-2 text-left transition-colors ${
                  isActive
                    ? 'bg-[var(--accent-dim)]'
                    : 'hover:bg-[var(--bg-hover)]'
                }`}
              >
                <span
                  className={`block truncate text-sm ${
                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {c.title}
                </span>
                <span className="block text-xs text-[var(--text-tertiary)]">
                  {timeAgo(c.lastMessageAt)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ConversationHistory;
