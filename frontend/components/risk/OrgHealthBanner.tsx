'use client';

import { RiskIntelligenceReport } from '../../lib/riskIntelligence';
import clsx from 'clsx';
import { EvidenceBadge } from '../ui/EvidenceBadge';

interface OrgHealthBannerProps {
  report: RiskIntelligenceReport;
}

export function OrgHealthBanner({ report }: OrgHealthBannerProps) {
  const { organizationalHealthScore: ohs, healthStatus, summary, totalAgents } = report;

  const findings = summary.findings.length > 0
    ? summary.findings
    : ['No elevated risk findings — organization is within normal ownership and documentation coverage.'];

  const insightCols = [
    {
      label: 'Most Overloaded Owner',
      value: summary.mostOverloadedOwner?.name ?? '—',
      sub: summary.mostOverloadedOwner ? `${summary.mostOverloadedOwner.agentCount} agents, ${summary.mostOverloadedOwner.backupCount} backups` : 'no owners assigned',
      color: 'text-red-400',
    },
    {
      label: 'Highest Risk Score',
      value: summary.highestRisk ? String(summary.highestRisk.score) : '—',
      sub: summary.highestRisk?.name ?? 'n/a',
      color: 'text-red-400',
    },
    {
      label: 'SPOF Cascade Risk',
      value: summary.maxCascade > 0 ? `${summary.maxCascade}+` : '0',
      sub: 'agents can be disrupted',
      color: 'text-orange-400',
    },
    {
      label: 'Undocumented Agents',
      value: String(summary.undocumentedCount),
      sub: `of ${totalAgents} agents`,
      color: 'text-yellow-400',
    },
  ];

  const gradient = '';
  const borderColor = 'border-[var(--border-subtle)]';

  const ohsTextColor =
    (ohs ?? 0) >= 75 ? 'text-emerald-400' :
    (ohs ?? 0) >= 50 ? 'text-yellow-400' :
                'text-red-400';

  return (
    <div className={clsx('card overflow-hidden border animate-fade-up delay-500', borderColor)}>
      <div className={clsx('absolute inset-0 bg-gradient-to-br pointer-events-none', gradient)} />

      <div className="relative z-10">
        {/* Top bar */}
        <div className="px-6 py-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Organizational Health Summary</h2>
              <p className="text-xs text-[color:var(--text-secondary)] mt-0.5">
                {totalAgents} agents analysed across all departments
              </p>
            </div>
            {report.evidence.status === 'insufficient_evidence' ? (
              <EvidenceBadge evidence={report.evidence} />
            ) : (
              <div className="text-right">
                <div className="flex items-baseline gap-1 justify-end">
                  <span className={clsx('text-4xl font-bold tracking-tight', ohsTextColor)}>{ohs}</span>
                  <span className="text-[color:var(--text-tertiary)] text-sm">/ 100</span>
                </div>
                <p className={clsx('text-xs font-semibold uppercase tracking-widest mt-0.5', ohsTextColor)}>
                  {healthStatus === 'HEALTHY'  ? 'Healthy'   :
                   healthStatus === 'AT_RISK'  ? '⚠ At Risk' :
                                                '🔴 Critical State'}
                </p>
              </div>
            )}
          </div>

          {/* OHS progress bar */}
          {report.evidence.status !== 'insufficient_evidence' && (
            <div className="mt-4">
              <div className="w-full h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-1000',
                    (ohs ?? 0) >= 75 ? 'bg-emerald-400' : (ohs ?? 0) >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                  )}
                  style={{ width: `${ohs ?? 0}%`, boxShadow: `0 0 8px ${(ohs ?? 0) >= 75 ? 'rgba(52,211,153,0.4)' : (ohs ?? 0) >= 50 ? 'rgba(250,204,21,0.4)' : 'rgba(248,113,113,0.4)'}` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-slate-600">0 — Critical</span>
                <span className="text-[10px] text-slate-600">50 — At Risk</span>
                <span className="text-[10px] text-slate-600">100 — Healthy</span>
              </div>
            </div>
          )}
        </div>

        {/* Insight columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border-subtle)] border-b border-[var(--border-subtle)]">
          {insightCols.map((col, idx) => (
            <div key={idx} className="bg-[var(--bg-elevated)] px-5 py-4">
              <p className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)] mb-1">{col.label}</p>
              <p className={clsx('text-2xl font-bold tracking-tight', col.color)}>{col.value}</p>
              <p className="text-[11px] text-[color:var(--text-tertiary)] mt-0.5">{col.sub}</p>
            </div>
          ))}
        </div>

        {/* Key findings */}
        <div className="px-6 py-5">
          <p className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)] font-semibold mb-3">
            Key Findings
          </p>
          <div className="space-y-2">
            {findings.map((finding, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={clsx(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5',
                  i < 2 ? 'bg-red-400' : i < 4 ? 'bg-orange-400' : 'bg-yellow-400'
                )} />
                <p className="text-sm text-[color:var(--text-secondary)]">{finding}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
