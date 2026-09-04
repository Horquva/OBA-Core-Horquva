'use client';

import { usePathname } from 'next/navigation';

const routeMeta: Record<string, { label: string; badge?: string }> = {
  '/':                { label: 'Dashboard' },
  '/ownership':       { label: 'Ownership Intelligence' },
  '/risk':            { label: 'Risk Intelligence' },
  '/map':             { label: 'Dependency Map' },
  '/simulation':      { label: 'What-If Simulation' },
  '/recommendations': { label: 'Recommendations' },
};

export function Topbar() {
  const pathname = usePathname();
  const route = routeMeta[pathname] ?? { label: 'Dashboard' };

  return (
    <header
      style={{
        height: '60px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '28px',
        paddingRight: '24px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        position: 'relative',
        zIndex: 9,
      }}
    >
      {/* ── Left: page title + badge ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {route.label}
        </h1>

        {route.badge && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: 'var(--accent-dim)',
              color: 'var(--accent)',
              border: '1px solid var(--accent-border)',
            }}
          >
            {route.badge}
          </span>
        )}
      </div>

      {/* ── Right: controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Removed Notification button */}

        {/* Divider */}
        <div
          style={{
            width: '1px',
            height: '18px',
            backgroundColor: 'var(--border-subtle)',
            margin: '0 2px',
          }}
        />

        {/* Avatar */}
        <button
          type="button"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '7px',
            background: 'linear-gradient(135deg, #1e1e2d, #28283c)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-border)';
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15), 0 2px 6px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-default)';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            H
          </span>
        </button>
      </div>
    </header>
  );
}
