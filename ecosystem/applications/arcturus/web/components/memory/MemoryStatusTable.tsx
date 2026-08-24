'use client';

import { useState } from 'react';
import { MemoryAsset, MemoryStatus } from '../../lib/orgMemory';
import { Bot, Workflow, Wrench, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  assets: MemoryAsset[];
}

const STATUS_COLOR: Record<MemoryStatus, string> = {
  PRESERVED:  'var(--risk-low-text)',
  VULNERABLE: 'var(--risk-high-text)',
  AT_RISK:    'var(--risk-medium-text)',
  LOST:       'var(--risk-critical-text)',
};
const STATUS_BG: Record<MemoryStatus, string> = {
  PRESERVED:  'var(--risk-low-bg)',
  VULNERABLE: 'var(--risk-high-bg)',
  AT_RISK:    'var(--risk-medium-bg)',
  LOST:       'var(--risk-critical-bg)',
};
const STATUS_BORDER: Record<MemoryStatus, string> = {
  PRESERVED:  'var(--risk-low-border)',
  VULNERABLE: 'var(--risk-high-border)',
  AT_RISK:    'var(--risk-medium-border)',
  LOST:       'var(--risk-critical-border)',
};
const STATUS_ORDER: Record<MemoryStatus, number> = {
  LOST: 0, AT_RISK: 1, VULNERABLE: 2, PRESERVED: 3,
};

const CRIT_COLOR: Record<string, string> = {
  critical: 'var(--risk-critical-text)',
  high:     'var(--risk-high-text)',
  medium:   'var(--risk-medium-text)',
  low:      'var(--risk-low-text)',
};

function TypeIcon({ type }: { type: string }) {
  const s = { flexShrink: 0 as const, color: 'var(--text-tertiary)' };
  if (type === 'agent')    return <Bot size={13} style={s} />;
  if (type === 'workflow') return <Workflow size={13} style={s} />;
  return <Wrench size={13} style={s} />;
}

type SortKey = 'status' | 'name' | 'type' | 'criticality';

