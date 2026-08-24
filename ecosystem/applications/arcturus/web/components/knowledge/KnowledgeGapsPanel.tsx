'use client';

import { KnowledgeGap } from '../../lib/knowledgeRisk';
import { Skull, Bot, Workflow, Wrench } from 'lucide-react';

interface Props {
  gaps: KnowledgeGap[];
}

function TypeIcon({ type }: { type: string }) {
  const s = { flexShrink: 0 as const };
  if (type === 'agent')    return <Bot size={13} style={s} />;
  if (type === 'workflow') return <Workflow size={13} style={s} />;
  return <Wrench size={13} style={s} />;
}

const CRIT_COLOR: Record<string, string> = {
  critical: 'var(--risk-critical-text)',
  high:     'var(--risk-high-text)',
  medium:   'var(--risk-medium-text)',
  low:      'var(--risk-low-text)',
};
const CRIT_BG: Record<string, string> = {
  critical: 'var(--risk-critical-bg)',
  high:     'var(--risk-high-bg)',
  medium:   'var(--risk-medium-bg)',
  low:      'var(--risk-low-bg)',
};
const CRIT_BORDER: Record<string, string> = {
  critical: 'var(--risk-critical-border)',
  high:     'var(--risk-high-border)',
  medium:   'var(--risk-medium-border)',
  low:      'var(--risk-low-border)',
};

export function KnowledgeGapsPanel({ gaps }: Props) {
  if (gaps.length === 0) return null;

  const sorted = [...gaps].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.asset.criticality] ?? 9) - (order[b.asset.criticality] ?? 9);
  });

  const criticalCount = gaps.filter(g => g.asset.criticality === 'critical').length;
  const highCount     = gaps.filter(g => g.asset.criticality === 'high').length;

  return (
    <div className="animate-fade-up delay-400">
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Skull size={16} style={{ color: 'var(--risk-critical-text)' }} />
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Critical Knowledge Gaps
        </h2>
        <span style={{
          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px',
          background: 'var(--risk-critical-bg)', color: 'var(--risk-critical-text)',
          border: '1px solid var(--risk-critical-border)',
        }}>
          {gaps.length} gap{gaps.length !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
          — no documentation AND no backup owner; unrecoverable today
        </span>
      </div>

      {/* Summary callout */}
      <div style={{
        padding: '14px 18px', borderRadius: '10px', marginBottom: '16px',
        background: 'rgba(220,38,38,0.07)', border: '1px solid var(--risk-critical-border)',
        display: 'flex', alignItems: 'center', gap: '20px',
      }}>
        <div>
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Critical Assets at Risk</p>
          <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--risk-critical-text)', margin: 0 }}>{criticalCount}</p>
        </div>
        <div style={{ width: '1px', height: '36px', background: 'var(--risk-critical-border)' }} />
        <div>
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>High Risk Assets</p>
          <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--risk-high-text)', margin: 0 }}>{highCount}</p>
        </div>
        <div style={{ width: '1px', height: '36px', background: 'var(--border-subtle)' }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            These assets have <strong style={{ color: 'var(--risk-critical-text)' }}>zero knowledge redundancy</strong>.
            If the owner leaves or becomes unavailable, there is no documentation to recover from and no one else to take over.
            Each one is a potential operational black hole.
          </p>
        </div>
      </div>

      <div className="card" style={{ borderRadius: '14px', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 100px 120px 130px 1fr',
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0,0,0,0.12)',
        }}>
          {['Asset Name', 'Type', 'Criticality', 'Sole Owner', 'Gap Reason'].map(h => (
            <span key={h} style={{
              fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-tertiary)',
            }}>{h}</span>
          ))}
        </div>

        {sorted.map((g, i) => {
          const { asset } = g;
          const color  = CRIT_COLOR[asset.criticality] ?? 'var(--text-secondary)';
          const bg     = CRIT_BG[asset.criticality] ?? 'transparent';
          const border = CRIT_BORDER[asset.criticality] ?? 'var(--border-subtle)';
          const isLast = i === sorted.length - 1;

          return (
            <div
              key={asset.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 100px 120px 130px 1fr',
                padding: '13px 20px',
                borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                alignItems: 'center',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TypeIcon type={asset.type} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {asset.name}
                </span>
              </div>

              {/* Type */}
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px',
                background: 'var(--accent-dim)', color: 'var(--accent)',
                border: '1px solid var(--accent-border)', width: 'fit-content',
              }}>
                {asset.type.charAt(0).toUpperCase() + asset.type.slice(1)}
              </span>

              {/* Criticality */}
              <span style={{
                fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px',
                background: bg, color, border: `1px solid ${border}`,
                width: 'fit-content', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {asset.criticality}
              </span>

              {/* Sole owner */}
              <span style={{ fontSize: '12px', color: asset.owner ? 'var(--risk-high-text)' : 'var(--risk-critical-text)', fontWeight: 600 }}>
                {asset.owner ?? '(unassigned)'}
              </span>

              {/* Reason */}
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                {g.reason}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
