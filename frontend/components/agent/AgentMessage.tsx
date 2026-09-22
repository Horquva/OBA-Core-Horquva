'use client';

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
    navigationOffer?: { slug: string; route: string; label: string; reason: string | null } | null;
  };
};

export function AgentMessage({ message }: AgentMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-[var(--accent-dim)] text-[var(--text-primary)]'
            : 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-6">
          {message.content}
        </p>

        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolTrace toolTrace={message.toolCalls} />
        )}

        {!isUser && message.navigationOffer && (
          <NavigationOffer navigationOffer={message.navigationOffer} />
        )}

        {!isUser && <ValidatorWarning status={message.validatorStatus} />}
      </div>
    </div>
  );
}

export default AgentMessage;
