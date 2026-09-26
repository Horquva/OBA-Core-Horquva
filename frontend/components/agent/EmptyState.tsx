'use client';

import { useEffect, useState } from 'react';
import { useAgent } from './AgentProvider';
import { AGENT_FROM_ROUTE_KEY, getAgentSuggestions } from '@/lib/agentClient';

// Shown only until the live suggestions arrive, or if they can't be fetched.
// Deliberately names no one -- a name here would be a guess about whichever
// org is signed in.
const FALLBACK_PROMPTS = [
  "What's our biggest organizational risk right now?",
  'Who has critical work with no backup?',
  'Who owns the most critical workflows?',
  'Which department is most exposed?',
];

function readFromRoute(): string | null {
  try {
    return sessionStorage.getItem(AGENT_FROM_ROUTE_KEY);
  } catch {
    return null;
  }
}

export function EmptyState() {
  const { sendMessage } = useAgent();
  const [prompts, setPrompts] = useState<string[]>(FALLBACK_PROMPTS);
  const [pageLabel, setPageLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAgentSuggestions(readFromRoute())
      .then((data) => {
        if (cancelled || data.prompts.length === 0) return;
        setPrompts(data.prompts);
        setPageLabel(data.pageLabel);
      })
      .catch(() => {
        // Keep the fallback prompts.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          How can I help?
        </h2>
        <p className="mt-1.5 text-sm text-[var(--text-tertiary)]">
          {pageLabel
            ? `Suggestions based on ${pageLabel}, where you just were.`
            : 'Ask about risk, people, workflows, or run a what-if scenario.'}
        </p>
      </div>
      <div className="grid w-full max-w-[600px] grid-cols-1 gap-2.5 sm:grid-cols-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => sendMessage(prompt)}
            className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3.5 text-left text-sm text-[var(--text-primary)] transition hover:border-[var(--accent-border)] hover:bg-[var(--bg-hover)]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default EmptyState;
