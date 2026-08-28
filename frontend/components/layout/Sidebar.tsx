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
  Bot,
  Brain,
  Archive,
  Scale,
  Workflow,
  TrendingUp,
  FlaskConical,
  Settings,
  Sun,
  Moon,
  Activity,
  Bell,
  Search,
  LogOut,
  KeyRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { useGlobalPanels } from '@/components/global/GlobalPanelsContext';
import { useAuth } from '@/lib/AuthContext';

type NavItem = { name: string; href: string; icon: LucideIcon; roles?: string[] };

// Role gating for the Role-Based Executive Experience. Presentation only —
// D-05 deleted requireRole() server-side, so every authenticated user can
// still reach any endpoint directly; this only decides which nav items
// render for a given role, not what that role is allowed to do.
const EXEC = ['admin', 'ceo', 'cto', 'coo'];
const MANAGER_UP = [...EXEC, 'manager'];

const navigation: NavItem[] = [
  { name: 'Dashboard',              href: '/',                icon: LayoutDashboard },
  { name: 'Ownership',              href: '/ownership',       icon: Users },
  { name: 'Risk Intelligence',      href: '/risk',            icon: ShieldAlert, roles: MANAGER_UP },
  { name: 'Dependency Map',         href: '/map',             icon: GitFork },
  { name: 'What-If Simulation',     href: '/simulation',      icon: Zap, roles: EXEC },
  { name: 'Recommendations',        href: '/recommendations', icon: ListChecks, roles: MANAGER_UP },
  { name: 'AI Tool Intelligence',   href: '/ai-tools',        icon: Bot },
  { name: 'Knowledge Risk',         href: '/knowledge',       icon: Brain },
  { name: 'Org Memory',             href: '/memory',          icon: Archive, roles: MANAGER_UP },
  { name: 'Decision Intelligence',  href: '/decision',        icon: Scale, roles: EXEC },
  { name: 'Continuity & Gov',       href: '/continuity',      icon: Activity, roles: MANAGER_UP },
  { name: 'Workflows',              href: '/workflows',       icon: Workflow },
  { name: 'Forecast',               href: '/forecast',        icon: TrendingUp, roles: MANAGER_UP },
  { name: 'Org Science',            href: '/org-science',     icon: FlaskConical, roles: EXEC },
  { name: 'Admin',                  href: '/admin',           icon: Settings, roles: ['admin', 'ceo', 'cto'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { toggleNotificationPanel, toggleSearch } = useGlobalPanels();
  const { user, logout } = useAuth();

  const role = (user?.role || 'employee').toLowerCase();
  const visibleNav = navigation.filter((item) => !item.roles || item.roles.includes(role));
  const displayName = user?.name || user?.email || 'Executive';
  const displayOrg = user?.org ? String(user.org) : 'Workspace';
  const initials =
    displayName
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'EX';

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
        boxShadow: theme === 'light' ? '4px 0 24px rgba(0,0,0,0.02)' : '4px 0 24px rgba(0,0,0,0.45)',
        position: 'relative',
        zIndex: 10,
        transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* ── Wordmark ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '28px 22px 24px', // More space
          borderBottom: '1px solid var(--border-subtle)',
          boxShadow: theme === 'light' ? '0 4px 16px rgba(0,0,0,0.02)' : '0 4px 16px rgba(0,0,0,0.1)', // Subtle shadow separating it from buttons
          flexShrink: 0,
          gap: '12px',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        {/* Logo mark */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, filter: theme === 'light' ? 'drop-shadow(0 0 6px rgba(37, 99, 235, 0.2))' : 'drop-shadow(0 0 8px rgba(129, 140, 248, 0.4))', transition: 'filter 0.3s ease' }}>
          <svg width="34" height="34" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Outer Hexagon */}
            <path d="M18 2L31.856 10V26L18 34L4.144 26V10L18 2Z" fill={theme === 'light' ? 'url(#hex-grad-light)' : 'url(#hex-grad)'} stroke={theme === 'light' ? 'url(#hex-stroke-light)' : 'url(#hex-stroke)'} strokeWidth="1.5" strokeLinejoin="round"/>
            
            {/* Inner H Network */}
            <path d="M13 13V23" stroke={theme === 'light' ? 'var(--accent)' : 'white'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M23 13V23" stroke={theme === 'light' ? 'var(--accent)' : 'white'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 18H23" stroke={theme === 'light' ? 'var(--accent)' : 'url(#line-grad)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            
            {/* Nodes */}
            <circle cx="13" cy="13" r="2" fill={theme === 'light' ? '#2563EB' : 'white'}/>
            <circle cx="23" cy="23" r="2" fill={theme === 'light' ? '#2563EB' : 'white'}/>
            <circle cx="13" cy="23" r="1.5" fill={theme === 'light' ? '#3B82F6' : '#818cf8'}/>
            <circle cx="23" cy="13" r="1.5" fill={theme === 'light' ? '#3B82F6' : '#818cf8'}/>
            <circle cx="18" cy="18" r="2" fill={theme === 'light' ? '#1D4ED8' : '#c084fc'}/>

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
              {/* Light Theme Gradients */}
              <linearGradient id="hex-grad-light" x1="18" y1="2" x2="18" y2="34" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2563EB" stopOpacity="0.1"/>
                <stop offset="1" stopColor="#3B82F6" stopOpacity="0.0"/>
              </linearGradient>
              <linearGradient id="hex-stroke-light" x1="4" y1="2" x2="32" y2="34" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2563EB" stopOpacity="0.4"/>
                <stop offset="1" stopColor="#60A5FA" stopOpacity="0.1"/>
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
              transition: 'color 0.3s ease',
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
              color: 'var(--text-tertiary)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              lineHeight: 1,
              borderBottom: theme === 'light' ? '1px solid rgba(37, 99, 235, 0.2)' : '1px solid rgba(99, 102, 241, 0.15)',
              boxShadow: theme === 'light' ? '0 2px 4px -2px rgba(37, 99, 235, 0.1)' : '0 2px 4px -2px rgba(99, 102, 241, 0.2)',
              display: 'inline-block',
              transition: 'color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
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
            transition: 'color 0.3s ease',
          }}
        >
          Intelligence
        </p>

        {visibleNav.map((item) => {
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
                backgroundColor: isActive ? (theme === 'light' ? 'var(--accent)' : '#1e1e38') : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                borderLeft: 'none',
                boxShadow: isActive
                  ? (theme === 'light' ? '0 4px 12px rgba(37,99,235,0.25)' : '0 2px 8px rgba(30,30,56,0.6), inset 0 1px 0 rgba(255,255,255,0.06)')
                  : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.backgroundColor = 'var(--bg-hover)';
                  el.style.color = 'var(--text-primary)';
                  el.style.boxShadow = theme === 'light' ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.backgroundColor = 'transparent';
                  el.style.color = 'var(--text-secondary)';
                  el.style.boxShadow = 'none';
                }
              }}
            >
              <item.icon
                size={18}
                style={{
                  color: isActive ? '#ffffff' : 'var(--text-tertiary)',
                  flexShrink: 0,
                  transition: 'color 0.2s ease',
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'border-color 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '7px',
              background: theme === 'light' ? 'var(--bg-elevated)' : 'linear-gradient(135deg, #1c1c28, #252535)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.05)' : '0 2px 6px rgba(0,0,0,0.3)',
              transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
            }}
          >
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {initials}
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
                transition: 'color 0.3s ease',
              }}
            >
              {displayName}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0, transition: 'color 0.3s ease' }}>
              {displayOrg}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {/* Search Button */}
          <button
            onClick={toggleSearch}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: '1px solid transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            aria-label="Global Search (Ctrl+K)"
          >
            <Search size={16} />
          </button>

          {/* Notification Button */}
          <button
            onClick={toggleNotificationPanel}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: '1px solid transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            aria-label="Notification Center"
          >
            <Bell size={16} />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: '1px solid transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Account — change your own password. Ungated: every signed-in user
              has one, whatever their role. */}
          <Link
            href="/account"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: pathname === '/account' ? 'var(--bg-hover)' : 'transparent',
              border: '1px solid transparent',
              color: pathname === '/account' ? 'var(--accent)' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
            aria-label="Account settings"
          >
            <KeyRound size={16} />
          </Link>

          {/* Logout Button */}
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: '1px solid transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            aria-label="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
