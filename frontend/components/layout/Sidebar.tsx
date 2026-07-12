'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  GitFork,
  Zap,
  ListChecks,
  ShieldAlert,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard',          href: '/',                icon: LayoutDashboard },
  { name: 'Ownership',          href: '/ownership',       icon: Users },
  { name: 'Risk Intelligence',  href: '/risk',            icon: ShieldAlert },
  { name: 'Dependency Map',     href: '/map',             icon: GitFork },
  { name: 'What-If Simulation', href: '/simulation',      icon: Zap },
  { name: 'Recommendations',    href: '/recommendations', icon: ListChecks },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: '260px',
        flexShrink: 0,
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        /* lifted panel effect */
        boxShadow: '4px 0 24px rgba(0,0,0,0.45)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* ── Wordmark ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '28px 22px 24px', // More space
          borderBottom: '1px solid var(--border-subtle)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', // Subtle shadow separating it from buttons
          flexShrink: 0,
          gap: '12px',
          position: 'relative',
          zIndex: 20, // Ensure shadow drops over the nav section
        }}
      >
        {/* Logo mark */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, filter: 'drop-shadow(0 0 8px rgba(129, 140, 248, 0.4))' }}>
          <svg width="34" height="34" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Outer Hexagon */}
            <path d="M18 2L31.856 10V26L18 34L4.144 26V10L18 2Z" fill="url(#hex-grad)" stroke="url(#hex-stroke)" strokeWidth="1.5" strokeLinejoin="round"/>
            
            {/* Inner H Network */}
            <path d="M13 13V23" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M23 13V23" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 18H23" stroke="url(#line-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            
            {/* Nodes */}
            <circle cx="13" cy="13" r="2" fill="white"/>
            <circle cx="23" cy="23" r="2" fill="white"/>
            <circle cx="13" cy="23" r="1.5" fill="#818cf8"/>
            <circle cx="23" cy="13" r="1.5" fill="#818cf8"/>
            <circle cx="18" cy="18" r="2" fill="#c084fc"/>

            <defs>
              <linearGradient id="hex-grad" x1="18" y1="2" x2="18" y2="34" gradientUnits="userSpaceOnUse">
                <stop stopColor="#818cf8" stopOpacity="0.25"/>
                <stop offset="1" stopColor="#4f46e5" stopOpacity="0.0"/>
              </linearGradient>
              <linearGradient id="hex-stroke" x1="4" y1="2" x2="32" y2="34" gradientUnits="userSpaceOnUse">
                <stop stopColor="#818cf8"/>
                <stop offset="1" stopColor="#c084fc" stopOpacity="0.3"/>
              </linearGradient>
              <linearGradient id="line-grad" x1="13" y1="18" x2="23" y2="18" gradientUnits="userSpaceOnUse">
                <stop stopColor="white"/>
                <stop offset="1" stopColor="#c084fc"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div>
          <p
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 500,
              fontFamily: '"Outfit", var(--font-sans), sans-serif',
              color: 'var(--text-primary)',
              letterSpacing: '0.12em',
              lineHeight: 1,
            }}
          >
            HORQUVA
          </p>
          <p
            style={{
              margin: '8px 0 0',
              paddingBottom: '4px',
              fontSize: '9.5px',
              fontWeight: 500,
              color: '#55566e',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              lineHeight: 1,
              borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
              boxShadow: '0 2px 4px -2px rgba(99, 102, 241, 0.2)',
              display: 'inline-block',
            }}
          >
            OBA Platform
          </p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: '24px 16px', overflowY: 'auto' }}>
        <p
          style={{
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            padding: '0 10px 8px',
            margin: 0,
            opacity: 0.6,
          }}
        >
          Intelligence
        </p>

        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isActive ? '#1e1e38' : 'rgba(255,255,255,0.01)',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                borderLeft: 'none',
                boxShadow: isActive
                  ? '0 2px 8px rgba(30,30,56,0.6), inset 0 1px 0 rgba(255,255,255,0.06)'
                  : '0 1px 3px rgba(0,0,0,0.2)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.backgroundColor = 'var(--bg-hover)';
                  el.style.color = 'var(--text-primary)';
                  el.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.backgroundColor = 'rgba(255,255,255,0.01)';
                  el.style.color = 'var(--text-secondary)';
                  el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
                }
              }}
            >
              <item.icon
                size={18}
                style={{
                  color: isActive ? '#ffffff' : 'var(--text-tertiary)',
                  flexShrink: 0,
                }}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div
        style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #1c1c28, #252535)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}
          >
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              SC
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: '12.5px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Sunrise Care
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>
              Demo Workspace
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
