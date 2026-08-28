'use client';

import { OrgMemoryReport } from '../../lib/orgMemory';
import { ShieldCheck, AlertTriangle, ShieldOff, Skull } from 'lucide-react';
import { EvidenceBadge } from '../ui/EvidenceBadge';

interface Props {
  report: OrgMemoryReport;
}

const STATUS_BG: Record<string, string> = {
  PRESERVED:  'var(--risk-low-bg)',
  VULNERABLE: 'var(--risk-high-bg)',
  AT_RISK:    'var(--risk-medium-bg)',
  LOST:       'var(--risk-critical-bg)',
};
const STATUS_BORDER: Record<string, string> = {
  PRESERVED:  'var(--risk-low-border)',
  VULNERABLE: 'var(--risk-high-border)',
  AT_RISK:    'var(--risk-medium-border)',
  LOST:       'var(--risk-critical-border)',
};

function IMHSArc({ score, verdict }: { score: number; verdict: string }) {
  // SVG arc progress meter
  const radius = 60;
  const cx = 90;
  const cy = 90;
  const circumference = Math.PI * radius; // half-circle arc
  const progress = Math.max(0, Math.min(1, score / 100));
  const dashOffset = circumference * (1 - progress);

  const arcColor =
    verdict === 'HEALTHY'  ? 'var(--risk-low-text)'      :
    verdict === 'AT_RISK'  ? 'var(--risk-medium-text)'   :
                             'var(--risk-critical-text)';
  const glowColor =
    verdict === 'HEALTHY'  ? 'rgba(74,222,128,0.35)'     :
    verdict === 'AT_RISK'  ? 'rgba(250,204,21,0.35)'     :
                             'rgba(248,113,113,0.35)';

  const verdictLabel =
    verdict === 'HEALTHY'  ? 'HEALTHY'  :
    verdict === 'AT_RISK'  ? 'AT RISK'  :
                             'CRITICAL';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <svg width="180" height="100" viewBox="0 0 180 100" style={{ overflow: 'visible' }}>
        {/* Track */}
        <path
          d={`M ${cx - radius},${cy} A ${radius},${radius} 0 0,1 ${cx + radius},${cy}`}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d={`M ${cx - radius},${cy} A ${radius},${radius} 0 0,1 ${cx + radius},${cy}`}
          fill="none"
          stroke={arcColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={dashOffset}
          style={{
            filter: `drop-shadow(0 0 8px ${glowColor})`,
            transition: 'stroke-dashoffset 1s cubic-bezier(0.19,1,0.22,1)',
          }}
        />
        {/* Score text */}
        <text
          x={cx} y={cy - 8}
          textAnchor="middle"
          fontSize="32"
          fontWeight="700"
          fill={arcColor}
          fontFamily="inherit"
          style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
        >
          {score}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="11" fill="var(--text-tertiary)" fontFamily="inherit">
          out of 100
        </text>
      </svg>
      <span style={{
        fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em',
        padding: '4px 14px', borderRadius: '9999px',
        background: STATUS_BG[verdict === 'AT_RISK' ? 'AT_RISK' : verdict === 'HEALTHY' ? 'PRESERVED' : 'LOST'] ?? 'var(--risk-medium-bg)',
        color: arcColor,
        border: `1px solid ${STATUS_BORDER[verdict === 'AT_RISK' ? 'AT_RISK' : verdict === 'HEALTHY' ? 'PRESERVED' : 'LOST'] ?? 'var(--risk-medium-border)'}`,
      }}>
        {verdictLabel}
      </span>
    </div>
  );
}

export function MemoryHeader({ report }: Props) {
  const kpis = [
    {
      label: 'PRESERVED',
      value: report.preserved.length,
      icon: ShieldCheck,
      color: 'var(--risk-low-text)',
      bg: 'var(--risk-low-bg)',
      border: 'var(--risk-low-border)',
      sublabel: 'Documented + backup owner',
    },
    {
      label: 'VULNERABLE',
      value: report.vulnerable.length,
      icon: ShieldOff,
      color: 'var(--risk-high-text)',
      bg: 'var(--risk-high-bg)',
      border: 'var(--risk-high-border)',
      sublabel: 'Documented, no backup',
    },
    {
      label: 'AT RISK',
      value: report.atRisk.length,
      icon: AlertTriangle,
      color: 'var(--risk-medium-text)',
      bg: 'var(--risk-medium-bg)',
      border: 'var(--risk-medium-border)',
      sublabel: 'Backup exists, not documented',
    },
    {
      label: 'LOST',
      value: report.lost.length,
      icon: Skull,
      color: 'var(--risk-critical-text)',
      bg: 'var(--risk-critical-bg)',
      border: 'var(--risk-critical-border)',
      sublabel: 'No owner · no docs · unrecoverable',
    },
  ];

  return (
    <div className="animate-fade-up">
      {/* Title row */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Organizational Memory Intelligence
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, maxWidth: '720px' }}>
          Tracks the institutional memory preservation status of every AI asset and calculates
          how much organizational knowledge would survive a major personnel disruption.
        </p>
      </div>

      {/* KPI strip + IMHS side by side */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>
        {/* IMHS Score card */}
        <div
          className="card"
          style={{
            padding: '20px 24px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            minWidth: '240px',
            animation: 'fade-up 0.5s cubic-bezier(0.19,1,0.22,1) 0ms both',
          }}
        >
          <p style={{
            fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'var(--text-tertiary)', margin: '0 0 4px',
            textAlign: 'center'
          }}>
            Institutional Memory Health
          </p>
          {report.evidence.status === 'insufficient_evidence' ? (
            <EvidenceBadge evidence={report.evidence} />
          ) : (
            <IMHSArc score={report.imhs as number} verdict={report.imhsVerdict as string} />
          )}
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', flex: 1 }}>
          {kpis.map((k, i) => (
            <div
              key={k.label}
              className="card"
              style={{
                padding: '20px',
                borderRadius: '12px',
                borderLeft: `3px solid ${k.border}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                animation: `fade-up 0.5s cubic-bezier(0.19,1,0.22,1) ${(i + 1) * 80}ms both`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <p style={{
                  fontSize: '11px', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: k.color, margin: 0,
                }}>
                  {k.label}
                </p>
                <k.icon size={16} style={{ color: k.color, opacity: 0.75 }} />
              </div>
              <div>
                <p style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
                  {k.value}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
                  {k.sublabel}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
