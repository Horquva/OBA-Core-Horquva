'use client';

import { useState } from 'react';
import { DecisionRecord } from '@/lib/decisionIntelligence';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  decisions: DecisionRecord[];
}

const qualityStyles: Record<string, { color: string; bg: string; border: string }> = {
  GOOD:       { color: '#4ade80', bg: 'rgba(74,222,128,0.08)',   border: 'rgba(74,222,128,0.22)' },
  ACCEPTABLE: { color: '#facc15', bg: 'rgba(250,204,21,0.08)',   border: 'rgba(250,204,21,0.22)' },
  POOR:       { color: '#fb923c', bg: 'rgba(251,146,60,0.08)',   border: 'rgba(251,146,60,0.22)' },
  HARMFUL:    { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.22)' },
};

const critStyles: Record<string, { color: string }> = {
  critical: { color: '#f87171' },
  high:     { color: '#fb923c' },
  medium:   { color: '#facc15' },
  low:      { color: '#4ade80' },
};

const categoryLabel: Record<string, string> = {
  ownership: 'Ownership',
  tooling:   'Tooling',
  workflow:  'Workflow',
};

function ScoreBar({ score, quality }: { score: number; quality: string }) {
  const c = qualityStyles[quality];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 9999, backgroundColor: 'var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', backgroundColor: c.color, borderRadius: 9999, transition: 'width 0.8s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', minWidth: 24 }}>{score}</span>
    </div>
  );
}

function InfluenceRow({ factor, impact, detail }: { factor: string; impact: string; detail: string }) {
  const icon = impact === 'positive' ? '↑' : impact === 'negative' ? '↓' : '·';
  const color = impact === 'positive' ? '#4ade80' : impact === 'negative' ? '#f87171' : 'var(--text-tertiary)';
  return (
    <div style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color, width: 14, flexShrink: 0 }}>{icon}</span>
      <div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{factor}</span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 6 }}>{detail}</span>
      </div>
    </div>
  );
}

function DecisionRow({ d }: { d: DecisionRecord }) {
  const [expanded, setExpanded] = useState(false);
  const qs = qualityStyles[d.quality];
  const cs = critStyles[d.criticality] ?? { color: 'var(--text-secondary)' };

  return (
    <>
      <tr
        onClick={() => setExpanded(e => !e)}
        style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-hover)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'; }}
      >
        {/* Expand icon */}
        <td style={{ padding: '12px 8px 12px 16px', width: 28, color: 'var(--text-tertiary)' }}>
          {expanded
            ? <ChevronDown size={14} />
            : <ChevronRight size={14} />}
        </td>

        {/* Decision */}
        <td style={{ padding: '12px 12px 12px 0' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{d.decision}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>{d.department}</p>
        </td>

        {/* Category */}
        <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
            padding: '2px 8px', borderRadius: 4,
            color: 'var(--text-secondary)', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-default)',
          }}>
            {categoryLabel[d.category]}
          </span>
        </td>

        {/* Criticality */}
        <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: cs.color, textTransform: 'capitalize' }}>
            {d.criticality}
          </span>
        </td>

        {/* Score bar */}
        <td style={{ padding: '12px', minWidth: 130 }}>
          <ScoreBar score={d.score} quality={d.quality} />
        </td>

        {/* Quality badge */}
        <td style={{ padding: '12px 16px 12px 8px', whiteSpace: 'nowrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '3px 9px', borderRadius: 4,
            color: qs.color, backgroundColor: qs.bg, border: `1px solid ${qs.border}`,
          }}>
            {d.quality}
          </span>
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: 0, backgroundColor: 'var(--bg-base)' }}>
            <div style={{ padding: '16px 20px 20px 48px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>

              {/* Trail */}
              <div style={{ flex: 1, minWidth: 260 }}>
                <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                  Decision Trail
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  {d.trailSummary}
                </p>
              </div>

              {/* Influences */}
              <div style={{ flex: 1, minWidth: 260 }}>
                <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                  Influences
                </p>
                <div>
                  {d.influences.map((inf, i) => (
                    <InfluenceRow key={i} {...inf} />
                  ))}
                </div>
              </div>

              {/* Fix */}
              {d.fix && (
                <div style={{ flex: 1, minWidth: 220 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fb923c' }}>
                    Recommended Fix
                  </p>
                  <div style={{
                    padding: '10px 14px', borderRadius: 6,
                    backgroundColor: 'rgba(251,146,60,0.07)',
                    border: '1px solid rgba(251,146,60,0.2)',
                  }}>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{d.fix}</p>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

type FilterTier = 'ALL' | 'HARMFUL' | 'POOR' | 'ACCEPTABLE' | 'GOOD';
type FilterCategory = 'ALL' | 'ownership' | 'tooling' | 'workflow';

export function DecisionTrailTable({ decisions }: Props) {
  const [tierFilter, setTierFilter]     = useState<FilterTier>('ALL');
  const [catFilter, setCatFilter]       = useState<FilterCategory>('ALL');

  const filtered = decisions.filter(d => {
    const tierOk = tierFilter === 'ALL' || d.quality === tierFilter;
    const catOk  = catFilter  === 'ALL' || d.category === catFilter;
    return tierOk && catOk;
  });

  const tierBtns: FilterTier[]     = ['ALL', 'HARMFUL', 'POOR', 'ACCEPTABLE', 'GOOD'];
  const catBtns: FilterCategory[]  = ['ALL', 'ownership', 'tooling', 'workflow'];

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Decision Trail Audit
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            {filtered.length} of {decisions.length} decisions · click a row to expand the trail &amp; influences
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Tier filter */}
          <div style={{ display: 'flex', gap: 4 }}>
            {tierBtns.map(t => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
                  padding: '4px 10px', borderRadius: 4, cursor: 'pointer', border: 'none',
                  color: tierFilter === t ? (qualityStyles[t]?.color ?? 'var(--text-primary)') : 'var(--text-tertiary)',
                  backgroundColor: tierFilter === t ? (qualityStyles[t]?.bg ?? 'var(--bg-hover)') : 'var(--bg-hover)',
                  outline: tierFilter === t ? `1px solid ${qualityStyles[t]?.border ?? 'var(--border-default)'}` : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {t}
              </button>
            ))}
          </div>
          {/* Category filter */}
          <div style={{ display: 'flex', gap: 4 }}>
            {catBtns.map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'capitalize',
                  padding: '4px 10px', borderRadius: 4, cursor: 'pointer', border: 'none',
                  color: catFilter === c ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  backgroundColor: catFilter === c ? 'var(--bg-elevated)' : 'transparent',
                  outline: catFilter === c ? '1px solid var(--border-default)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ width: 28 }} />
              {['Decision', 'Category', 'Criticality', 'Score', 'Quality'].map(h => (
                <th
                  key={h}
                  style={{
                    padding: '10px 12px', textAlign: 'left',
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  No decisions match the selected filters.
                </td>
              </tr>
            ) : (
              filtered.map(d => <DecisionRow key={d.id} d={d} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
