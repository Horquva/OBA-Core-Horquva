'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';

export interface AskFieldProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  placeholder?: string;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function AskField({
  placeholder = 'Ask OBA anything about your assets...',
  className,
  onSubmit,
  ...props
}: AskFieldProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Global keyboard shortcut '/' or 'Cmd+K' to focus
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') ||
        ((e.metaKey || e.ctrlKey) && e.key === 'k')
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
      return;
    }
    if (!query.trim()) return;
    router.push(`/?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cn('relative w-full max-w-md', className)}
      {...props}
    >
      <div className="relative flex items-center">
        <span className="absolute left-3 text-ink-3 pointer-events-none" aria-hidden="true">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Ask OBA question input"
          className={cn(
            'h-9 w-full rounded-control border border-rule bg-surface-sunken/60 pl-9 pr-14 text-xs text-ink placeholder:text-ink-3 transition-colors',
            'focus:bg-surface focus:border-ink-2 focus:outline-none focus:ring-1 focus:ring-amber'
          )}
        />

        <kbd className="absolute right-2.5 hidden sm:inline-block rounded border border-rule bg-surface px-1.5 py-0.5 text-[10px] font-mono text-ink-3 pointer-events-none">
          ⌘K
        </kbd>
      </div>
    </form>
  );
}
