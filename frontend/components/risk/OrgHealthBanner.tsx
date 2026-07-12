'use client';

import { RiskIntelligenceReport } from '../../lib/riskIntelligence';
import clsx from 'clsx';

interface OrgHealthBannerProps {
  report: RiskIntelligenceReport;
}

const FINDINGS = [
  '5 agents at CRITICAL risk — immediate intervention required',
  '6 agents at HIGH risk — escalate to department heads',
  'Robert owns 5 agents with zero backup coverage — single human SPOF',
  '2 orphaned agents: Inventory Agent & Data Backup Agent',
  'SPOF detected: Inventory Agent → cascades to 3+ downstream agents',
];

const INSIGHT_COLS = [
  { label: 'Most Overloaded Owner', value: 'Robert', sub: '5 agents, 0 backups', color: 'text-red-400' },
  { label: 'Highest Risk Score',   value: '85',     sub: 'Data Backup Agent',  color: 'text-red-400' },
  { label: 'SPOF Cascade Risk',    value: '5+',     sub: 'agents can be disrupted', color: 'text-orange-400' },
  { label: 'Undocumented Agents',  value: '7',      sub: 'of 15 agents',       color: 'text-yellow-400' },
];

export function OrgHealthBanner({ report }: OrgHealthBannerProps) {
  const { organizationalHealthScore: ohs, healthStatus, criticalAgents, highAgents } = report;

  const gradient = '';
  const borderColor = 'border-[#1f1f29]';

  const ohsTextColor =
    ohs >= 75 ? 'text-emerald-400' :
    ohs >= 50 ? 'text-yellow-400' :
                'text-red-400';

  return (
    <div className={clsx('card overflow-hidden border animate-fade-up delay-500', borderColor)}>
      <div className={clsx('absolute inset-0 bg-gradient-to-br pointer-events-none', gradient)} />

      <div className="relative z-10">
        {/* Top bar */}
        <div className="px-6 py-5 border-b border-[#1f1f29]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Organizational Health Summary</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Sunrise Care — {report.totalAgents} agents analysed across all departments
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-1 justify-end">
                <span className={clsx('text-4xl font-bold tracking-tight', ohsTextColor)}>{ohs}</span>
                <span className="text-slate-500 text-sm">/ 100</span>
              </div>
              <p className={clsx('text-xs font-semibold uppercase tracking-widest mt-0.5', ohsTextColor)}>
                {healthStatus === 'HEALTHY'  ? 'Healthy'   :
                 healthStatus === 'AT_RISK'  ? '⚠ At Risk' :
                                              '🔴 Critical State'}
              </p>
            </div>
          </div>

          {/* OHS progress bar */}
          <div className="mt-4">
            <div className="w-full h-2 bg-[#1f1f29] rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-1000',
                  ohs >= 75 ? 'bg-emerald-400' : ohs >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                )}
                style={{ width: `${ohs}%`, boxShadow: `0 0 8px ${ohs >= 75 ? 'rgba(52,211,153,0.4)' : ohs >= 50 ? 'rgba(250,204,21,0.4)' : 'rgba(248,113,113,0.4)'}` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-slate-600">0 — Critical</span>
              <span className="text-[10px] text-slate-600">50 — At Risk</span>
              <span className="text-[10px] text-slate-600">100 — Healthy</span>
            </div>
          </div>
        </div>

        {/* Insight columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#1f1f29] border-b border-[#1f1f29]">
          {INSIGHT_COLS.map(col => (
            <div key={col.label} className="bg-[#16161c] px-5 py-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{col.label}</p>
              <p className={clsx('text-2xl font-bold tracking-tight', col.color)}>{col.value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{col.sub}</p>
            </div>
          ))}
        </div>

        {/* Key findings */}
        <div className="px-6 py-5">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
            Key Findings — Sunrise Care Demo
          </p>
          <div className="space-y-2">
            {FINDINGS.map((finding, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={clsx(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5',
                  i < 2 ? 'bg-red-400' : i < 4 ? 'bg-orange-400' : 'bg-yellow-400'
                )} />
                <p className="text-sm text-slate-400">{finding}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
