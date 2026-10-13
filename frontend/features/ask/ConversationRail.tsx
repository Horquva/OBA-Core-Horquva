'use client';

import * as React from 'react';
import { MoreHorizontal, PanelRightClose, Pencil, Search, SquarePen, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Conversation } from '@/types/view';

export interface ConversationRailProps {
  /** undefined = loading, null = failed to load. */
  conversations?: Conversation[] | null;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRetry: () => void;
  onCollapse: () => void;
  /** Phone layout: the rail is a drawer with a close button. */
  onClose?: () => void;
  className?: string;
}

const DAY_MS = 86_400_000;

/** Today / Yesterday / Previous 7 days / Older, by the viewer's local calendar. */
function groupByRecency(items: Conversation[]): Array<{ label: string; items: Conversation[] }> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const t0 = startOfToday.getTime();
  const groups: Record<string, Conversation[]> = { Today: [], Yesterday: [], 'Previous 7 days': [], Older: [] };
  for (const c of items) {
    const t = new Date(c.updatedAt).getTime();
    if (t >= t0) groups.Today.push(c);
    else if (t >= t0 - DAY_MS) groups.Yesterday.push(c);
    else if (t >= t0 - 7 * DAY_MS) groups['Previous 7 days'].push(c);
    else groups.Older.push(c);
  }
  return Object.entries(groups)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, items: list }));
}

function RowMenu({ onRename, onDelete, onClose }: { onRename: () => void; onDelete: () => void; onClose: () => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} role="menu" className="absolute right-1 top-9 z-20 w-36 rounded-control border border-rule bg-surface p-1 shadow-panel">
      <button role="menuitem" type="button" onClick={onRename} className="type-meta flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 text-ink hover:bg-surface-sunken">
        <Pencil className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" /> Rename
      </button>
      <button role="menuitem" type="button" onClick={onDelete} className="type-meta flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 text-st-fail hover:bg-surface-sunken">
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
      </button>
    </div>
  );
}

function ConversationRow({
  convo,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  convo: Conversation;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [mode, setMode] = React.useState<'idle' | 'menu' | 'rename' | 'confirm'>('idle');
  const [draft, setDraft] = React.useState(convo.title);
  const [busy, setBusy] = React.useState(false);

  const saveRename = async () => {
    const title = draft.trim();
    if (!title || title === convo.title) {
      setDraft(convo.title);
      setMode('idle');
      return;
    }
    setBusy(true);
    try {
      await onRename(title);
      setMode('idle');
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'rename') {
    return (
      <li className="px-1">
        <input
          autoFocus
          aria-label="Conversation title"
          value={draft}
          maxLength={80}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveRename();
            if (e.key === 'Escape') {
              setDraft(convo.title);
              setMode('idle');
            }
          }}
          onBlur={saveRename}
          className="type-meta w-full rounded-[8px] border border-ink-3 bg-surface px-2.5 py-1.5 text-ink focus:outline-none"
        />
      </li>
    );
  }

  if (mode === 'confirm') {
    return (
      <li className="mx-1 rounded-[8px] border border-rule bg-surface px-2.5 py-2">
        <p className="type-meta text-ink">Delete this chat?</p>
        <div className="mt-1.5 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onDelete();
              } finally {
                setBusy(false);
                setMode('idle');
              }
            }}
            className="type-meta cursor-pointer rounded-[7px] bg-st-fail px-2 py-0.5 font-medium text-paper disabled:opacity-60"
          >
            Delete
          </button>
          <button type="button" onClick={() => setMode('idle')} className="type-meta cursor-pointer rounded-[7px] px-2 py-0.5 text-ink-2 hover:bg-surface-sunken">
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="group/row relative">
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? 'page' : undefined}
        title={convo.title}
        className={cn(
          'type-meta block w-full cursor-pointer truncate rounded-[8px] py-1.5 pl-2.5 pr-8 text-left transition-colors',
          active ? 'bg-surface-sunken font-medium text-ink' : 'text-ink-2 hover:bg-surface-sunken/60 hover:text-ink',
        )}
      >
        {convo.title}
      </button>
      <button
        type="button"
        aria-label={`More options for ${convo.title}`}
        aria-haspopup="menu"
        aria-expanded={mode === 'menu'}
        onClick={() => setMode(mode === 'menu' ? 'idle' : 'menu')}
        className={cn(
          'absolute right-1 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[6px] text-ink-3 transition-opacity hover:bg-surface hover:text-ink',
          mode === 'menu' || active ? 'opacity-100' : 'opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100',
        )}
      >
        <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {mode === 'menu' && (
        <RowMenu
          onClose={() => setMode('idle')}
          onRename={() => {
            setDraft(convo.title);
            setMode('rename');
          }}
          onDelete={() => setMode('confirm')}
        />
      )}
    </li>
  );
}

