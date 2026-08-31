'use client';

import { RecommendationEngineOutput } from '../../lib/recommendations';
import { Building2, Star, TrendingUp, AlertTriangle, Users, Shield } from 'lucide-react';

interface Props {
  output: RecommendationEngineOutput;
  company: string;
  agentCount: number;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const filled = (score / 100) * circ;
  const color = score < 60 ? 'var(--risk-critical-text)' : score < 75 ? 'var(--risk-high-text)' : 'var(--risk-low-text)';

  return (
    <div style={{ position: 'relative', width: '108px', height: '108px', flexShrink: 0 }}>
      <svg width="108" height="108" viewBox="0 0 108 108" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx="54" cy="54" r={radius} fill="none" stroke="var(--border-default)" strokeWidth="8" />
        {/* Progress */}
        <circle
          cx="54" cy="54" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}60)`, transition: 'stroke-dasharray 1s cubic-bezier(0.19,1,0.22,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>/100</span>
      </div>
    </div>
  );
}

interface FindingItem {
  icon: React.ElementType;
  color: string;
  text: string;
}

export default function DemoSummary({ output, company, agentCount }: Props) {
  const { healthScore, criticalCount, highCount, mediumCount, ownerConcentrationWarning, orphanedAgentCount, undocumentedCriticalCount } = output;

  const statusLabel = healthScore < 60 ? 'AT RISK' : healthScore < 75 ? 'CAUTION' : 'HEALTHY';
  const statusColor = healthScore < 60 ? 'var(--risk-critical-text)' : healthScore < 75 ? 'var(--risk-high-text)' : 'var(--risk-low-text)';

  const findings: FindingItem[] = [
    orphanedAgentCount > 0
      ? { icon: AlertTriangle, color: 'var(--risk-critical-text)', text: `${orphanedAgentCount} agent${orphanedAgentCount > 1 ? 's' : ''} are completely unowned — ghost agents with no accountability` }
      : { icon: Shield, color: 'var(--risk-low-text)', text: 'All agents have at least one owner assigned' },
    ownerConcentrationWarning
      ? { icon: Users, color: 'var(--risk-critical-text)', text: `${ownerConcentrationWarning.owner} owns ${ownerConcentrationWarning.agentCount} agents — catastrophic single-owner dependency` }
      : { icon: Users, color: 'var(--risk-low-text)', text: 'Ownership is well-distributed across personnel' },
    undocumentedCriticalCount > 0
      ? { icon: AlertTriangle, color: 'var(--risk-high-text)', text: `${undocumentedCriticalCount} CRITICAL/HIGH agent${undocumentedCriticalCount > 1 ? 's are' : ' is'} undocumented — zero recovery path exists` }
      : { icon: Shield, color: 'var(--risk-low-text)', text: 'All critical agents have documentation coverage' },
    { icon: TrendingUp, color: healthScore < 60 ? 'var(--risk-critical-text)' : 'var(--risk-medium-text)', text: `Organizational Health Score: ${healthScore}/100 — ${healthScore < 60 ? 'immediate intervention required' : 'recovery plan in progress'}` },
    { icon: Star, color: 'var(--accent)', text: `${output.recommendations.length} prioritized recommendations generated: ${criticalCount} CRITICAL · ${highCount} HIGH · ${mediumCount} MEDIUM` },
  ];

  const recoverySteps = [
    ownerConcentrationWarning
      ? `Redistribute ${ownerConcentrationWarning.owner}'s agents — target ≤3 per owner`
      : 'Maintain current ownership distribution',
    `Assign owners to all ${orphanedAgentCount} orphaned agents`,
    'Document all CRITICAL & HIGH agents (target: 100% coverage)',
    'Designate backup owners for all single-owner agents',
    'Establish fallback tools for every CRITICAL AI dependency',
    'Reassess Organizational Health Score in 30 days — target 75+',
  ];

  return (
    <div className="card animate-fade-up delay-400" style={{ padding: '1.75rem' }}>
      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
        <Building2 size={14} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase' }}>
          Demo Summary — Stakeholder Presentation
        </span>
      </div>

      {/* Hero row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1.75rem',
        padding: '1.25rem 1.5rem',
        borderRadius: '10px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}>
        <ScoreRing score={healthScore} />
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{
              fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em',
              padding: '2px 8px', borderRadius: '4px',
              background: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
              color: statusColor, border: `1px solid color-mix(in srgb, ${statusColor} 22%, transparent)`,
            }}>
              {statusLabel}
            </span>
          </div>
          <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {company} AI Workforce
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {agentCount} agents analysed · {criticalCount + highCount} urgent issues identified ·{' '}
            {output.recommendations.length} targeted actions ready for execution
          </p>
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Critical', value: criticalCount, color: 'var(--risk-critical-text)', bg: 'rgba(220,38,38,0.08)' },
            { label: 'High',     value: highCount,     color: 'var(--risk-high-text)',     bg: 'rgba(234,88,12,0.08)' },
            { label: 'Medium',   value: mediumCount,   color: 'var(--risk-medium-text)',   bg: 'rgba(202,138,4,0.08)' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{
              padding: '0.5rem 0.875rem', borderRadius: '8px', background: bg,
              textAlign: 'center', minWidth: '58px',
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600, marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two column: key findings + recovery plan */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Key findings */}
        <div>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Key Findings
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {findings.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                  <div style={{
                    flexShrink: 0,
                    width: '20px', height: '20px', borderRadius: '5px',
                    background: `color-mix(in srgb, ${f.color} 10%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: '1px',
                  }}>
                    <Icon size={11} style={{ color: f.color }} />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {f.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recovery plan */}
        <div>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            30-Day Recovery Plan
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recoverySteps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                <div style={{
                  flexShrink: 0,
                  width: '18px', height: '18px', borderRadius: '4px',
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid var(--accent-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', fontWeight: 700, color: 'var(--accent)',
                  marginTop: '1px',
                }}>
                  {i + 1}
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div style={{
        marginTop: '1.25rem',
        padding: '0.75rem 1rem',
        borderRadius: '7px',
        background: 'rgba(99,102,241,0.05)',
        border: '1px solid var(--accent-border)',
        display: 'flex', alignItems: 'center', gap: '0.625rem',
      }}>
        <Star size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '0.77rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-primary)' }}>OBA Core — Horquva Recommendation Engine</strong>
          {' '}automatically reads risk output for every agent, generates targeted recovery actions, and ranks
          them from CRITICAL → HIGH → MEDIUM to surface the most dangerous points of failure first.
        </p>
      </div>
    </div>
  );
}
