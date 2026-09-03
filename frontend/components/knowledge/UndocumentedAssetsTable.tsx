'use client';

import { AssetItem } from '../../lib/knowledgeRisk';
import { FileX, Bot, Workflow, Wrench } from 'lucide-react';

interface Props {
  assets: AssetItem[];
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

const TYPE_LABEL: Record<string, string> = {
  agent: 'Agent',
  workflow: 'Workflow',
  tool: 'Tool',
};

function TypeIcon({ type }: { type: string }) {
  const iconStyle = { flexShrink: 0, opacity: 0.7 };
  if (type === 'agent') return <Bot size={13} style={iconStyle} />;
  if (type === 'workflow') return <Workflow size={13} style={iconStyle} />;
  return <Wrench size={13} style={iconStyle} />;
}

export function UndocumentedAssetsTable({ assets }: Props) {
  if (assets.length === 0) return null;

  const sorted = [...assets].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.criticality] ?? 9) - (order[b.criticality] ?? 9);
  });

  return (
    <div className="animate-fade-up delay-225">
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <FileX size={16} style={{ color: 'var(--risk-high-text)' }} />
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Undocumented Assets
        </h2>
        <span style={{
          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px',
          background: 'var(--risk-high-bg)', color: 'var(--risk-high-text)',
          border: '1px solid var(--risk-high-border)',
        }}>
          {assets.length} asset{assets.length !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
          — knowledge exists only in someone&apos;s head
        </span>
      </div>

      <div className="card" style={{ borderRadius: '14px', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 100px 120px 120px 120px',
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0,0,0,0.12)',
        }}>
          {['Asset Name', 'Type', 'Owner', 'Backup Owner', 'Criticality'].map(h => (
            <span key={h} style={{
              fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-tertiary)',
            }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {sorted.map((a, i) => {
          const color = CRIT_COLOR[a.criticality] ?? 'var(--text-secondary)';
          const bg = CRIT_BG[a.criticality] ?? 'transparent';
          const border = CRIT_BORDER[a.criticality] ?? 'var(--border-subtle)';
          const isLast = i === sorted.length - 1;
          return (
            <div
              key={a.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 100px 120px 120px 120px',
                padding: '13px 20px',
                borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                alignItems: 'center',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TypeIcon type={a.type} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {a.name}
                </span>
                {!a.backup_owner && (
                  <span style={{
                    fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px',
                    background: 'rgba(239,68,68,0.08)', color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.18)',
                  }}>
                    NO BACKUP
                  </span>
                )}
              </div>

              {/* Type */}
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px',
                background: 'var(--accent-dim)', color: 'var(--accent)',
                border: '1px solid var(--accent-border)', width: 'fit-content',
              }}>
                {TYPE_LABEL[a.type] ?? a.type}
              </span>

              {/* Owner */}
              <span style={{ fontSize: '12px', color: a.owner ? 'var(--text-secondary)' : 'var(--text-tertiary)', fontStyle: a.owner ? 'normal' : 'italic' }}>
                {a.owner ?? 'Unassigned'}
              </span>

              {/* Backup */}
              <span style={{ fontSize: '12px', color: a.backup_owner ? 'var(--text-secondary)' : 'var(--risk-critical-text)', fontWeight: a.backup_owner ? 400 : 600 }}>
                {a.backup_owner ?? '—'}
              </span>

              {/* Criticality badge */}
              <span style={{
                fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px',
                background: bg, color, border: `1px solid ${border}`,
                width: 'fit-content', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {a.criticality}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
