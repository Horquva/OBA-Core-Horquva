'use client';

import * as React from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  /** An answer is streaming: the send button becomes Stop. */
  isStreaming?: boolean;
  /** 'hero' on the empty state (taller), 'docked' under a thread. */
  variant?: 'hero' | 'docked';
  autoFocus?: boolean;
  placeholder?: string;
}

const MAX_HEIGHT = 220;

/** Auto-growing message box. Enter sends, Shift+Enter adds a line. */
export const Composer = React.forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  { value, onChange, onSubmit, onStop, isStreaming = false, variant = 'docked', autoFocus, placeholder = 'Ask about owners, backups, departures…' },
  forwardedRef,
) {
  const innerRef = React.useRef<HTMLTextAreaElement>(null);
  React.useImperativeHandle(forwardedRef, () => innerRef.current as HTMLTextAreaElement);

  // Grow with the text up to MAX_HEIGHT, then scroll inside.
  React.useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  React.useEffect(() => {
    if (autoFocus) innerRef.current?.focus();
  }, [autoFocus]);

  const canSend = value.trim().length > 0 && !isStreaming;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSubmit();
      }}
      className={cn(
        'group/composer relative w-full rounded-[20px] border border-rule bg-surface shadow-panel',
      )}
    >
      <label htmlFor="ask-composer" className="sr-only">
        Ask OBA a question
      </label>
      <textarea
        id="ask-composer"
        ref={innerRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Enter sends; Shift+Enter is a new line; never send mid-IME composition.
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (canSend) onSubmit();
          }
        }}
        placeholder={placeholder}
        className={cn(
          'block w-full resize-none bg-transparent px-5 text-[15px] leading-6 text-ink placeholder:text-ink-3 outline-none focus:outline-none focus-visible:outline-none',
          variant === 'hero' ? 'min-h-[88px] pb-14 pt-4' : 'min-h-[52px] pb-12 pt-3.5',
        )}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-3 pb-2.5">
        <span className="pl-2 text-[11px] text-ink-3 opacity-0 transition-opacity group-focus-within/composer:opacity-100">
          <kbd className="font-sans">Enter</kbd> to send · <kbd className="font-sans">Shift</kbd> + <kbd className="font-sans">Enter</kbd> for a new line
        </span>
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop answering"
            className="pointer-events-auto inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-ink text-surface transition-opacity hover:opacity-85"
          >
            <Square className="h-3 w-3 fill-current" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            className="pointer-events-auto inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-amber text-on-amber transition-[background-color,opacity] hover:bg-amber-hover disabled:cursor-default disabled:bg-surface-sunken disabled:text-ink-3"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  );
});
