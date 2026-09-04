'use client';

import { useState, useMemo } from 'react';
import { ScenarioResult } from '../../lib/simulation';
import { ScenarioRanking } from './ScenarioRanking';
import { ImpactSummary } from './ImpactSummary';
import {
  Activity, Beaker, UserMinus, ShieldOff, Cpu, Flame,
} from 'lucide-react';

interface Props {
  scenarios: ScenarioResult[];
}

export function SimulationDashboard({ scenarios }: Props) {
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  const baselineHealthScore = scenarios[0]?.baselineHealthScore ?? 0;

  const worstScenario = scenarios[0] ?? null;

  const activeScenario = useMemo(
    () => scenarios.find(s => s.id === activeScenarioId) ?? null,
    [scenarios, activeScenarioId]
  );

  // KPI counts
  const personScenarios = scenarios.filter(s => s.type === 'PERSON_LEAVES').length;
  const agentScenarios  = scenarios.filter(s => s.type === 'AGENT_FAILS').length;
  const toolScenarios   = scenarios.filter(s => s.type === 'TOOL_UNAVAILABLE').length;

  const baselineColor =
    baselineHealthScore < 50 ? 'var(--risk-critical-text)' :
    baselineHealthScore < 65 ? 'var(--risk-high-text)'     :
    baselineHealthScore < 80 ? 'var(--risk-medium-text)'   :
                               'var(--risk-low-text)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>

      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', flexShrink: 0 }}>
        <div>

          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Continuity Intelligence
          </h1>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Simulate employee departures, agent failures, and AI tool outages. See the live health score impact.
          </p>
        </div>

        {/* Baseline health pill */}
        <div className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
          <Activity size={15} style={{ color: baselineColor }} />
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.08em' }}>BASELINE HEALTH</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {baselineHealthScore} <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI strip ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', flexShrink: 0 }}>
        {[
          { icon: UserMinus, label: 'Employee Scenarios', value: personScenarios, color: 'var(--risk-critical-text)' },
          { icon: ShieldOff, label: 'Agent Scenarios',    value: agentScenarios,  color: 'var(--risk-high-text)'     },
          { icon: Cpu,       label: 'Tool Scenarios',     value: toolScenarios,   color: 'var(--risk-medium-text)'   },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card" style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
              background: `color-mix(in srgb, ${color} 10%, transparent)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Most dangerous scenario callout ─────────────────── */}
      {worstScenario && (() => {
        const drop = worstScenario.baselineHealthScore - worstScenario.simulatedHealthScore;
        return (
          <div style={{
            flexShrink: 0,
            padding: '0.875rem 1.125rem',
            borderRadius: '10px',
            background: 'var(--bg-elevated)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-default)',
            borderLeft: '3px solid rgba(220,38,38,0.6)',
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-default)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Flame size={14} style={{ color: 'var(--risk-critical-text)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                fontSize: '0.65rem', 
                fontWeight: 700, 
                letterSpacing: '0.08em', 
                color: 'var(--text-secondary)', 
                textTransform: 'uppercase',
                paddingRight: '0.75rem',
                borderRight: '1px solid var(--border-subtle)'
              }}>
                Top Risk
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                If <strong style={{ color: 'var(--text-primary)' }}>{worstScenario.targetName}</strong> {worstScenario.type === 'PERSON_LEAVES' ? 'leaves' : worstScenario.type === 'AGENT_FAILS' ? 'fails' : 'goes offline'}, 
                the Health Score drops by <strong style={{ color: 'var(--risk-critical-text)' }}>{drop} points</strong>, impacting {worstScenario.impactedAgents.length} agent{worstScenario.impactedAgents.length !== 1 ? 's' : ''}.
              </div>
            </div>
            <button
              onClick={() => setActiveScenarioId(worstScenario.id)}
              style={{
                flexShrink: 0,
                padding: '6px 14px', borderRadius: '6px',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                fontSize: '0.72rem', fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--border-subtle)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
              }}
            >
              Simulate
            </button>
          </div>
        );
      })()}

      {/* ── Main two-column layout ───────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: '1rem',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {/* Left: scenario list */}
        <div style={{ overflow: 'hidden' }}>
          <ScenarioRanking
            scenarios={scenarios}
            activeScenarioId={activeScenarioId}
            onSelectScenario={s => setActiveScenarioId(s.id)}
          />
        </div>

        {/* Right: detail panel */}
        <div style={{ overflowY: 'auto', paddingRight: '2px', paddingBottom: '1rem' }}>
          {activeScenario ? (
            <ImpactSummary scenario={activeScenario} />
          ) : (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              padding: '3rem',
              border: '1px dashed var(--border-default)',
              borderRadius: '16px',
              background: 'var(--bg-surface)',
              backdropFilter: 'blur(12px)',
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))',
                border: '1px solid rgba(99,102,241,0.3)',
                boxShadow: '0 0 20px rgba(99,102,241,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.25rem',
              }}>
                <Beaker size={28} style={{ color: 'var(--accent)' }} />
              </div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Ready for Simulation
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '320px', lineHeight: 1.6 }}>
                Select any scenario from the left panel — employee departures, agent failures, or AI tool outages — to see the exact health score impact and cascade victims.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
