'use client';

import React from 'react';

export const authInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid var(--border-default)',
  backgroundColor: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  outline: 'none',
  marginTop: '6px',
};

export const authLabelStyle: React.CSSProperties = {
  fontSize: '12.5px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  letterSpacing: '0.02em',
};

export const authButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: 'none',
  backgroundColor: 'var(--accent)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: '8px',
};

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(1100px 550px at 50% -12%, rgba(99,102,241,0.20), transparent 60%), radial-gradient(900px 500px at 90% 110%, rgba(56,189,248,0.10), transparent 55%), var(--bg-base, #0b0b12)', padding: '24px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '36px 32px', borderRadius: '18px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#4f46e5,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>H</div>
          <div>
            <p style={{ margin: 0, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--text-primary)' }}>HORQUVA</p>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>OBA Platform</p>
          </div>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: '13.5px', color: 'var(--text-tertiary)', margin: '0 0 22px' }}>{subtitle}</p>}
        {children}
        {footer && <div style={{ marginTop: '20px', fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center' }}>{footer}</div>}
      </div>
    </div>
  );
}

export default AuthLayout;
