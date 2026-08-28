'use client';

import { OutageImpact } from '../../lib/aiToolIntelligence';
import { Zap, Users, Workflow, Cpu } from 'lucide-react';

interface Props {
  outageImpacts: OutageImpact[];
}

const TIER_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  critical: { text: 'var(--risk-critical-text)', bg: 'var(--risk-critical-bg)', border: 'var(--risk-critical-border)' },
  high:     { text: 'var(--risk-high-text)',      bg: 'var(--risk-high-bg)',      border: 'var(--risk-high-border)' },
  medium:   { text: 'var(--risk-medium-text)',    bg: 'var(--risk-medium-bg)',    border: 'var(--risk-medium-border)' },
  low:      { text: 'var(--risk-low-text)',        bg: 'var(--risk-low-bg)',       border: 'var(--risk-low-border)' },
};

function severityByImpact(impact: OutageImpact): string {
  const total = impact.brokenWorkflows.length + impact.brokenAgents.length;
  if (total >= 5 || impact.brokenWorkflows.some(w => w.criticality === 'critical')) return 'critical';
  if (total >= 3) return 'high';
  if (total >= 1) return 'medium';
  return 'low';
}

export function OutageImpactPanel({ outageImpacts }: Props) {
  // Sort by severity (most impactful first)
  const sorted = [...outageImpacts].sort((a, b) => {
    const score = (x: OutageImpact) => x.brokenWorkflows.length * 3 + x.brokenAgents.length * 2 + x.departmentsHit.length;
    return score(b) - score(a);
  });

  return (
    <div className="animate-fade-up delay-300">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Zap size={16} style={{ color: '#fb923c' }} />
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Outage Impact Simulation
        </h2>
        <span style={{
          fontSize: '11px', color: 'var(--text-tertiary)',
          padding: '2px 8px', borderRadius: '9999px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
        }}>
          If this tool goes offline…
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
        {sorted.map((impact, i) => {
          const sev = severityByImpact(impact);
          const tc = TIER_COLORS[sev];
          const isBlocked = impact.brokenWorkflows.length > 0 || impact.brokenAgents.length > 0;

          return (
            <div
              key={impact.tool.id}
              className="card"
              style={{
                border: `1px solid ${tc.border}`,
                borderRadius: '12px',
                padding: '18px 20px',
                animation: `fade-up 0.5s cubic-bezier(0.19,1,0.22,1) ${i * 80}ms both`,
              }}
            >
              {/* Tool name + tier badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: tc.bg, border: `1px solid ${tc.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, color: tc.text,
                  }}>
                    {impact.tool.name.charAt(0)}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {impact.tool.name}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>
                      {impact.tool.vendor}
                    </p>
                  </div>
                </div>
                {!isBlocked ? (
                  <span style={{ fontSize: '11px', color: 'var(--risk-low-text)', background: 'var(--risk-low-bg)', border: '1px solid var(--risk-low-border)', padding: '3px 8px', borderRadius: '9999px', fontWeight: 600 }}>
                    Contained
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: tc.text, background: tc.bg, border: `1px solid ${tc.border}`, padding: '3px 8px', borderRadius: '9999px', fontWeight: 700 }}>
                    {sev.toUpperCase()} IMPACT
                  </span>
                )}
              </div>

              {/* Impact metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                {[
                  { icon: Workflow, val: impact.brokenWorkflows.length, label: 'Workflows' },
                  { icon: Cpu, val: impact.brokenAgents.length, label: 'Agents' },
                  { icon: Users, val: impact.usersAffected, label: 'Users' },
                ].map(({ icon: Icon, val, label }) => (
                  <div key={label} style={{
                    textAlign: 'center', padding: '8px 4px',
                    background: 'var(--bg-elevated)', borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <Icon size={12} style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }} />
                    <p style={{ fontSize: '15px', fontWeight: 700, color: val === 0 ? 'var(--text-tertiary)' : 'var(--text-primary)', margin: 0 }}>
                      {val}
                    </p>
                    <p style={{ fontSize: '9px', color: 'var(--text-tertiary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Broken workflows list */}
              {impact.brokenWorkflows.length > 0 && (
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>
                    Workflows that break
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {impact.brokenWorkflows.map(wf => {
                      const wfc = TIER_COLORS[wf.criticality] || TIER_COLORS.low;
                      return (
                        <span key={wf.id} style={{
                          fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                          background: wfc.bg, color: wfc.text, border: `1px solid ${wfc.border}`,
                        }}>
                          {wf.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dept hit */}
              {impact.departmentsHit.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: '0 0 6px' }}>
                    Departments hit
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {impact.departmentsHit.map(d => (
                      <span key={d} style={{
                        fontSize: '10px', padding: '2px 7px', borderRadius: '5px',
                        background: 'var(--accent-dim)', color: 'var(--accent)',
                        border: '1px solid var(--accent-border)',
                      }}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!isBlocked && (
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic', marginTop: '8px' }}>
                  No direct workflow or agent dependencies detected.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
