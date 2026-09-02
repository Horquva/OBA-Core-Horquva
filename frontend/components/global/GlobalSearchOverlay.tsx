'use client';

/**
 * EXECUTIVE COMMAND PALETTE
 *
 * One text box over the whole workspace. It resolves three things at once:
 *   • pages      — every route in the sidebar (and the ones it omits)
 *   • sections   — named blocks inside a page, e.g. "Blast Radius Simulator"
 *   • modules    — M01–M55, mapped to the surface that renders each one
 *   • entities   — live people / agents / workflows / tools from the API
 *
 * Picking a result navigates to the route AND scrolls to the exact block,
 * flashing it so the executive can see where they landed. Everything is role
 * filtered with the same gating the sidebar uses, so a result is never offered
 * for a page the current role cannot open.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search,
  X,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  LayoutDashboard,
  Layers,
  Boxes,
  Users,
  Bot,
  Wrench,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import { useGlobalPanels } from './GlobalPanelsContext';
import { useAuth } from '@/lib/AuthContext';
import { useSearchIndex, SearchEntry } from '@/lib/search';
import {
  CommandTarget,
  STATIC_TARGETS,
  searchTargets,
  defaultSuggestions,
} from '@/lib/commandIndex';
import { requestFocus } from '@/lib/focusTarget';

const ENTITY_PAGE: Record<SearchEntry['type'], string> = {
  Agent: '/ai-tools',
  Workflow: '/workflows',
  Person: '/ownership',
  Tool: '/ai-tools',
};

/** The block on each entity's home page that actually lists it. */
const ENTITY_SECTION: Record<SearchEntry['type'], string | undefined> = {
  Agent: 'Agent Summary Directory',
  Workflow: 'Workflow Step Chains',
  Person: 'Detailed Owner Registries',
  Tool: 'High Risk Tools',
};

function entityToTarget(e: SearchEntry): CommandTarget {
  return {
    id: e.id,
    label: e.title,
    kind: 'entity',
    page: e.type === 'Agent' ? '/' : ENTITY_PAGE[e.type],
    match: e.type === 'Agent' ? ENTITY_SECTION.Agent : ENTITY_SECTION[e.type],
    parent: e.type,
    keywords: [e.type, e.category],
    hint: e.category,
  };
}

const GROUP_ORDER = ['Pages', 'Sections', 'Modules', 'Organization'] as const;

function groupOf(t: CommandTarget) {
  if (t.kind === 'page') return 'Pages';
  if (t.kind === 'section') return 'Sections';
  if (t.kind === 'module') return 'Modules';
  return 'Organization';
}

function iconFor(t: CommandTarget) {
  if (t.kind === 'page') return LayoutDashboard;
  if (t.kind === 'section') return Layers;
  if (t.kind === 'module') return Boxes;
  if (t.parent === 'Person') return Users;
  if (t.parent === 'Workflow') return WorkflowIcon;
  if (t.parent === 'Tool') return Wrench;
  return Bot;
}

export default function GlobalSearchOverlay() {
  const { isSearchOpen, toggleSearch, closeAllPanels } = useGlobalPanels();
  const { user } = useAuth();
  const { index } = useSearchIndex();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const role = (user?.role || 'employee').toLowerCase();

  const pool = useMemo(
    () => [...STATIC_TARGETS, ...index.map(entityToTarget)],
    [index],
  );

  const results = useMemo(() => {
    if (!query.trim()) return defaultSuggestions(role);
    return searchTargets(pool, query, role, 24);
  }, [query, pool, role]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, CommandTarget[]>();
    results.forEach((t) => {
      const g = groupOf(t);
      if (!buckets.has(g)) buckets.set(g, []);
      buckets.get(g)!.push(t);
    });
    return GROUP_ORDER.filter((g) => buckets.has(g)).map((g) => [g, buckets.get(g)!] as const);
  }, [results]);

  /** Results in render order, so ↑/↓ move the way the eye does. */
  const flat = useMemo(() => grouped.flatMap(([, items]) => items), [grouped]);

  useEffect(() => {
    Promise.resolve().then(() => setCursor(0));
  }, [query, isSearchOpen]);

  const go = useCallback(
    (target: CommandTarget) => {
      closeAllPanels();
      setQuery('');

      const href = target.match
        ? `${target.page}?focus=${encodeURIComponent(target.match)}`
        : target.page;

      if (target.page === pathname) {
        // Same route — nothing to mount, just move.
        window.history.replaceState(null, '', href);
        requestFocus(target.match);
      } else {
        router.push(href);
        // The focus engine retries until the destination's data has landed.
        requestFocus(target.match);
      }
    },
    [closeAllPanels, pathname, router],
  );

  // ── Ctrl/Cmd+K anywhere ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSearch]);

  // ── Keep the highlighted row in view ──
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor, results]);

  if (!isSearchOpen) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (flat.length ? (c + 1) % flat.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (flat.length ? (c - 1 + flat.length) % flat.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = flat[cursor];
      if (target) go(target);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeAllPanels();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 sm:pt-24">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeAllPanels}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative z-50 w-full max-w-2xl overflow-hidden rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
        }}
      >
        {/* ── Input ── */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <Search size={18} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask for a module, a page, a person — e.g. “blast radius”, “M46”, “who owns Payments”"
            className="flex-1 bg-transparent text-base"
            style={{
              color: 'var(--text-primary)',
              outline: 'none',
              border: 'none',
              boxShadow: 'none',
              padding: '4px 0',
            }}
          />
          <button
            onClick={closeAllPanels}
            aria-label="Close"
            className="rounded-lg p-1.5"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Results ── */}
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {!query.trim() && (
            <p
              className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Jump to
            </p>
          )}

          {flat.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Nothing matches “{query}”.
              </p>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Try a module code (M09), a block name (Knowledge Concentration Gauge),
                or a person, agent, workflow or tool.
              </p>
            </div>
          )}

          {grouped.map(([group, items]) => (
            <div key={group} className="mb-1">
              {query.trim() && (
                <p
                  className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {group}
                </p>
              )}

              {items.map((t) => {
                const i = flat.indexOf(t);
                const active = i === cursor;
                const Icon = iconFor(t);
                return (
                  <button
                    key={t.id}
                    data-active={active}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(t)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                    style={{
                      backgroundColor: active ? 'var(--accent-dim)' : 'transparent',
                      border: `1px solid ${active ? 'var(--accent-border)' : 'transparent'}`,
                    }}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <Icon
                        size={16}
                        style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}
                      />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-sm font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {t.label}
                      </span>
                      <span
                        className="block truncate text-xs"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {t.kind === 'page'
                          ? t.hint
                          : [t.parent, t.hint].filter(Boolean).join(' · ')}
                      </span>
                    </span>

                    {active && (
                      <CornerDownLeft
                        size={14}
                        style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Footer hints ── */}
        <div
          className="flex items-center gap-4 px-4 py-2.5 text-[11px]"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            color: 'var(--text-tertiary)',
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          <span className="flex items-center gap-1">
            <ArrowUp size={11} />
            <ArrowDown size={11} /> navigate
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft size={11} /> open
          </span>
          <span>esc close</span>
          <span className="ml-auto">{flat.length} result{flat.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
}
