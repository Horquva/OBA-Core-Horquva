'use client';

import ReactMarkdown, { type Components } from 'react-markdown';
import ToolTrace from './ToolTrace';
import { NavigationOffer } from './NavigationOffer';
import { ValidatorWarning } from './ValidatorWarning';

type ToolCall = {
  id: string;
  name: string;
  label: string;
  status: 'running' | 'done';
  summary: string | null;
  durationMs: number | null;
};

type AgentMessageProps = {
  message: {
    role: 'user' | 'assistant';
    content: string;
    toolCalls?: ToolCall[];
    validatorStatus?: 'clean' | 'repaired' | 'flagged';
    navigationOffers?: { slug: string; route: string; label: string; reason: string | null }[];
  };
};

// The model writes Markdown (bold, bullet lists, headings) -- this used to
// render as literal asterisks and dashes because the raw string went
// straight into a <p>. Mapped onto the app's real design tokens rather than
// a generic prose theme, so bold/lists/code look native to this app instead
// of a bolted-on markdown viewer.
const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-3 whitespace-pre-wrap text-[15px] leading-7 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="text-[15px] leading-7">{children}</li>,
  h1: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-[var(--text-primary)] first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-[var(--text-primary)] first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-2 mt-3 text-sm font-semibold text-[var(--text-primary)] first:mt-0">{children}</h4>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline underline-offset-2 hover:opacity-80">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--text-primary)]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-[13px] last:mb-0">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-[var(--border-default)] pl-3 text-[var(--text-secondary)] last:mb-0">{children}</blockquote>
  ),
  hr: () => <hr className="my-4 border-[var(--border-subtle)]" />,
};

// User turns read as a message TO the agent (right-aligned bubble, like any
// chat). Assistant turns read as the agent's own written answer on the
// page -- plain flowing text, the way Claude's own interface sets its
// replies, rather than a second row of chat bubbles.
export function AgentMessage({ message }: AgentMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="mb-6 flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-[var(--accent-dim)] px-4 py-3 text-[var(--text-primary)]">
          <p className="whitespace-pre-wrap break-words text-[15px] leading-7">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 text-[var(--text-primary)]">
      <ReactMarkdown components={MARKDOWN_COMPONENTS}>{message.content}</ReactMarkdown>

      {message.toolCalls && message.toolCalls.length > 0 && (
        <ToolTrace toolTrace={message.toolCalls} />
      )}

      {message.navigationOffers && message.navigationOffers.length > 0 && (
        <NavigationOffer navigationOffers={message.navigationOffers} />
      )}

      <ValidatorWarning status={message.validatorStatus} />
    </div>
  );
}

export default AgentMessage;
