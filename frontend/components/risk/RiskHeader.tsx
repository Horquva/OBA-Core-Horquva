'use client';

import { RiskIntelligenceReport } from '../../lib/riskIntelligence';
import { ShieldAlert, AlertTriangle, Activity, Users } from 'lucide-react';
import clsx from 'clsx';
import { EvidenceBadge } from '../ui/EvidenceBadge';

interface RiskHeaderProps {
  report: RiskIntelligenceReport;
}

export function RiskHeader({ report }: RiskHeaderProps) {
  const { organizationalHealthScore: ohs, healthStatus, criticalAgents, highAgents, totalAgents, orphanedCount } = report;

  const ohsColor =
    (ohs ?? 0) >= 75 ? { text: 'text-emerald-400', ring: 'stroke-emerald-400', glow: 'rgba(52,211,153,0.3)' } :
    (ohs ?? 0) >= 50 ? { text: 'text-yellow-400',  ring: 'stroke-yellow-400',  glow: 'rgba(250,204,21,0.3)' } :
                { text: 'text-red-400',     ring: 'stroke-red-400',     glow: 'rgba(248,113,113,0.3)' };

  // SVG gauge
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const filled = circ * ((ohs ?? 0) / 100);
  const gap = circ - filled;

  const stats = [
    {
      label: 'Total Agents',
      value: totalAgents,
      icon: <Activity className="w-4 h-4" />,
      color: 'text-indigo-400',
      bg: 'bg-[var(--bg-hover)] border-[var(--border-default)]',
    },
    {
      label: 'Critical Risk',
      value: criticalAgents.length,
      icon: <ShieldAlert className="w-4 h-4" />,
      color: 'text-red-400',
      bg: 'bg-[var(--bg-hover)] border-[var(--border-default)]',
    },
    {
      label: 'High Risk',
      value: highAgents.length,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'text-orange-400',
      bg: 'bg-[var(--bg-hover)] border-[var(--border-default)]',
    },
    {
      label: 'Orphaned Agents',
      value: orphanedCount,
      icon: <Users className="w-4 h-4" />,
      color: 'text-amber-400',
      bg: 'bg-[var(--bg-hover)] border-[var(--border-default)]',
    },

  ];

  return (
    <div className="animate-fade-up">
      {/* Title */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)] tracking-tight">Risk Intelligence</h1>
        </div>
        <p className="text-[color:var(--text-secondary)] text-sm">
          Fused ownership + dependency risk scores per agent — with CRITICAL detection and Organizational Health scoring.
        </p>
      </div>

      {/* OHS + Stat Grid */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* OHS Card */}
        <div className="card px-8 py-7 flex flex-col items-center justify-center xl:w-[320px] flex-shrink-0 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, ${ohsColor.glow}, transparent 70%)`,
            }}
          />
          <p className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)] font-semibold mb-4">
            Org Health Score
          </p>

          {report.evidence.status === 'insufficient_evidence' ? (
            <EvidenceBadge evidence={report.evidence} />
          ) : (
            <>
              {/* SVG Gauge */}
              <div className="relative flex items-center justify-center mb-4">
                <svg width={110} height={110} viewBox="0 0 110 110">
                  {/* Track */}
                  <circle
                    cx={55} cy={55} r={radius}
                    fill="none"
                    stroke="var(--border-subtle)"
                    strokeWidth={8}
                  />
                  {/* Filled arc */}
                  <circle
                    cx={55} cy={55} r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={8}
                    strokeDasharray={`${filled} ${gap}`}
                    strokeLinecap="round"
                    transform="rotate(-90 55 55)"
                    className={clsx(ohsColor.text, 'transition-all duration-1000')}
                    style={{ filter: `drop-shadow(0 0 6px ${ohsColor.glow})` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={clsx('text-3xl font-bold tracking-tight animate-count-up', ohsColor.text)}>
                    {ohs}
                  </span>
                  <span className="text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-wider">/ 100</span>
                </div>
              </div>

              <p className={clsx('text-xs font-semibold uppercase tracking-widest', ohsColor.text)}>
                {healthStatus === 'HEALTHY' ? 'Healthy' : healthStatus === 'AT_RISK' ? 'At Risk' : 'Critical State'}
              </p>
              <p className="text-[10px] text-[color:var(--text-tertiary)] mt-1 text-center">Lower = more dangerous</p>
            </>
          )}
        </div>

        {/* Stats — 2×2 grid */}
        <div className="grid grid-cols-2 gap-4 flex-grow">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={clsx(
                'card px-5 py-5 flex flex-col gap-3 animate-fade-up',
                `delay-${75 + i * 75}`
              )}
            >
              <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center border', stat.bg, stat.color)}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-[color:var(--text-primary)] tracking-tight">{stat.value}</p>
                <p className="text-[11px] text-[color:var(--text-tertiary)] mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
