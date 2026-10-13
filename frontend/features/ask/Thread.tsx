'use client';

import * as React from 'react';
import { Check, ChevronDown, Copy, RotateCcw } from 'lucide-react';
import { BrandMark } from '@/components/shell/BrandMark';
import { cn } from '@/lib/cn';
import type { ChatMessage, EntityKind } from '@/types/view';
import { AnswerMarkdown, MentionChip, answerAsPlainText } from './AnswerMarkdown';

/** The answer being written right now (not yet a saved message). */
export interface DraftAnswer {
  content: string;
  status: 'thinking' | 'streaming' | 'stopped' | 'error';
  error?: string;
}

export function OBAAvatar() {
  return (
    <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center">
      <BrandMark height={30} />
    </span>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-[18px] rounded-br-md bg-surface-sunken px-4 py-2.5 text-[15px] leading-6 text-ink">
        {content}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex h-7 items-center gap-2 text-ink-3" role="status">
      <span className="flex gap-1" aria-hidden="true">
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-3" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </span>
      <span className="type-meta">Reading OBA&apos;s records…</span>
    </div>
  );
}

function ActionButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[7px] px-2 text-[12px] text-ink-3 transition-colors hover:bg-surface-sunken hover:text-ink"
    >
      {children}
    </button>
  );
}

function Sources({ sources, onOpenEntity }: { sources: ChatMessage['sources']; onOpenEntity: (id: string, kind: EntityKind) => void }) {
  const [open, setOpen] = React.useState(false);
  const withEntity = sources.filter((s) => s.entity);
  if (withEntity.length === 0) return null;
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="type-meta inline-flex cursor-pointer items-center gap-1 text-ink-3 transition-colors hover:text-ink"
      >
        Mentioned <span className="tabular-nums">{withEntity.length}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Entities mentioned in this answer">
          {withEntity.map((s) => (
            <li key={s.entity!.id}>
              <MentionChip id={s.entity!.id} name={s.entity!.name} kind={s.entity!.kind} onOpen={onOpenEntity} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AssistantMessage({
  message,
  draft,
  isLast,
  onRetry,
  onOpenEntity,
}: {
  message?: ChatMessage;
  draft?: DraftAnswer;
  isLast: boolean;
  onRetry?: () => void;
  onOpenEntity: (id: string, kind: EntityKind) => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const content = message?.content ?? draft?.content ?? '';
  const settled = !!message || draft?.status === 'stopped';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(answerAsPlainText(content));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };

  return (
    <div className="group/answer flex gap-3.5">
      <OBAAvatar />
      <div className="min-w-0 flex-1">
        {draft?.status === 'thinking' && !content ? <ThinkingDots /> : <AnswerMarkdown content={content} onOpenEntity={onOpenEntity} />}

        {draft?.status === 'streaming' && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-ink-2 align-middle" aria-hidden="true" />}

        {draft?.status === 'stopped' && <p className="type-meta mt-2 text-ink-3">Stopped. The full answer is saved in this chat; reopen it to read the rest.</p>}

        {draft?.status === 'error' && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-control border border-rule bg-surface px-3 py-2">
            <p className="type-meta text-st-fail">{draft.error ?? 'Something went wrong.'}</p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="type-meta cursor-pointer font-medium text-amber-ink hover:underline">
                Try again
              </button>
            )}
          </div>
        )}

        {message?.answeredBy === 'graph' && <p className="type-meta mt-2 text-ink-3">Answered directly from OBA&apos;s records (the AI model was unavailable).</p>}

        {message && <Sources sources={message.sources} onOpenEntity={onOpenEntity} />}

        {settled && content && (
          <div className={cn('-ml-2 mt-2 flex items-center gap-0.5 transition-opacity', isLast ? 'opacity-100' : 'opacity-0 focus-within:opacity-100 group-hover/answer:opacity-100')}>
            <ActionButton onClick={copy} label={copied ? 'Copied' : 'Copy answer'}>
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy'}
            </ActionButton>
            {onRetry && (
              <ActionButton onClick={onRetry} label="Ask again">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Retry
              </ActionButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export interface ThreadProps {
  messages: ChatMessage[];
  draft: DraftAnswer | null;
  /** Re-asks the question before the given assistant message (or the last question for the draft). */
  onRetry: (assistantIndex: number | 'draft') => void;
  onOpenEntity: (id: string, kind: EntityKind) => void;
  busy: boolean;
}

export function Thread({ messages, draft, onRetry, onOpenEntity, busy }: ThreadProps) {
  const lastAssistant = draft ? -1 : messages.map((m) => m.role).lastIndexOf('assistant');
  return (
    <div className="space-y-8">
      {messages.map((m, i) =>
        m.role === 'user' ? (
          <UserMessage key={m.id} content={m.content} />
        ) : (
          <AssistantMessage
            key={m.id}
            message={m}
            isLast={i === lastAssistant}
            onRetry={busy ? undefined : () => onRetry(i)}
            onOpenEntity={onOpenEntity}
          />
        ),
      )}
      {draft && (
        <AssistantMessage
          draft={draft}
          isLast
          onRetry={draft.status === 'error' || draft.status === 'stopped' ? () => onRetry('draft') : undefined}
          onOpenEntity={onOpenEntity}
        />
      )}
    </div>
  );
}
