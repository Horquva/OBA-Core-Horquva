'use client';

import { ArrowUp, Square } from 'lucide-react';
import { FormEvent, KeyboardEvent, useState } from 'react';
import { useAgent } from './AgentProvider';

export function AgentComposer() {
  const { state, sendMessage, abort } = useAgent();
  const [message, setMessage] = useState('');

  const isStreaming = state.isStreaming;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage || isStreaming) {
      return;
    }

    setMessage('');
    await sendMessage(trimmedMessage);
  }

  // Enter sends, Shift+Enter inserts a newline -- the standard chat
  // convention this textarea didn't follow before (Enter just added a
  // line break; Send was the only way to submit).
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 rounded-[28px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-2.5 pl-5 shadow-2xl transition-colors focus-within:border-[var(--accent-border)]"
    >
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          isStreaming
            ? 'OBA Agent is thinking...'
            : 'Ask about your organization...'
        }
        rows={1}
        disabled={isStreaming}
        className="max-h-[200px] min-h-[28px] flex-1 resize-none bg-transparent py-1 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />

      {isStreaming ? (
        <button
          type="button"
          onClick={abort}
          aria-label="Stop generating"
          title="Stop generating"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)]"
        >
          <Square size={13} fill="currentColor" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!message.trim()}
          aria-label="Send message"
          title="Send message"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowUp size={17} />
        </button>
      )}
    </form>
  );
}

export default AgentComposer;
