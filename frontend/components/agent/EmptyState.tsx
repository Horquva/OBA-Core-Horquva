'use client';

import { useAgent } from './AgentProvider';

const SUGGESTED_PROMPTS = [
  "What's our biggest organizational risk right now?",
  "What happens if Sarah leaves?",
  "Show me where this is in the app.",
];

export function EmptyState() {
  const { sendMessage } = useAgent();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-[var(--text-tertiary)]">
        Ask about risk, people, workflows, or run a what-if scenario.
      </p>
      <div className="flex flex-col gap-2 w-full max-w-sm">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => sendMessage(prompt)}
            className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default EmptyState;