'use client';

import { useState } from 'react';
import { Recommendation, RecPriority, RecCategory } from '../../lib/recommendations';
import {
  Users, FileText, GitBranch, BarChart2, Wrench,
  ChevronDown, ChevronUp, Filter,
} from 'lucide-react';

interface Props {
  recommendations: Recommendation[];
}

const priorityConfig = {
  CRITICAL: { badge: 'risk-critical', label: 'CRITICAL', order: 0 },
  HIGH:     { badge: 'risk-high',     label: 'HIGH',     order: 1 },
  MEDIUM:   { badge: 'risk-medium',   label: 'MEDIUM',   order: 2 },
};

const categoryConfig: Record<RecCategory, { icon: React.ElementType; label: string; color: string }> = {
  OWNERSHIP:       { icon: Users,     label: 'Ownership',      color: 'var(--risk-high-text)'     },
  DOCUMENTATION:   { icon: FileText,  label: 'Documentation',  color: 'var(--accent)'             },
  DEPENDENCY:      { icon: GitBranch, label: 'Dependency',     color: 'var(--risk-critical-text)' },
  CONCENTRATION:   { icon: BarChart2, label: 'Concentration',  color: 'var(--risk-critical-text)' },
  TOOL_GOVERNANCE: { icon: Wrench,    label: 'Tool Governance',color: 'var(--risk-medium-text)'   },
};

const effortConfig = {
  Quick:    { color: 'var(--risk-low-text)',    bg: 'rgba(22,163,74,0.08)' },
  Medium:   { color: 'var(--risk-medium-text)', bg: 'rgba(202,138,4,0.08)' },
  Strategic:{ color: 'var(--accent)',           bg: 'var(--accent-dim)'    },
};

const ALL_PRIORITIES: Array<RecPriority | 'ALL'> = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'];

export default function RecommendationList({ recommendations }: Props) {
  const [filter, setFilter] = useState<RecPriority | 'ALL'>('ALL');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = filter === 'ALL'
    ? recommendations
    : recommendations.filter(r => r.priority === filter);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const counts: Record<string, number> = { ALL: recommendations.length };
  recommendations.forEach(r => { counts[r.priority] = (counts[r.priority] || 0) + 1; });

  return (
    <div className="card animate-fade-up delay-300" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
          <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            All Recommendations
          </h2>
          <span style={{
            fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
            background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)',
          }}>
            {filtered.length}
          </span>
        </div>

        {/* Priority filter tabs */}
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {ALL_PRIORITIES.map(p => {
            const isActive = filter === p;
            const badgeClass = p !== 'ALL' ? priorityConfig[p as RecPriority].badge : '';
            return (
              <button
                key={p}
                onClick={() => setFilter(p)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  border: isActive
                    ? (p === 'ALL' ? '1px solid var(--accent-border)' : '1px solid transparent')
                    : '1px solid var(--border-subtle)',
                  background: isActive
                    ? (p === 'ALL' ? 'var(--accent-dim)' : 'transparent')
                    : 'transparent',
                  color: isActive
                    ? (p === 'ALL' ? 'var(--accent)' : undefined)
                    : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                className={isActive && p !== 'ALL' ? badgeClass : ''}
              >
                {p} {counts[p] !== undefined ? `(${counts[p]})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filtered.map((rec, idx) => {
          const pc = priorityConfig[rec.priority];
          const cc = categoryConfig[rec.category];
          const ec = effortConfig[rec.effort];
          const isOpen = expanded.has(rec.id);
          const CategoryIcon = cc.icon;

          return (
            <div
              key={rec.id}
              className="animate-fade-up"
              style={{
                borderRadius: '8px',
                border: `1px solid ${isOpen ? 'var(--border-default)' : 'var(--border-subtle)'}`,
                background: isOpen ? 'var(--bg-hover)' : 'var(--bg-surface)',
                transition: 'all 0.2s ease',
                animationDelay: `${320 + idx * 40}ms`,
                overflow: 'hidden',
              }}
            >
              {/* Row header */}
              <button
                onClick={() => toggle(rec.id)}
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0.875rem 1rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  textAlign: 'left',
                }}
              >
                {/* Priority badge */}
                <span
                  className={pc.badge}
                  style={{
                    flexShrink: 0,
                    fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em',
                    padding: '2px 7px', borderRadius: '4px',
                    minWidth: '62px', textAlign: 'center',
                  }}
                >
                  {pc.label}
                </span>

                {/* Category icon */}
                <div style={{
                  flexShrink: 0,
                  width: '24px', height: '24px', borderRadius: '6px',
                  background: `color-mix(in srgb, ${cc.color} 10%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CategoryIcon size={12} style={{ color: cc.color }} />
                </div>

                {/* Title */}
                <span style={{
                  flex: 1, minWidth: 0,
                  fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {rec.title}
                </span>

                {/* Meta right side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <span style={{
                    fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 500,
                  }}>
                    {cc.label}
                  </span>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px',
                    borderRadius: '20px', background: ec.bg, color: ec.color,
                  }}>
                    {rec.effort}
                  </span>
                  {isOpen
                    ? <ChevronUp size={14} style={{ color: 'var(--text-tertiary)' }} />
                    : <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
                  }
                </div>
              </button>

              {/* Expanded body */}
              {isOpen && (
                <div style={{
                  padding: '0 1rem 1rem 1rem',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '1rem',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Description */}
                    <div>
                      <p style={{ margin: '0 0 0.25rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Context
                      </p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {rec.description}
                      </p>
                    </div>
                    {/* Impact */}
                    <div>
                      <p style={{ margin: '0 0 0.25rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--risk-critical-text)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Risk if Ignored
                      </p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {rec.impact}
                      </p>
                    </div>
                  </div>
                  {/* Action */}
                  <div style={{
                    marginTop: '0.875rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '7px',
                    background: 'rgba(99,102,241,0.06)',
                    border: '1px solid var(--accent-border)',
                  }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Recommended Action
                    </p>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                      {rec.action}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
