'use client';

/**
 * The always-visible command bar that sits above every page. It is deliberately
 * not a second search implementation — clicking or typing hands straight over to
 * the command palette, so there is exactly one ranking and one navigation path.
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Command } from 'lucide-react';
import { useGlobalPanels } from './GlobalPanelsContext';
import { PAGES } from '@/lib/commandIndex';

const PLACEHOLDERS = [
  'Ask for anything — “blast radius”, “M46”, “who owns what”…',
  'Try “knowledge concentration” to jump straight to the gauge',
  'Type a module code — M09, M23, M55 — to open its surface',
  'Search a person, agent, workflow or tool by name',
];

export default function CommandBar() {
  const { openSearch } = useGlobalPanels();
  const pathname = usePathname();
  const [slot, setSlot] = useState(0);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
    });
    const id = setInterval(() => setSlot((s) => (s + 1) % PLACEHOLDERS.length), 6000);
    return () => clearInterval(id);
  }, []);

  const page = PAGES.find((p) => p.page === pathname);

  return (
    <header
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 24px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'relative',
        zIndex: 9,
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {page?.label ?? 'Workspace'}
      </h1>

      <button
        type="button"
        onClick={openSearch}
        aria-label="Open command bar"
        style={{
          flex: 1,
          maxWidth: '680px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '9px 14px',
          borderRadius: '9999px',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-tertiary)',
          cursor: 'text',
          textAlign: 'left',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-border)';
          e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-default)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <Search size={15} style={{ flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            fontSize: '13px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {PLACEHOLDERS[slot]}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            flexShrink: 0,
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: '6px',
            border: '1px solid var(--border-default)',
            color: 'var(--text-tertiary)',
          }}
        >
          {isMac ? <Command size={10} /> : 'Ctrl'}
          <span>K</span>
        </span>
      </button>
    </header>
  );
}
