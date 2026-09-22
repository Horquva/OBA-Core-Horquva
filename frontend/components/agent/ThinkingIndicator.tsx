'use client';

// Shown for the gap between sending a message and the first visible output --
// no tool has started yet and no tokens have streamed in, so without this the
// screen shows literally nothing after the user's message and the agent
// looks stalled. `.delay-75`/`.delay-150` are existing stagger utilities
// (globals.css), reused here rather than adding new ones.
export function ThinkingIndicator() {
  return (
    <div className="mb-8 flex items-center gap-1.5" aria-live="polite" aria-label="OBA Agent is thinking">
      <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-tertiary)]" />
      <span className="delay-150 h-2 w-2 animate-bounce rounded-full bg-[var(--text-tertiary)]" />
      <span className="delay-300 h-2 w-2 animate-bounce rounded-full bg-[var(--text-tertiary)]" />
    </div>
  );
}

export default ThinkingIndicator;
