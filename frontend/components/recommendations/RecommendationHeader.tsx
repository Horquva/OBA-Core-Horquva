'use client';

import { RecommendationEngineOutput } from '../../lib/recommendations';
import { AlertTriangle, Flame, ShieldAlert, TrendingUp } from 'lucide-react';

interface Props {
  output: RecommendationEngineOutput;
}

const KPI_CONFIG = [
  {
    key: 'healthScore',
    label: 'Health Score',
    icon: TrendingUp,
    suffix: '/100',
    colorFn: (v: number) => v < 60 ? 'var(--risk-critical-text)' : v < 75 ? 'var(--risk-high-text)' : 'var(--risk-low-text)',
  },
  {
    key: 'criticalCount',
    label: 'Critical Actions',
    icon: Flame,
    color: 'var(--risk-critical-text)',
  },
  {
    key: 'highCount',
    label: 'High Priority',
    icon: AlertTriangle,
    color: 'var(--risk-high-text)',
  },
  {
    key: 'mediumCount',
    label: 'Medium Priority',
    icon: ShieldAlert,
    color: 'var(--risk-medium-text)',
  },
];

export default function RecommendationHeader({ output }: Props) {
  const values: Record<string, number> = {
    healthScore: output.healthScore,
    criticalCount: output.criticalCount,
    highCount: output.highCount,
    mediumCount: output.mediumCount,
  };

  return (
    <div className="animate-fade-up">
      {/* Page title */}
      <div style={{ marginBottom: '1.5rem' }}>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Prioritized Recovery Plan
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          {output.recommendations.length} actionable recommendations generated from risk analysis · Sunrise Care Demo
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        {KPI_CONFIG.map(({ key, label, icon: Icon, suffix, color, colorFn }, i) => {
          const val = values[key];
          const resolvedColor = colorFn ? colorFn(val) : color!;
          return (
            <div
              key={key}
              className="card animate-fade-up"
              style={{
                padding: '1.125rem 1.25rem',
                animationDelay: `${i * 75}ms`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Subtle glow accent */}
              <div style={{
                position: 'absolute',
                top: 0, right: 0,
                width: '60px', height: '60px',
                background: resolvedColor,
                opacity: 0.04,
                borderRadius: '50%',
                transform: 'translate(20px, -20px)',
                pointerEvents: 'none',
              }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.04em' }}>
                  {label}
                </span>
                <div style={{
                  width: '28px', height: '28px',
                  borderRadius: '7px',
                  background: `color-mix(in srgb, ${resolvedColor} 12%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={13} style={{ color: resolvedColor }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {val}
                </span>
                {suffix && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                    {suffix}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
