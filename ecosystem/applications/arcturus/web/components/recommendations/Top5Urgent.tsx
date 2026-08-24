'use client';

import { Recommendation } from '../../lib/recommendations';
import { Zap } from 'lucide-react';

interface Props {
  top5: Recommendation[];
}

const priorityConfig = {
  CRITICAL: { dot: 'var(--risk-critical-text)', badge: 'risk-critical', label: 'CRITICAL' },
  HIGH:     { dot: 'var(--risk-high-text)',     badge: 'risk-high',     label: 'HIGH'     },
  MEDIUM:   { dot: 'var(--risk-medium-text)',   badge: 'risk-medium',   label: 'MEDIUM'   },
};

const effortConfig = {
  Quick:    { color: 'var(--risk-low-text)',    bg: 'rgba(22,163,74,0.08)' },
  Medium:   { color: 'var(--risk-medium-text)', bg: 'rgba(202,138,4,0.08)' },
  Strategic:{ color: 'var(--accent)',           bg: 'var(--accent-dim)'    },
};

export default function Top5Urgent({ top5 }: Props) {
  return (
    <div className="card animate-fade-up delay-150" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
        <div style={{
          width: '30px', height: '30px',
          borderRadius: '8px',
          background: 'rgba(99,102,241,0.12)',
          border: '1px solid var(--accent-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Zap size={14} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Top 5 Most Urgent Actions
          </h2>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Address these immediately — highest organizational risk
          </p>
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {top5.map((rec, idx) => {
          const pc = priorityConfig[rec.priority];
          const ec = effortConfig[rec.effort];
          return (
            <div
              key={rec.id}
              className="animate-fade-up"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.875rem',
                padding: '0.875rem 1rem',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                animationDelay: `${200 + idx * 60}ms`,
                transition: 'border-color 0.2s',
                cursor: 'default',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
            >
              {/* Rank badge */}
              <div style={{
                minWidth: '28px', height: '28px',
                borderRadius: '7px',
                background: pc.dot === 'var(--risk-critical-text)'
                  ? 'rgba(220,38,38,0.12)'
                  : pc.dot === 'var(--risk-high-text)'
                  ? 'rgba(234,88,12,0.12)'
                  : 'rgba(202,138,4,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: pc.dot,
                flexShrink: 0,
              }}>
                {idx + 1}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {rec.title}
                  </span>
                  <span className={`${pc.badge}`} style={{
                    fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em',
                    padding: '1px 6px', borderRadius: '4px',
                  }}>
                    {pc.label}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.77rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {rec.action}
                </p>
              </div>

              {/* Effort chip */}
              <div style={{
                flexShrink: 0,
                padding: '3px 10px',
                borderRadius: '20px',
                background: ec.bg,
                fontSize: '0.68rem',
                fontWeight: 600,
                color: ec.color,
                whiteSpace: 'nowrap',
                alignSelf: 'flex-start',
              }}>
                {rec.effort}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
