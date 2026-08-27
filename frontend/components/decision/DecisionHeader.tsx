'use client';

import { DecisionIntelligenceReport } from '@/lib/decisionIntelligence';
import { EvidenceBadge } from '../ui/EvidenceBadge';

interface Props {
  report: DecisionIntelligenceReport;
}

const verdictConfig = {
  STRONG:   { label: 'STRONG',   color: '#4ade80', bg: 'rgba(74,222,128,0.08)',   border: 'rgba(74,222,128,0.22)',   ring: '#4ade80' },
  MIXED:    { label: 'MIXED',    color: '#facc15', bg: 'rgba(250,204,21,0.08)',   border: 'rgba(250,204,21,0.22)',   ring: '#facc15' },
  WEAK:     { label: 'WEAK',     color: '#fb923c', bg: 'rgba(251,146,60,0.08)',   border: 'rgba(251,146,60,0.22)',   ring: '#fb923c' },
  CRITICAL: { label: 'CRITICAL', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.22)', ring: '#f87171' },
};

const qualityColors: Record<string, { color: string; bg: string; border: string }> = {
  GOOD:       { color: '#4ade80', bg: 'rgba(74,222,128,0.08)',   border: 'rgba(74,222,128,0.22)' },
  ACCEPTABLE: { color: '#facc15', bg: 'rgba(250,204,21,0.08)',   border: 'rgba(250,204,21,0.22)' },
  POOR:       { color: '#fb923c', bg: 'rgba(251,146,60,0.08)',   border: 'rgba(251,146,60,0.22)' },
  HARMFUL:    { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.22)' },
};

function DQIGauge({ score, verdict }: { score: number; verdict: keyof typeof verdictConfig }) {
  const cfg = verdictConfig[verdict];
  const radius = 64;
  const stroke = 8;
  const normalised = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalised;
  const offset = circumference * (1 - score / 100);

  return (
    <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
      <svg width={160} height={160} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={80} cy={80} r={normalised}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={80} cy={80} r={normalised}
          fill="none"
          stroke={cfg.ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.19,1,0.22,1)' }}
        />
      </svg>
      {/* Centre label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 2,
      }}>
        <span style={{ fontSize: 34, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85 }}>{cfg.label}</span>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: {
  label: string; value: number | string; sub?: string; color?: string;
}) {
  return (
    <div className="card" style={{ padding: '20px 22px', flex: 1, minWidth: 120 }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 30, fontWeight: 700, color: color ?? 'var(--text-primary)', margin: '6px 0 0', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  );
}

export function DecisionHeader({ report }: Props) {
  const cfg = verdictConfig[report.dqiVerdict ?? 'CRITICAL'];
  const kpiCounts = [
    { label: 'Good Decisions',       value: report.good.length,       color: qualityColors.GOOD.color },
    { label: 'Acceptable',           value: report.acceptable.length,  color: qualityColors.ACCEPTABLE.color },
    { label: 'Poor Decisions',       value: report.poor.length,        color: qualityColors.POOR.color },
    { label: 'Harmful Decisions',    value: report.harmful.length,     color: qualityColors.HARMFUL.color },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page title */}
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>
          Decision Intelligence
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
          Reconstructs organisational decisions, scores their quality, and surfaces what needs fixing.
        </p>
      </div>

      {/* Hero row: DQI gauge + summary */}
      <div className="card" style={{
        padding: '32px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: 48,
        flexWrap: 'wrap',
      }}>
        {report.evidence.status === 'insufficient_evidence' ? (
          <EvidenceBadge evidence={report.evidence} />
        ) : (
          <>
            <DQIGauge score={report.dqi as number} verdict={report.dqiVerdict as 'STRONG' | 'MIXED' | 'WEAK' | 'CRITICAL'} />

            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                  Decision Quality Index
                </h2>
                <span style={{
                  fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '4px 12px', borderRadius: 6,
                  color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`,
                }}>
                  {cfg.label}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 640 }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: 17 }}>{report.dqi}/100</strong> org-wide decision quality score across{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{report.totalDecisions} audited decisions</strong>{' '}
                (ownership assignments, tool adoptions, and workflow setups).{' '}
                {report.harmful.length > 0 && (
                  <span style={{ color: qualityColors.HARMFUL.color, fontWeight: 600 }}>
                    {report.harmful.length} HARMFUL decision{report.harmful.length > 1 ? 's' : ''} require immediate attention.
                  </span>
                )}
              </p>

              {/* Mini tier bar */}
              <div style={{ marginTop: 16, display: 'flex', gap: 4, height: 6, borderRadius: 4, overflow: 'hidden' }}>
                {(['GOOD', 'ACCEPTABLE', 'POOR', 'HARMFUL'] as const).map(t => {
                  const count = report[t.toLowerCase() as 'good' | 'acceptable' | 'poor' | 'harmful'].length;
                  const pct = report.totalDecisions > 0 ? (count / report.totalDecisions) * 100 : 0;
                  return (
                    <div
                      key={t}
                      style={{ width: `${pct}%`, backgroundColor: qualityColors[t].color, borderRadius: 4, transition: 'width 1s ease' }}
                      title={`${t}: ${count}`}
                    />
                  );
                })}
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {(['GOOD', 'ACCEPTABLE', 'POOR', 'HARMFUL'] as const).map(t => (
                  <span key={t} style={{ fontSize: 10, color: qualityColors[t].color, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: qualityColors[t].color, display: 'inline-block' }} />
                    {t} · {report[t.toLowerCase() as 'good' | 'acceptable' | 'poor' | 'harmful'].length}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <KpiCard
          label="Total Decisions"
          value={report.totalDecisions}
          sub="Across ownership, tooling, workflows"
        />
        {kpiCounts.map(k => (
          <KpiCard key={k.label} label={k.label} value={k.value} color={k.color} />
        ))}
        {report.evidence.status === 'insufficient_evidence' ? (
          <KpiCard label="DQI Score" value="—" sub="insufficient evidence" />
        ) : (
          <KpiCard
            label="DQI Score"
            value={`${report.dqi}/100`}
            sub={report.dqiVerdict ?? undefined}
            color={cfg.color}
          />
        )}
      </div>
    </div>
  );
}
