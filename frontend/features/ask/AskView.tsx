'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ChatMessage, Conversation, EntityKind, EvidenceGrade } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EntityChip } from '@/components/ui/EntityChip';
import { SourcesList, type SourceFactItem } from '@/components/ui/SourcesList';
import { Skeleton, EmptyState, ErrorState } from '@/components/ui/states';
import { AssetDrawer } from '@/features/assets/AssetDrawer';
import { useResource } from '@/lib/useResource';
import {
  fetchConversations,
  fetchConversation,
  sendMessage,
  askOnce,
} from '@/lib/api/assistant';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface AskViewProps {
  initialConversations?: Conversation[];
  initialMessages?: ChatMessage[];
  defaultQuery?: string;
}

const SUGGESTED_QUERIES = [
  'Which critical automations have no secondary backup?',
  'What is our blast radius if Stripe Billing pipeline fails?',
  'Which workflows run on personal user credentials?',
  'What happens if Omar Haddad leaves the company?',
];

export function AskView({
  initialConversations,
  initialMessages,
  defaultQuery,
}: AskViewProps) {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || defaultQuery || '';

  // Conversations Resource
  const convosResource = useResource<Conversation[]>(
    'assistant-conversations',
    fetchConversations,
  );

  const conversations =
    convosResource.status === 'ready'
      ? convosResource.data
      : initialConversations || [];

  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages || []);
  const [inputText, setInputText] = React.useState(urlQuery);
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Inspector Drawer State
  const [inspectAssetId, setInspectAssetId] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load conversation when selected
  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    setError(null);
    try {
      const data = await fetchConversation(id);
      setMessages(data.messages);
    } catch {
      // Fallback
    }
  };

  const handleStartNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInputText('');
    setError(null);
  };

  // Submit query
  const handleSend = async (queryText: string) => {
    const q = queryText.trim();
    if (!q || isSending) return;

    setInputText('');
    setError(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      sources: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      let assistantMsg: ChatMessage;
      try {
        const res = await sendMessage(activeConversationId, q);
        if (!activeConversationId) {
          setActiveConversationId(res.conversationId);
          convosResource.reload();
        }
        assistantMsg = res.message;
      } catch {
        // Fallback to askOnce
        assistantMsg = await askOnce(q);
      }

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err?.message || 'Failed to query assistant. Please retry.');
    } finally {
      setIsSending(false);
    }
  };

  // Execute initial search param query once on mount if provided
  const hasExecutedUrlQuery = React.useRef(false);
  React.useEffect(() => {
    if (urlQuery && !hasExecutedUrlQuery.current && messages.length === 0) {
      hasExecutedUrlQuery.current = true;
      handleSend(urlQuery);
    }
  }, [urlQuery]);

  // Parse OBA entity markdown links: [Name](oba://asset/<id>?grade=<grade>) or oba://person/<id>
  const renderMessageContent = (content: string) => {
    const obaLinkRegex = /\[([^\]]+)\]\(oba:\/\/(asset|person)\/([^?)]+)(?:\?grade=([a-z]+))?\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = obaLinkRegex.exec(content)) !== null) {
      const [fullMatch, name, rawKind, entityId, gradeParam] = match;
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        parts.push(content.substring(lastIndex, matchIndex));
      }

      const kind: EntityKind = rawKind === 'asset' ? 'automation' : 'person';
      const grade: EvidenceGrade = (gradeParam as EvidenceGrade) || 'confirmed';

      parts.push(
        <span key={`oba-entity-${entityId}-${matchIndex}`} className="inline-block mx-1 align-middle">
          <EntityChip
            id={entityId}
            name={name}
            kind={kind}
            grade={grade}
            onInspect={(id, k) => {
              if (k === 'person') {
                window.location.href = `/people/${id}`;
              } else {
                setInspectAssetId(id);
              }
            }}
          />
        </span>,
      );

      lastIndex = matchIndex + fullMatch.length;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return (
      <div className="whitespace-pre-wrap leading-relaxed text-sm text-ink font-sans space-y-2">
        {parts}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto pb-16 min-h-[calc(100vh-10rem)]">
      {/* Left History Rail */}
      <aside
        aria-label="Conversation History"
        className="w-full lg:w-72 shrink-0 border border-rule rounded-card bg-surface p-4 flex flex-col justify-between shadow-xs h-fit lg:h-[750px]"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-rule/50 pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
              Conversations
            </h2>
            <button
              type="button"
              onClick={handleStartNewConversation}
              className="text-xs font-semibold text-amber-ink hover:text-ink transition-colors cursor-pointer"
            >
              + New Chat
            </button>
          </div>

          {/* Conversations List */}
          <div className="space-y-1 overflow-y-auto max-h-[500px]">
            {convosResource.status === 'loading' && !initialConversations ? (
              <div className="space-y-2 py-2">
                <Skeleton variant="text" className="w-full h-8" />
                <Skeleton variant="text" className="w-4/5 h-8" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-ink-3 py-4 text-center font-mono">
                No past conversations.
              </p>
            ) : (
              conversations.map((c) => {
                const isActive = activeConversationId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectConversation(c.id)}
                    className={cn(
                      'w-full text-left p-2.5 rounded-control text-xs transition-colors cursor-pointer block truncate',
                      isActive
                        ? 'bg-surface-sunken text-ink font-semibold'
                        : 'text-ink-2 hover:bg-surface-sunken/60 hover:text-ink',
                    )}
                  >
                    <div className="truncate font-medium">{c.title}</div>
                    <div className="text-[10px] text-ink-3 font-mono mt-0.5">
                      {formatDate(c.updatedAt)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Grounding Invariant Footer */}
        <div className="pt-4 border-t border-rule/50 text-[11px] text-ink-3 font-mono space-y-1">
          <p className="font-semibold text-ink">Continuity Invariant:</p>
          <p>Answers cite verified SCD2 facts. Zero hallucinated metrics or risk scores.</p>
        </div>
      </aside>

      {/* Main Chat Column */}
      <section
        aria-label="Ask OBA Discussion"
        className="flex-1 flex flex-col border border-rule rounded-card bg-surface shadow-card overflow-hidden h-[750px]"
      >
        {/* Chat Header */}
        <div className="p-4 sm:p-5 border-b border-rule/50 bg-surface flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
                Continuity Intelligence
              </span>
            </div>
            <h1 className="font-serif text-2xl text-ink font-normal tracking-tight">
              Ask Horquva
            </h1>
          </div>

          <button
            type="button"
            onClick={handleStartNewConversation}
            className="rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
          >
            Clear Thread
          </button>
        </div>

        {/* Messages Stream */}
        <div
          role="log"
          aria-live="polite"
          aria-label="Conversation messages"
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-canvas/30"
        >
          {messages.length === 0 ? (
            /* Empty State & Starter Prompts */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6 py-12">
              <div className="space-y-2">
                <span className="text-3xl" aria-hidden="true">
                  ✨
                </span>
                <h2 className="font-serif text-2xl text-ink font-normal">
                  How can I help with continuity today?
                </h2>
                <p className="text-xs text-ink-3 leading-relaxed">
                  I analyze live SCD2 temporal facts, backup assignments, and dependency chains. Ask
                  me about upcoming leavers, unbacked critical workflows, or vendor blast radius.
                </p>
              </div>

              {/* Quick Prompts */}
              <div className="w-full space-y-2 text-left">
                <p className="text-[11px] font-mono text-ink-3 uppercase tracking-wider">
                  Suggested inquiries
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTED_QUERIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSend(q)}
                      className="p-3 text-xs text-left rounded-control border border-rule bg-surface hover:border-amber hover:text-amber-ink transition-colors cursor-pointer text-ink font-medium shadow-xs"
                    >
                      "{q}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Chat Messages List */
            <>
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const mappedSources: SourceFactItem[] = msg.sources.map((s, idx) => ({
                  id: `src-${idx}-${s.label}`,
                  attribute: s.label,
                  value: s.detail,
                  grade: 'confirmed',
                  source: 'SCD2 Temporal Record',
                  entityName: s.label,
                }));

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex flex-col',
                      isUser ? 'items-end' : 'items-start',
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-2xl rounded-card p-4 space-y-3 shadow-xs',
                        isUser
                          ? 'bg-surface-sunken text-ink border border-rule'
                          : 'bg-surface text-ink border border-rule/80',
                      )}
                    >
                      <div className="flex items-center justify-between gap-4 text-[10px] font-mono text-ink-3 border-b border-rule/30 pb-1.5">
                        <span className="font-semibold uppercase tracking-wider text-ink-2">
                          {isUser ? 'You' : 'Horquva Continuity Assistant'}
                        </span>
                        <span>{formatDate(msg.createdAt)}</span>
                      </div>

                      {/* Content */}
                      <div>{renderMessageContent(msg.content)}</div>

                      {/* Sources List for Assistant */}
                      {!isUser && mappedSources.length > 0 && (
                        <div className="pt-2">
                          <SourcesList sources={mappedSources} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isSending && (
                <div className="flex flex-col items-start">
                  <div className="max-w-xl rounded-card p-4 space-y-2 bg-surface border border-rule shadow-xs">
                    <div className="text-[10px] font-mono text-ink-3">
                      Horquva Continuity Assistant is searching SCD2 facts...
                    </div>
                    <Skeleton variant="text" className="w-3/4 h-4" />
                    <Skeleton variant="text" className="w-1/2 h-4" />
                  </div>
                </div>
              )}

              {error && (
                <ErrorState message={error} onRetry={() => handleSend(messages[messages.length - 1]?.content || '')} />
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-rule bg-surface">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputText);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask anything about system continuity, owners, or unbacked automations..."
              disabled={isSending}
              aria-label="Your query for Horquva"
              className="flex-1 rounded-control border border-rule bg-surface px-4 py-2.5 text-xs text-ink placeholder:text-ink-3 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="rounded-control bg-amber text-paper px-4 py-2.5 text-xs font-semibold hover:bg-amber-hover transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isSending ? 'Thinking...' : 'Send'}
            </button>
          </form>
        </div>
      </section>

      {/* Asset Fact Drawer */}
      <AssetDrawer
        assetId={inspectAssetId}
        isOpen={Boolean(inspectAssetId)}
        onClose={() => setInspectAssetId(null)}
      />
    </div>
  );
}
