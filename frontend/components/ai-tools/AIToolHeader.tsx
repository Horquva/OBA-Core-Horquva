'use client';

import { AIToolReport } from '../../lib/aiToolIntelligence';
import { Bot, DollarSign, ShieldOff, FileX, Users } from 'lucide-react';

interface Props {
  report: AIToolReport;
}

export function AIToolHeader({ report }: Props) {
  const stats = [
    {
      label: 'Total Monthly Spend',
      value: `$${report.totalMonthlySpend.toLocaleString()}`,
      icon: DollarSign,
      accent: '#a78bfa',
      sublabel: 'across all AI tools',
    },
    {
      label: 'Tools Without Backup',
      value: `${report.toolsWithNoBackup} / ${report.profiles.length}`,
      icon: ShieldOff,
      accent: 'var(--risk-critical-text)',
      sublabel: 'no fallback option',
    },
    {
      label: 'Tools Without Policy',
      value: `${report.toolsWithNoPolicy} / ${report.profiles.length}`,
      icon: FileX,
      accent: 'var(--risk-high-text)',
      sublabel: 'undocumented usage',
    },
    {
      label: 'Unique Users Exposed',
      value: String(report.totalUsers),
      icon: Users,
      accent: 'var(--risk-medium-text)',
      sublabel: 'across all AI tools',
    },
    {
      label: 'Critical Risk Tools',
      value: String(report.criticalTools.length),
      icon: Bot,
      accent: 'var(--risk-critical-text)',
      sublabel: 'require immediate action',
    },
  ];

  return (
    <div className="animate-fade-up">
      {/* Module title */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          AI Tool Intelligence
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0', maxWidth: '640px' }}>
          Audits every AI tool in use across the organization — usage, risk, dependencies, and financial exposure.
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
