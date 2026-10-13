'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Activity, ArrowDown, KeyRound, PanelRightOpen, ShieldAlert, SquarePen, UserMinus, History } from 'lucide-react';
import { AssetDrawer } from '@/features/assets/AssetDrawer';
import { useResource } from '@/lib/useResource';
import { useSession } from '@/lib/session';
import { useToast } from '@/components/ui/Toast';
import { BrandMark } from '@/components/shell/BrandMark';
import {
  deleteConversation as apiDelete,
  fetchConversation,
  fetchConversations,
  renameConversation as apiRename,
  streamMessage,
} from '@/lib/api/assistant';
import { toApiError } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import type { ChatMessage, Conversation, EntityKind } from '@/types/view';
import { Composer } from './Composer';
import { ConversationRail } from './ConversationRail';
import { Thread, type DraftAnswer } from './Thread';

// Generic on purpose: no names that may not exist in this organisation.
const SUGGESTIONS = [
  { text: "Who's leaving, and what do they own?", icon: UserMinus },
  { text: 'Which critical automations have no backup?', icon: ShieldAlert },
  { text: 'Which automations run on personal credentials?', icon: KeyRound },
  { text: 'How are we doing on continuity?', icon: Activity },
];

const RAIL_KEY = 'oba.ask.railCollapsed';

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(RAIL_KEY) === '1';
  } catch {
    return false;
  }
}

