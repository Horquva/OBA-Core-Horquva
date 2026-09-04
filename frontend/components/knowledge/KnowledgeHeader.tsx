'use client';

import { KnowledgeRiskReport } from '../../lib/knowledgeRisk';
import { Brain, FileX, Shield, AlertTriangle, Users } from 'lucide-react';

interface Props {
  report: KnowledgeRiskReport;
}

export function KnowledgeHeader({ report }: Props) {
  const stats = [
    {
      label: 'Total Assets Mapped',
      value: String(report.totalAssets),
      icon: Brain,
      accent: '#a78bfa',
      sublabel: 'agents, workflows & tools',
    },
    {
      label: 'Undocumented Assets',
      value: String(report.totalUndocumented),
      icon: FileX,
      accent: 'var(--risk-critical-text)',
      sublabel: 'knowledge in heads only',
    },
    {
      label: 'Knowledge Gaps',
      value: String(report.knowledgeGaps.length),
      icon: AlertTriangle,
      accent: 'var(--risk-critical-text)',
      sublabel: 'no doc + no backup owner',
    },
    {
      label: 'Sole Knowledge Holders',
      value: String(report.totalSoleHolders),
      icon: Shield,
      accent: 'var(--risk-high-text)',
      sublabel: 'single point of failure',
    },
    {
      label: 'People Analysed',
      value: String(report.profiles.length),
      icon: Users,
      accent: 'var(--risk-medium-text)',
      sublabel: 'across all departments',
    },
  ];

  return (
    <div className="animate-fade-up">
      {/* Module title */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Knowledge Risk Intelligence
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0', maxWidth: '680px' }}>
          Maps where critical organizational knowledge lives — in people&apos;s heads — and calculates exactly what disappears if they leave today.
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
        {stats.map((s, i) => (
          <div
            key={i}
            className="card"
            style={{
              padding: '18px 20px',
              borderRadius: '12px',
              animation: `fade-up 0.5s cubic-bezier(0.19,1,0.22,1) ${i * 80}ms both`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', margin: 0 }}>
                {s.label}
              </p>
              <s.icon size={14} style={{ color: s.accent, opacity: 0.8 }} />
            </div>
            <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
              {s.value}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '6px 0 0' }}>
              {s.sublabel}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
