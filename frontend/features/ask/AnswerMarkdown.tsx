'use client';

import * as React from 'react';
import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown';
import { EntityKindIcon, kindLabel } from '@/components/ui/EntityKindIcon';
import type { EntityKind } from '@/types/view';

/** Entity links from the backend look like [Name](oba://<kind>/<entity id>). */
const OBA_LINK = /^oba:\/\/([a-z_]+)\/(.+)$/;

export interface AnswerMarkdownProps {
  content: string;
  onOpenEntity: (id: string, kind: EntityKind) => void;
}

/** An inline mention of an asset or person: opens its details. No evidence grade is implied. */
export function MentionChip({ id, name, kind, onOpen }: { id: string; name: string; kind: string; onOpen: (id: string, kind: EntityKind) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(id, (kind === 'asset' ? 'automation' : kind) as EntityKind)}
      title={`${kindLabel(kind)}: open ${name}`}
      className="mx-0.5 inline-flex max-w-full cursor-pointer items-center gap-1 rounded-md border border-rule bg-surface px-1.5 py-px align-baseline text-[0.875em] font-medium leading-snug text-ink transition-colors hover:border-ink-3 hover:bg-surface-sunken"
    >
      <EntityKindIcon kind={kind} className="h-3 w-3 shrink-0 text-ink-3" />
      <span className="truncate">{name}</span>
    </button>
  );
}

/** Rendered answer: readable prose, real lists, entity mentions as chips. */
export function AnswerMarkdown({ content, onOpenEntity }: AnswerMarkdownProps) {
  const components = React.useMemo<Components>(
    () => ({
      p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
      ul: ({ children }) => <ul className="mb-3 list-disc space-y-1.5 pl-5 marker:text-ink-3 last:mb-0">{children}</ul>,
      ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1.5 pl-5 marker:text-ink-3 last:mb-0">{children}</ol>,
      li: ({ children }) => <li className="pl-1">{children}</li>,
      strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
      em: ({ children }) => <em className="italic">{children}</em>,
      h1: ({ children }) => <p className="mb-2 font-semibold text-ink">{children}</p>,
      h2: ({ children }) => <p className="mb-2 font-semibold text-ink">{children}</p>,
      h3: ({ children }) => <p className="mb-2 font-semibold text-ink">{children}</p>,
      code: ({ children }) => <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.85em]">{children}</code>,
      blockquote: ({ children }) => <blockquote className="mb-3 border-l-2 border-rule pl-3 text-ink-2">{children}</blockquote>,
      a: ({ href, children }) => {
        const m = href ? OBA_LINK.exec(href) : null;
        if (m) {
          const name = React.Children.toArray(children).join('');
          return <MentionChip id={m[2]} name={name} kind={m[1]} onOpen={onOpenEntity} />;
        }
        return (
          <a href={href} target="_blank" rel="noreferrer noopener" className="font-medium text-amber-ink underline decoration-amber/40 underline-offset-2 hover:decoration-amber-ink">
            {children}
          </a>
        );
      },
    }),
    [onOpenEntity],
  );

  return (
    <div className="text-[15px] leading-7 text-ink">
      <ReactMarkdown
        components={components}
        // oba:// entity links must survive react-markdown's URL sanitising; everything else keeps the default.
        urlTransform={(url) => (url.startsWith('oba://') ? url : defaultUrlTransform(url))}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** The answer as plain text for the clipboard: entity links become their names. */
export function answerAsPlainText(content: string): string {
  return content.replace(/\[([^\]]+)\]\(oba:\/\/[^)]+\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1');
}