function greetingFor(hour: number): string {
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export function AskView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlConversation = searchParams.get('c');
  const urlQuery = searchParams.get('q');
  const { session } = useSession();
  const { toast } = useToast();
  const firstName = session?.name ? session.name.split(' ')[0] : null;

  // ── Conversations (rail) ────────────────────────────────────────────────
  const convosResource = useResource<Conversation[]>('assistant-conversations', fetchConversations);
  const [convos, setConvos] = React.useState<Conversation[] | undefined | null>(undefined);
  React.useEffect(() => {
    if (convosResource.status === 'ready') setConvos(convosResource.data);
    else if (convosResource.status === 'error') setConvos((prev) => prev ?? null);
  }, [convosResource]);

  // ── Thread state ────────────────────────────────────────────────────────
  const [activeId, setActiveId] = React.useState<string | null>(urlConversation);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [draft, setDraft] = React.useState<DraftAnswer | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loadingThread, setLoadingThread] = React.useState(false);
  const [input, setInput] = React.useState('');
  const abortRef = React.useRef<AbortController | null>(null);
  /** Set while a stream creates a conversation, so the URL change doesn't reload over it. */
  const ownUrlChange = React.useRef<string | null>(null);
  const streaming = draft?.status === 'thinking' || draft?.status === 'streaming';

  // Rail: collapsed (desktop) and drawer (phone).
  const [railCollapsed, setRailCollapsed] = React.useState(false);
  const [railOpenMobile, setRailOpenMobile] = React.useState(false);
  React.useEffect(() => setRailCollapsed(readCollapsed()), []);
  const setCollapsed = (v: boolean) => {
    setRailCollapsed(v);
    try {
      window.localStorage.setItem(RAIL_KEY, v ? '1' : '0');
    } catch {
      /* storage unavailable: the choice just isn't remembered */
    }
  };

  const [greeting, setGreeting] = React.useState('Welcome');
  React.useEffect(() => setGreeting(greetingFor(new Date().getHours())), []);

  const [inspectAssetId, setInspectAssetId] = React.useState<string | null>(null);
  const composerRef = React.useRef<HTMLTextAreaElement>(null);

  const setUrl = React.useCallback(
    (conversationId: string | null) => {
      router.replace(conversationId ? `${pathname}?c=${encodeURIComponent(conversationId)}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  // Open whichever conversation the URL names (history links, back/forward, refresh).
  React.useEffect(() => {
    if (urlConversation === ownUrlChange.current) {
      ownUrlChange.current = null;
      return;
    }
    abortRef.current?.abort();
    setDraft(null);
    setLoadError(null);
    setActiveId(urlConversation);
    if (!urlConversation) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingThread(true);
    fetchConversation(urlConversation)
      .then((d) => !cancelled && setMessages(d.messages))
      .catch((e) => {
        if (cancelled) return;
        setMessages([]);
        setLoadError(toApiError(e).status === 404 ? 'That chat no longer exists.' : `We couldn't open that chat: ${toApiError(e).message}`);
      })
      .finally(() => !cancelled && setLoadingThread(false));
    return () => {
      cancelled = true;
    };
  }, [urlConversation]);

  // ── Sending ────────────────────────────────────────────────────────────
  const send = React.useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q || streaming) return;
      setInput('');
      setLoadError(null);
      const tempId = `pending-${Date.now()}`;
      setMessages((prev) => [...prev, { id: tempId, role: 'user', content: q, sources: [], createdAt: new Date().toISOString() }]);
      setDraft({ content: '', status: 'thinking' });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamMessage(
          activeId,
          q,
          {
            onStart: ({ conversationId: id, conversation, userMessage }) => {
              setMessages((prev) => prev.map((m) => (m.id === tempId ? userMessage : m)));
              setConvos((prev) => [conversation, ...(prev ?? []).filter((c) => c.id !== id)]);
              if (id !== activeId) {
                setActiveId(id);
                ownUrlChange.current = id;
                setUrl(id);
              }
            },
            onDelta: (text) => setDraft((d) => ({ content: (d?.content ?? '') + text, status: 'streaming' })),
            onDone: ({ message, conversation }) => {
              setMessages((prev) => [...prev, message]);
              setDraft(null);
              setConvos((prev) => [conversation, ...(prev ?? []).filter((c) => c.id !== conversation.id)]);
            },
          },
          controller.signal,
        );
        if (controller.signal.aborted) setDraft((d) => (d ? { ...d, status: 'stopped' } : d));
      } catch (e) {
        setDraft((d) => ({ content: d?.content ?? '', status: 'error', error: toApiError(e).message }));
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [activeId, setUrl, streaming],
  );

  const stop = () => abortRef.current?.abort();

  // A question handed over in the URL (top-bar field, old /ask links) is asked once.
  const askedFromUrl = React.useRef(false);
  React.useEffect(() => {
    if (!urlQuery || askedFromUrl.current) return;
    askedFromUrl.current = true;
    router.replace(pathname, { scroll: false });
    void send(urlQuery);
  }, [urlQuery, router, pathname, send]);

  /** Retry re-asks the question that produced the answer, as a new turn. */
  const retry = (index: number | 'draft') => {
    const upTo = index === 'draft' ? messages.length : index;
    const question = [...messages.slice(0, upTo)].reverse().find((m) => m.role === 'user');
    if (!question) return;
    if (index === 'draft') {
      // The failed or stopped question is replaced, not repeated.
      setMessages((prev) => (prev[prev.length - 1]?.role === 'user' ? prev.slice(0, -1) : prev));
      setDraft(null);
    }
    void send(question.content);
  };

  const newChat = () => {
    abortRef.current?.abort();
    setRailOpenMobile(false);
    setUrl(null);
    setTimeout(() => composerRef.current?.focus(), 0);
  };

  const selectChat = (id: string) => {
    setRailOpenMobile(false);
    if (id !== activeId) setUrl(id);
  };

  const rename = async (id: string, title: string) => {
    try {
      const updated = await apiRename(id, title);
      setConvos((prev) => prev?.map((c) => (c.id === id ? { ...c, title: updated.title } : c)) ?? prev);
    } catch (e) {
      toast({ title: "We couldn't rename that chat", description: toApiError(e).message, variant: 'error' });
    }
  };

  const remove = async (id: string) => {
    try {
      await apiDelete(id);
      setConvos((prev) => prev?.filter((c) => c.id !== id) ?? prev);
      if (id === activeId) setUrl(null);
    } catch (e) {
      toast({ title: "We couldn't delete that chat", description: toApiError(e).message, variant: 'error' });
    }
  };

  // Stable across renders, so answer chips don't remount (and drop a click) when the router object changes.
  const routerRef = React.useRef(router);
  routerRef.current = router;
  const openEntity = React.useCallback((id: string, kind: EntityKind) => {
    if (kind === 'person') routerRef.current.push(`/people/${encodeURIComponent(id)}`);
    else if (kind === 'group') routerRef.current.push(`/people/teams/${encodeURIComponent(id)}`);
    else setInspectAssetId(id);
  }, []);

  // ── Scrolling: follow the answer while the reader is at the bottom ────────
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = React.useState(true);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  };
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottom) el.scrollTop = el.scrollHeight;
  }, [messages, draft, atBottom]);
  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const isEmpty = messages.length === 0 && !draft && !loadingThread;

  const rail = (props: { onClose?: () => void; className?: string }) => (
    <ConversationRail
      conversations={convos}
      activeId={activeId}
      onSelect={selectChat}
      onNew={newChat}
      onRename={rename}
      onDelete={remove}
      onRetry={convosResource.reload}
      onCollapse={() => setCollapsed(true)}
      {...props}
    />
  );

  return (
    <div className="flex min-h-0 flex-1">
      {railOpenMobile && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          <button type="button" aria-label="Close chat history" className="absolute inset-0 bg-ink-night/40" onClick={() => setRailOpenMobile(false)} />
          {rail({ onClose: () => setRailOpenMobile(false), className: 'relative z-10 h-full shadow-panel' })}
        </div>
      )}

      <section aria-label="Ask OBA" className="relative flex min-w-0 flex-1 flex-col">
        {/* Thread toolbar: chat title; new chat and the history toggle sit beside the rail */}
        <div className="flex h-14 shrink-0 items-center gap-1 px-4">
          <p className="type-meta min-w-0 flex-1 truncate font-medium text-ink-2">
            {activeId ? convos?.find((c) => c.id === activeId)?.title : null}
          </p>
          {(railCollapsed || !isEmpty) && (
            <button
              type="button"
              onClick={newChat}
              className={cn(
                'type-meta inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-control px-2.5 font-medium text-ink-2 hover:bg-surface-sunken hover:text-ink',
                !railCollapsed && 'md:hidden',
              )}
            >
              <SquarePen className="h-4 w-4" aria-hidden="true" />
              New chat
            </button>
          )}
          <button
            type="button"
            onClick={() => setRailOpenMobile(true)}
            aria-label="Show chat history"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-control text-ink-3 hover:bg-surface-sunken hover:text-ink md:hidden"
          >
            <History className="h-4 w-4" aria-hidden="true" />
          </button>
          {railCollapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Show chat history"
              title="Show chat history"
              className="hidden h-8 w-8 cursor-pointer items-center justify-center rounded-control text-ink-3 hover:bg-surface-sunken hover:text-ink md:inline-flex"
            >
              <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {isEmpty ? (
          /* ── Empty state: greeting, composer, suggestions ─────────────── */
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-16">
            <div className="w-full max-w-[680px]">
              <div className="mb-8 flex flex-col items-center text-center">
                <BrandMark height={84} className="mb-6" />
                <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-ink">
                  {greeting}
                  {firstName ? `, ${firstName}` : ''}
                </h1>
                <p className="mt-2 text-[15px] text-ink-2">Ask about owners, backups, departures, or what breaks if something fails.</p>
              </div>

              {loadError && <p className="type-meta mb-3 text-center text-st-fail">{loadError}</p>}

              <Composer ref={composerRef} variant="hero" value={input} onChange={setInput} onSubmit={() => send(input)} autoFocus />

              <ul className="mt-4 grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map(({ text, icon: Icon }) => (
                  <li key={text} className="flex">
                    <button
                      type="button"
                      onClick={() => send(text)}
                      className="group flex min-h-[3.25rem] w-full cursor-pointer items-center gap-2.5 rounded-control border border-rule bg-surface/60 px-3.5 py-2.5 text-left text-[13px] leading-5 text-ink-2 transition-colors hover:border-ink-3 hover:bg-surface hover:text-ink"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-ink-3 transition-colors group-hover:text-amber-ink" aria-hidden="true" />
                      {text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          /* ── Thread + docked composer ───────────────────────────────────── */
          <>
            <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto" role="log" aria-label="Conversation" aria-busy={streaming}>
              <div className="mx-auto w-full max-w-[720px] px-5 pb-10 pt-4">
                {loadingThread ? (
                  <div className="space-y-6" aria-label="Loading chat">
                    <span className="skeleton ml-auto block h-10 w-2/5 rounded-2xl" />
                    <span className="skeleton block h-4 w-4/5" />
                    <span className="skeleton block h-4 w-3/5" />
                  </div>
                ) : (
                  <Thread messages={messages} draft={draft} onRetry={retry} onOpenEntity={openEntity} busy={streaming} />
                )}
              </div>
            </div>

            <div className="relative shrink-0 px-4 pb-4">
              {/* Fade the thread out under the composer */}
              <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-canvas to-transparent" aria-hidden="true" />
              {!atBottom && (
                <button
                  type="button"
                  onClick={jumpToLatest}
                  aria-label="Jump to the latest message"
                  className="absolute -top-12 left-1/2 inline-flex h-8 w-8 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-rule bg-surface text-ink-2 shadow-panel hover:text-ink"
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <div className="mx-auto w-full max-w-[720px]">
                <Composer ref={composerRef} value={input} onChange={setInput} onSubmit={() => send(input)} onStop={stop} isStreaming={streaming} />
                <p className="mt-2 text-center text-[11px] text-ink-3">Answers come from your organization&apos;s records in OBA. People are never ranked or scored.</p>
              </div>
            </div>
          </>
        )}
      </section>

      {/* History rail on the right: inline on desktop (collapsible), a drawer on phones */}
      {!railCollapsed && rail({ className: 'hidden md:flex' })}

      <AssetDrawer assetId={inspectAssetId} isOpen={Boolean(inspectAssetId)} onClose={() => setInspectAssetId(null)} />
    </div>
  );
}