export function MemoryStatusTable({ assets }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState<MemoryStatus | 'ALL'>('ALL');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = filter === 'ALL' ? assets : assets.filter(a => a.memoryStatus === filter);

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'status')      cmp = STATUS_ORDER[a.memoryStatus] - STATUS_ORDER[b.memoryStatus];
    else if (sortKey === 'name')   cmp = a.name.localeCompare(b.name);
    else if (sortKey === 'type')   cmp = a.type.localeCompare(b.type);
    else if (sortKey === 'criticality') {
      const w: Record<string,number> = { critical: 0, high: 1, medium: 2, low: 3 };
      cmp = (w[a.criticality] ?? 9) - (w[b.criticality] ?? 9);
    }
    return sortAsc ? cmp : -cmp;
  });

  const statusCounts: Record<MemoryStatus, number> = {
    PRESERVED: assets.filter(a => a.memoryStatus === 'PRESERVED').length,
    VULNERABLE: assets.filter(a => a.memoryStatus === 'VULNERABLE').length,
    AT_RISK: assets.filter(a => a.memoryStatus === 'AT_RISK').length,
    LOST: assets.filter(a => a.memoryStatus === 'LOST').length,
  };

  const filters: Array<{ key: MemoryStatus | 'ALL'; label: string }> = [
    { key: 'ALL', label: `All (${assets.length})` },
    { key: 'LOST', label: `LOST (${statusCounts.LOST})` },
    { key: 'AT_RISK', label: `AT RISK (${statusCounts.AT_RISK})` },
    { key: 'VULNERABLE', label: `VULNERABLE (${statusCounts.VULNERABLE})` },
    { key: 'PRESERVED', label: `PRESERVED (${statusCounts.PRESERVED})` },
  ];

  const cols: Array<{ key: SortKey | null; label: string; width: string }> = [
    { key: 'name',        label: 'Asset Name',   width: '2fr' },
    { key: 'type',        label: 'Type',          width: '90px' },
    { key: 'criticality', label: 'Criticality',   width: '110px' },
    { key: null,          label: 'Owner',         width: '110px' },
    { key: null,          label: 'Backup Owner',  width: '120px' },
    { key: null,          label: 'Documented',    width: '100px' },
    { key: 'status',      label: 'Memory Status', width: '130px' },
  ];

  const gridCols = cols.map(c => c.width).join(' ');

  return (
    <div className="animate-fade-up delay-150">
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Asset Memory Register
        </h2>
        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {filters.map(f => {
            const isActive = filter === f.key;
            const color = f.key === 'ALL' ? 'var(--accent)' : STATUS_COLOR[f.key as MemoryStatus] ?? 'var(--accent)';
            const bg    = f.key === 'ALL' ? 'var(--accent-dim)' : STATUS_BG[f.key as MemoryStatus] ?? 'var(--accent-dim)';
            const brd   = f.key === 'ALL' ? 'var(--accent-border)' : STATUS_BORDER[f.key as MemoryStatus] ?? 'var(--accent-border)';
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '9999px',
                  border: `1px solid ${isActive ? brd : 'var(--border-subtle)'}`,
                  background: isActive ? bg : 'transparent',
                  color: isActive ? color : 'var(--text-tertiary)',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ borderRadius: '14px', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: gridCols,
          padding: '11px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0,0,0,0.12)',
        }}>
          {cols.map(col => (
            <div
              key={col.label}
              onClick={() => col.key && handleSort(col.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                cursor: col.key ? 'pointer' : 'default',
                userSelect: 'none',
              }}
            >
              <span style={{
                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: col.key && sortKey === col.key ? 'var(--accent)' : 'var(--text-tertiary)',
              }}>
                {col.label}
              </span>
              {col.key && sortKey === col.key && (
                sortAsc
                  ? <ChevronUp size={10} style={{ color: 'var(--accent)' }} />
                  : <ChevronDown size={10} style={{ color: 'var(--accent)' }} />
              )}
            </div>
          ))}
        </div>

        {sorted.map((a, i) => {
          const sColor  = STATUS_COLOR[a.memoryStatus];
          const sBg     = STATUS_BG[a.memoryStatus];
          const sBorder = STATUS_BORDER[a.memoryStatus];
          const isLast  = i === sorted.length - 1;

          return (
            <div
              key={a.id}
              style={{
                display: 'grid', gridTemplateColumns: gridCols,
                padding: '12px 20px',
                borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                alignItems: 'center',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TypeIcon type={a.type} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {a.name}
                </span>
              </div>

              {/* Type */}
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px',
                background: 'var(--accent-dim)', color: 'var(--accent)',
                border: '1px solid var(--accent-border)', width: 'fit-content',
              }}>
                {a.type.charAt(0).toUpperCase() + a.type.slice(1)}
              </span>

              {/* Criticality */}
              <span style={{
                fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px',
                background: 'transparent',
                color: CRIT_COLOR[a.criticality] ?? 'var(--text-secondary)',
                width: 'fit-content', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {a.criticality}
              </span>

              {/* Owner */}
              <span style={{ fontSize: '12px', color: a.owner ? 'var(--text-secondary)' : 'var(--risk-critical-text)', fontWeight: a.owner ? 400 : 600 }}>
                {a.owner ?? '(none)'}
              </span>

              {/* Backup owner */}
              <span style={{ fontSize: '12px', color: a.backup_owner ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
                {a.backup_owner ?? '—'}
              </span>

              {/* Documented */}
              <span style={{
                fontSize: '11px', fontWeight: 600,
                color: a.documented ? 'var(--risk-low-text)' : 'var(--risk-critical-text)',
              }}>
                {a.documented ? 'Yes' : 'No'}
              </span>

              {/* Memory Status */}
              <span style={{
                fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px',
                background: sBg, color: sColor, border: `1px solid ${sBorder}`,
                width: 'fit-content', letterSpacing: '0.06em',
              }}>
                {a.memoryStatus.replace('_', ' ')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
