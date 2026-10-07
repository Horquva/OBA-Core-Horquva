'use client';

import * as React from 'react';
import type { EntityKind, EntityRef } from '@/types/view';
import { cn } from '@/lib/cn';

export interface EntityPickerProps {
  value?: EntityRef | null;
  onChange: (entity: EntityRef | null) => void;
  options?: EntityRef[];
  onSearch?: (query: string, kind?: EntityKind) => Promise<EntityRef[]> | EntityRef[];
  allowedKinds?: EntityKind[];
  placeholder?: string;
  disabled?: boolean;
  /** Visible label, tied to the input. Omit it when the screen labels the field itself (pass `id`). */
  label?: string;
  /** Input id, for a label the screen renders itself (`<label htmlFor={id}>`). */
  id?: string;
  className?: string;
}

export function EntityPicker({
  value,
  onChange,
  options: staticOptions = [],
  onSearch,
  allowedKinds,
  placeholder = 'Search entities...',
  disabled = false,
  label,
  id,
  className,
}: EntityPickerProps) {
  const [query, setQuery] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [results, setResults] = React.useState<EntityRef[]>(staticOptions);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  const [isLoading, setIsLoading] = React.useState(false);

  const listboxId = React.useId();
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;

    if (onSearch) {
      let active = true;
      setIsLoading(true);
      Promise.resolve(onSearch(query))
        .then((items) => {
          if (active) {
            const filtered = allowedKinds
              ? items.filter((item) => allowedKinds.includes(item.kind))
              : items;
            setResults(filtered);
            setActiveIndex(-1);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            setResults([]);
            setIsLoading(false);
          }
        });
      return () => {
        active = false;
      };
    } else {
      const q = query.toLowerCase().trim();
      let filtered = staticOptions.filter((item) => item.name.toLowerCase().includes(q));
      if (allowedKinds) {
        filtered = filtered.filter((item) => allowedKinds.includes(item.kind));
      }
      setResults(filtered);
      setActiveIndex(-1);
    }
  }, [query, isOpen, onSearch, staticOptions, allowedKinds]);

  const handleSelect = (entity: EntityRef) => {
    onChange(entity);
    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelect(results[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const getKindBadgeClass = (kind: EntityKind) => {
    switch (kind) {
      case 'person':
        return 'bg-amber/10 text-amber-ink';
      case 'automation':
        return 'bg-bronze/10 text-bronze-deep';
      case 'credential':
        return 'bg-st-fail/10 text-st-fail';
      case 'app':
      case 'model':
        return 'bg-st-pass/10 text-st-pass';
      case 'process':
        return 'bg-ink/10 text-ink';
      default:
        return 'bg-surface-sunken text-ink-2';
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full space-y-1.5', className)}>
      {label && <label htmlFor={inputId} className="block text-xs font-medium text-ink-2">{label}</label>}

      {value ? (
        <div className="flex h-10 items-center justify-between rounded-control border border-rule bg-surface px-3 py-1.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                getKindBadgeClass(value.kind)
              )}
            >
              {value.kind}
            </span>
            <span className="text-sm font-medium text-ink">{value.name}</span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            aria-label={`Remove ${value.name}`}
            className="rounded p-1 text-ink-3 hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            // Named by its <label> when there is one; otherwise generically.
            aria-label={label || id ? undefined : 'Entity'}
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-activedescendant={
              activeIndex >= 0 && results[activeIndex] ? `entity-opt-${results[activeIndex].id}` : undefined
            }
            value={query}
            disabled={disabled}
            placeholder={placeholder}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              'h-10 w-full rounded-control border border-rule bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3',
              'focus:border-ink-2 focus:outline-none focus:ring-1 focus:ring-amber',
              disabled && 'opacity-50 cursor-not-allowed bg-surface-sunken'
            )}
          />
          {isLoading && (
            <span className="absolute right-3 top-3 text-xs text-ink-3">Searching...</span>
          )}
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && !value && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label ?? 'Entities'}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-control border border-rule bg-surface p-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-ink-3">No matching entities found</li>
          ) : (
            results.map((entity, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <li
                  key={entity.id}
                  id={`entity-opt-${entity.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(entity)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-control px-3 py-2 text-sm transition-colors',
                    isSelected ? 'bg-surface-sunken text-ink' : 'text-ink-2 hover:bg-surface-sunken/60'
                  )}
                >
                  <span className="font-medium text-ink">{entity.name}</span>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      getKindBadgeClass(entity.kind)
                    )}
                  >
                    {entity.kind}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
