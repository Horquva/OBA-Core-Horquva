'use client';

import { DecisionRecord } from '@/lib/decisionIntelligence';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface Props {
  harmful: DecisionRecord[];
  poor: DecisionRecord[];
}

const tileConfig = {
  HARMFUL: {
    color: '#f87171',
    bg: 'rgba(248,113,113,0.07)',
    border: 'rgba(248,113,113,0.22)',
    headerBg: 'rgba(248,113,113,0.12)',
    icon: AlertTriangle,
    label: 'HARMFUL',
  },
  POOR: {
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.06)',
    border: 'rgba(251,146,60,0.20)',
    headerBg: 'rgba(251,146,60,0.10)',
    icon: AlertCircle,
    label: 'POOR',
  },
} as const;

const critStyles: Record<string, { color: string }> = {
  critical: { color: '#f87171' },
  high:     { color: '#fb923c' },
  medium:   { color: '#facc15' },
  low:      { color: '#4ade80' },
};

function DecisionCard({ d, tier }: { d: DecisionRecord; tier: 'HARMFUL' | 'POOR' }) {
  const cfg = tileConfig[tier];
  const Icon = cfg.icon;
  const cs = critStyles[d.criticality] ?? { color: 'var(--text-secondary)' };

  return (
    <div style={{
      borderRadius: 8,
      border: `1px solid ${cfg.border}`,
      backgroundColor: cfg.bg,
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{
        padding: '10px 14px',
        backgroundColor: cfg.headerBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        borderBottom: `1px solid ${cfg.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Icon size={13} color={cfg.color} style={{ flexShrink: 0 }} />
          <span style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {d.subject}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: cs.color, textTransform: 'capitalize' }}>
            {d.criticality}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
            padding: '1px 6px', borderRadius: 3,
            color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`,
          }}>
            {d.score}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Decision label */}
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <span style={{ color: 'var(--text-tertiary)', marginRight: 4 }}>Decision:</span>
          {d.decision}
        </p>

        {/* Trail */}
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          {d.trailSummary}
        </p>

        {/* Penalties */}
        <div>
          {d.influences.filter(i => i.impact === 'negative').map((inf, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 6, paddingTop: 4, borderTop: idx === 0 ? `1px solid ${cfg.border}` : 'none' }}>
              <span style={{ color: '#f87171', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>↓</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{inf.detail}</span>
            </div>
          ))}
        </div>

        {/* Fix */}
        {d.fix && (
          <div style={{
            padding: '8px 10px', borderRadius: 5,
            backgroundColor: 'rgba(251,146,60,0.07)',
            border: '1px solid rgba(251,146,60,0.18)',
          }}>
            <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fb923c' }}>
              Fix
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{d.fix}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function CriticalDecisionsPanel({ harmful, poor }: Props) {
  if (harmful.length === 0 && poor.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }}>
      {/* HARMFUL section */}
      {harmful.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '14px 18px 12px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <AlertTriangle size={15} color="#f87171" />
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              Harmful Decisions
            </h2>
            <span style={{
              marginLeft: 'auto', fontSize: 10, fontWeight: 700,
              padding: '2px 8px', borderRadius: 4,
              color: '#f87171', backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.22)',
            }}>
              {harmful.length}
            </span>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {harmful.map(d => <DecisionCard key={d.id} d={d} tier="HARMFUL" />)}
          </div>
        </div>
      )}

      {/* POOR section */}
      {poor.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '14px 18px 12px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <AlertCircle size={15} color="#fb923c" />
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              Poor Decisions
            </h2>
            <span style={{
              marginLeft: 'auto', fontSize: 10, fontWeight: 700,
              padding: '2px 8px', borderRadius: 4,
              color: '#fb923c', backgroundColor: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.22)',
            }}>
              {poor.length}
            </span>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {poor.map(d => <DecisionCard key={d.id} d={d} tier="POOR" />)}
          </div>
        </div>
      )}
    </div>
  );
}
