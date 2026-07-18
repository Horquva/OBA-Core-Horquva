'use client';

import { MemoryAsset } from '../../lib/orgMemory';
import { Skull, Bot, Workflow, Wrench } from 'lucide-react';

interface Props {
  lost: MemoryAsset[];
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

export function LostAssetsPanel({ lost }: Props) {
  if (lost.length === 0) return null;

  return (
    <div className="animate-fade-up delay-400">
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Skull size={16} style={{ color: 'var(--risk-critical-text)' }} />
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          LOST Assets — No Recovery Path
        </h2>
        <span style={{
          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px',
          background: 'var(--risk-critical-bg)', color: 'var(--risk-critical-text)',
          border: '1px solid var(--risk-critical-border)',
        }}>
          {lost.length} asset{lost.length !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
          — no owner, no documentation, unrecoverable
        </span>
      </div>

      {/* Warning callout */}
      <div style={{
        padding: '16px 20px', borderRadius: '10px', marginBottom: '16px',
        background: 'rgba(220,38,38,0.07)', border: '1px solid var(--risk-critical-border)',
        display: 'flex', alignItems: 'flex-start', gap: '16px',
      }}>
        <Skull size={28} style={{ color: 'var(--risk-critical-text)', opacity: 0.7, flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--risk-critical-text)', margin: '0 0 4px' }}>
            These assets are operationally dark.
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            No individual owns them, no documentation exists, and no backup owner is registered.
            If these assets fail or need modification, <strong style={{ color: 'var(--risk-critical-text)' }}>there is no recovery path</strong>.
            Each one represents an active operational black hole in your AI infrastructure.
          </p>
        </div>
      </div>

      {/* Lost assets grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
        {lost.map(asset => (
          <div
            key={asset.id}
            className="card"
            style={{
              padding: '18px 20px',
              borderRadius: '12px',
              borderLeft: '3px solid var(--risk-critical-border)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TypeIcon type={asset.type} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {asset.name}
                </span>
              </div>
              <span style={{
                fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px',
                background: 'var(--risk-critical-bg)', color: 'var(--risk-critical-text)',
                border: '1px solid var(--risk-critical-border)', letterSpacing: '0.06em',
              }}>
                LOST
              </span>
            </div>

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                  Type
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>
                  {asset.type.charAt(0).toUpperCase() + asset.type.slice(1)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                  Criticality
                </p>
                <p style={{ fontSize: '12px', fontWeight: 700, margin: 0, color: CRIT_COLOR[asset.criticality] ?? 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  {asset.criticality}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                  Department
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  {asset.department}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                  Owner
                </p>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--risk-critical-text)', margin: 0 }}>
                  None assigned
                </p>
              </div>
            </div>

            {/* Impact line */}
            <div style={{
              marginTop: '14px', paddingTop: '12px',
              borderTop: '1px solid var(--risk-critical-border)',
              display: 'flex', gap: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--risk-critical-text)' }} />
                <span style={{ fontSize: '11px', color: 'var(--risk-critical-text)', fontWeight: 600 }}>No owner</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--risk-critical-text)' }} />
                <span style={{ fontSize: '11px', color: 'var(--risk-critical-text)', fontWeight: 600 }}>Not documented</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--risk-critical-text)' }} />
                <span style={{ fontSize: '11px', color: 'var(--risk-critical-text)', fontWeight: 600 }}>No backup</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