export function ConversationRail({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onRetry,
  onCollapse,
  onClose,
  className,
}: ConversationRailProps) {
  const [filter, setFilter] = React.useState('');
  const visible = conversations?.filter((c) => c.title.toLowerCase().includes(filter.trim().toLowerCase())) ?? [];
  const groups = groupByRecency(visible);

  return (
    <aside aria-label="Chat history" className={cn('flex w-[264px] shrink-0 flex-col border-l border-rule bg-surface', className)}>
      <div className="flex items-center gap-1 px-3 pb-2 pt-3">
        <button
          type="button"
          onClick={onNew}
          className="type-meta inline-flex h-8 flex-1 cursor-pointer items-center gap-2 rounded-control px-2.5 font-medium text-ink transition-colors hover:bg-surface-sunken"
        >
          <SquarePen className="h-4 w-4 text-ink-2" aria-hidden="true" />
          New chat
        </button>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Close chat history" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-control text-ink-3 hover:bg-surface-sunken hover:text-ink">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={onCollapse} aria-label="Hide chat history" title="Hide chat history" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-control text-ink-3 hover:bg-surface-sunken hover:text-ink">
            <PanelRightClose className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="px-3 pb-2">
        <label className="relative block">
          <span className="sr-only">Search chats</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search chats"
            className="type-meta h-8 w-full rounded-control border border-rule bg-canvas/60 pl-8 pr-2.5 text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none"
          />
        </label>
      </div>

      <nav aria-label="Conversations" className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {conversations === undefined && (
          <div className="space-y-2 px-1 pt-2">
            {[70, 55, 80, 45].map((w) => (
              <span key={w} className="skeleton block h-6" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
        {conversations === null && (
          <p className="type-meta px-2 pt-3 text-ink-3">
            We couldn&apos;t load your chats.{' '}
            <button type="button" onClick={onRetry} className="cursor-pointer font-medium text-amber-ink hover:underline">
              Retry
            </button>
          </p>
        )}
        {conversations && conversations.length === 0 && <p className="type-meta px-2 pt-3 text-ink-3">Your chats will appear here.</p>}
        {conversations && conversations.length > 0 && visible.length === 0 && <p className="type-meta px-2 pt-3 text-ink-3">No chats match.</p>}

        {groups.map((g) => (
          <section key={g.label} className="mt-3 first:mt-1">
            <h2 className="px-2.5 pb-1 text-[11px] font-medium text-ink-3">{g.label}</h2>
            <ul className="space-y-px">
              {g.items.map((c) => (
                <ConversationRow
                  key={c.id}
                  convo={c}
                  active={c.id === activeId}
                  onSelect={() => onSelect(c.id)}
                  onRename={(title) => onRename(c.id, title)}
                  onDelete={() => onDelete(c.id)}
                />
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <p className="border-t border-rule px-4 py-3 text-[11px] leading-4 text-ink-3">
        Your chats are private to you. Answers come from OBA&apos;s records; people are never ranked.
      </p>
    </aside>
  );
}
