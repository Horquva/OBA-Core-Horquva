'use client';

import * as React from 'react';
import type { EntityRef } from '@/types/view';
import { cn } from '@/lib/cn';

export interface PersonItem extends EntityRef {
  email?: string;
  title?: string;
}

export interface PersonPickerProps {
  value?: EntityRef | null;
  onChange: (person: EntityRef | null) => void;
  options?: PersonItem[];
  onSearch?: (query: string) => Promise<PersonItem[]> | PersonItem[];
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function PersonPicker({
  value,
  onChange,
  options: staticOptions = [],
  onSearch,
  placeholder = 'Search people by name or email...',
  disabled = false,
  label = 'Person',
  className,
}: PersonPickerProps) {
  const [query, setQuery] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [results, setResults] = React.useState<PersonItem[]>(staticOptions);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  const [isLoading, setIsLoading] = React.useState(false);

  const listboxId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);
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

  // Filter or search effect
  React.useEffect(() => {
    if (!isOpen) return;

    if (onSearch) {
      let active = true;
      setIsLoading(true);
      Promise.resolve(onSearch(query))
        .then((items) => {
          if (active) {
            setResults(items);
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
      const filtered = staticOptions.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.email && p.email.toLowerCase().includes(q)) ||
          (p.title && p.title.toLowerCase().includes(q))
      );
      setResults(filtered);
      setActiveIndex(-1);
    }
  }, [query, isOpen, onSearch, staticOptions]);

  const handleSelect = (person: PersonItem) => {
    onChange(person);
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

  const getMonogram = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div ref={containerRef} className={cn('relative w-full space-y-1.5', className)}>
      {label && <label className="block text-xs font-medium text-ink-2">{label}</label>}

      {value ? (
        <div className="flex h-10 items-center justify-between rounded-control border border-rule bg-surface px-3 py-1.5">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber/15 text-[11px] font-semibold text-amber-ink"
              aria-hidden="true"
            >
              {getMonogram(value.name)}
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
            type="text"
            role="combobox"
            aria-label={label}
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-activedescendant={
              activeIndex >= 0 && results[activeIndex] ? `person-opt-${results[activeIndex].id}` : undefined
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
              'h-11 sm:h-10 w-full rounded-control border border-rule bg-surface px-3 py-2 text-base sm:text-sm text-ink placeholder:text-ink-3',
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
          aria-label={label}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-control border border-rule bg-surface p-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-ink-3">No matching people found</li>
          ) : (
            results.map((person, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <li
                  key={person.id}
                  id={`person-opt-${person.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(person)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-control px-3 py-2 text-sm transition-colors',
                    isSelected ? 'bg-surface-sunken text-ink' : 'text-ink-2 hover:bg-surface-sunken/60'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-[10px] font-semibold text-ink-2 border border-rule"
                      aria-hidden="true"
                    >
                      {getMonogram(person.name)}
                    </span>
                    <div>
                      <p className="font-medium text-ink leading-tight">{person.name}</p>
                      {person.title && <p className="text-[11px] text-ink-3 leading-tight">{person.title}</p>}
                    </div>
                  </div>
                  {person.email && <span className="text-xs text-ink-3">{person.email}</span>}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
