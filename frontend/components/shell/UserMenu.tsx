'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session';
import { useThemePreference, ThemePreference } from '@/lib/theme';
import type { Role } from '@/types/view';

export interface UserMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  compact?: boolean;
}

export function UserMenu({ compact = false, className, ...props }: UserMenuProps) {
  const { session, isDevSession, setDevRole } = useSession();
  const [themePref, setThemePref] = useThemePreference();
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const name = session?.name || 'Guest User';
  const monogram = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = () => {
    window.location.href = '/sign-in';
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)} {...props}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={`User settings for ${name}`}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-control p-2 text-left transition-colors cursor-pointer hover:bg-surface-sunken',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber',
          compact && 'justify-center p-1.5'
        )}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber/15 text-xs font-semibold text-amber-ink"
          aria-hidden="true"
        >
          {monogram}
        </span>

        {!compact && (
          <div className="flex-1 truncate">
            <p className="truncate text-xs font-semibold text-ink leading-tight">{name}</p>
            <p className="truncate text-[11px] text-ink-3 leading-tight capitalize">
              {session?.role || 'viewer'}
            </p>
          </div>
        )}

        {!compact && (
          <span className="text-ink-3 text-xs" aria-hidden="true">
            {isOpen ? '▲' : '▼'}
          </span>
        )}
      </button>

      {/* Flyout Menu */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="User preferences and theme"
          className="absolute bottom-full left-0 mb-2 w-64 rounded-card border border-rule bg-surface p-3 shadow-xl z-50 space-y-3 font-sans"
        >
          <div className="border-b border-rule pb-2">
            <p className="text-xs font-semibold text-ink">{name}</p>
            <p className="text-[11px] text-ink-3">{session?.email || 'user@company.com'}</p>
          </div>

          {/* Theme Switcher */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-ink-3 uppercase tracking-wider">
              Theme
            </span>
            <div className="grid grid-cols-3 gap-1 rounded-control bg-surface-sunken p-1 border border-rule">
              {(['light', 'dark', 'system'] as ThemePreference[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setThemePref(mode)}
                  className={cn(
                    'rounded-control py-1 text-center text-xs font-medium capitalize transition-colors',
                    themePref === mode
                      ? 'bg-surface text-ink shadow-xs border border-rule'
                      : 'text-ink-3 hover:text-ink'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Dev Role Switcher */}
          {isDevSession && (
            <div className="space-y-1.5 border-t border-rule pt-2">
              <span className="text-[11px] font-medium text-amber-ink uppercase tracking-wider">
                Dev Role Emulation
              </span>
              <div className="grid grid-cols-3 gap-1">
                {(['admin', 'viewer', 'reviewer'] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setDevRole(r)}
                    className={cn(
                      'rounded border py-0.5 text-center text-[10px] font-mono capitalize transition-colors',
                      session?.role === r
                        ? 'border-amber bg-amber/15 font-semibold text-amber-ink'
                        : 'border-rule text-ink-3 hover:border-ink-2'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sign Out */}
          <div className="border-t border-rule pt-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center justify-between rounded-control px-2 py-1.5 text-xs text-st-fail hover:bg-surface-sunken transition-colors cursor-pointer"
            >
              <span>Sign out</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
