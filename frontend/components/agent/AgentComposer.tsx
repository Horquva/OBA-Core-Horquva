'use client';

import { FormEvent, useState } from 'react';
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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-2"
    >
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={
          isStreaming
            ? 'OBA Agent is thinking...'
            : 'Ask something about your organization...'
        }
        rows={2}
        disabled={isStreaming}
        className="min-h-[44px] w-full resize-none bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />

      <div className="flex justify-end">
        {isStreaming ? (
          <button
            type="button"
            onClick={abort}
            className="rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)]"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!message.trim()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        )}
      </div>
    </form>
  );
}

export default AgentComposer;