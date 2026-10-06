'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, ariaLabel = 'Navigation tabs', className }: TabsProps) {
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    const enabledIndices = tabs
      .map((t, idx) => (t.disabled ? -1 : idx))
      .filter((idx) => idx !== -1);
    const currentPos = enabledIndices.indexOf(currentIndex);

    let nextIndex = -1;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = enabledIndices[(currentPos + 1) % enabledIndices.length];
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = enabledIndices[(currentPos - 1 + enabledIndices.length) % enabledIndices.length];
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = enabledIndices[0];
        break;
      case 'End':
        e.preventDefault();
        nextIndex = enabledIndices[enabledIndices.length - 1];
        break;
    }

    if (nextIndex !== -1 && tabRefs.current[nextIndex]) {
      tabRefs.current[nextIndex]?.focus();
      onChange(tabs[nextIndex].id);
    }
  };

  return (
    <div className={cn('w-full border-b border-rule', className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex items-center gap-6 -mb-[1px] overflow-x-auto scrollbar-none"
      >
        {tabs.map((tab, idx) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-controls={`tabpanel-${tab.id}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={cn(
                'group inline-flex items-center gap-2 py-3 border-b-2 text-sm transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber',
                isActive
                  ? 'border-amber font-semibold text-ink'
                  : 'border-transparent text-ink-3 hover:text-ink font-normal',
                tab.disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
              )}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-xs font-mono tabular-nums leading-none',
                    isActive
                      ? 'bg-amber/15 text-amber-ink'
                      : 'bg-surface-sunken text-ink-3 group-hover:text-ink'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  activeTab: string;
}

export function TabPanel({ id, activeTab, children, className, ...props }: TabPanelProps) {
  const isActive = id === activeTab;
  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={cn('pt-4 focus-visible:outline-none', className)}
      {...props}
    >
      {children}
    </div>
  );
}
