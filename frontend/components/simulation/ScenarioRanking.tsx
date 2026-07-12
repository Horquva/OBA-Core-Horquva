'use client';

import { ScenarioResult, ScenarioType } from '../../lib/simulation';
import { UserMinus, ShieldOff, Cpu, AlertTriangle, Flame } from 'lucide-react';

interface Props {
  scenarios: ScenarioResult[];
  activeScenarioId: string | null;
  onSelectScenario: (scenario: ScenarioResult) => void;
}

const typeConfig: Record<ScenarioType, { icon: React.ElementType; label: string; color: string }> = {
  PERSON_LEAVES:    { icon: UserMinus, label: 'Employee Leaves', color: 'var(--risk-critical-text)' },
  AGENT_FAILS:      { icon: ShieldOff, label: 'Agent Fails',     color: 'var(--risk-high-text)'     },
  TOOL_UNAVAILABLE: { icon: Cpu,       label: 'Tool Down',       color: 'var(--risk-medium-text)'   },
};

function dropSeverity(drop: number): { label: string; color: string; bg: string } {
  if (drop >= 7)  return { label: 'CRITICAL IMPACT', color: 'var(--risk-critical-text)', bg: 'rgba(220,38,38,0.08)' };
  if (drop >= 3)  return { label: 'HIGH IMPACT',     color: 'var(--risk-high-text)',     bg: 'rgba(234,88,12,0.08)' };
  if (drop >= 1)  return { label: 'MEDIUM IMPACT',   color: 'var(--risk-medium-text)',   bg: 'rgba(202,138,4,0.08)' };
  return             { label: 'LOW IMPACT',      color: 'var(--risk-low-text)',      bg: 'rgba(22,163,74,0.08)'  };
}

// Group scenarios by type for the section headers
type GroupKey = 'PERSON_LEAVES' | 'AGENT_FAILS' | 'TOOL_UNAVAILABLE';
const GROUP_ORDER: GroupKey[] = ['PERSON_LEAVES', 'AGENT_FAILS', 'TOOL_UNAVAILABLE'];
const GROUP_LABELS: Record<GroupKey, string> = {
  PERSON_LEAVES:    'If an Employee Leaves',
  AGENT_FAILS:      'If an Agent Fails',
  TOOL_UNAVAILABLE: 'If an AI Tool Goes Down',
};

export function ScenarioRanking({ scenarios, activeScenarioId, onSelectScenario }: Props) {
  // Already sorted by worst impact from rankScenarios()
  const worstId = scenarios[0]?.id;

  const byGroup: Record<GroupKey, ScenarioResult[]> = {
    PERSON_LEAVES: [],
    AGENT_FAILS: [],
    TOOL_UNAVAILABLE: [],
  };
  scenarios.forEach(s => byGroup[s.type as GroupKey].push(s));

  return (
    <div className="card" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <AlertTriangle size={15} style={{ color: 'var(--risk-critical-text)' }} />
          <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            All Scenarios
          </h3>
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: '20px',
            background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)',
          }}>
            {scenarios.length}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
          Sorted by worst impact first
        </p>
      </div>

      {/* Grouped list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {GROUP_ORDER.map(group => {
          const items = byGroup[group];
          if (items.length === 0) return null;
          const tc = typeConfig[group];
          const Icon = tc.icon;

          return (
            <div key={group}>
              {/* Section label */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                marginBottom: '0.5rem',
                paddingBottom: '0.375rem',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <Icon size={11} style={{ color: tc.color }} />
                <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  {GROUP_LABELS[group]}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {items.map(scenario => {
                  const isActive = scenario.id === activeScenarioId;
                  const isWorst = scenario.id === worstId;
                  const drop = scenario.baselineHealthScore - scenario.simulatedHealthScore;
                  const sev = dropSeverity(drop);

                  return (
                    <button
                      key={scenario.id}
                      onClick={() => onSelectScenario(scenario)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.625rem 0.75rem',
                        borderRadius: '8px',
                        border: isActive
                          ? '1px solid rgba(220,38,38,0.4)'
                          : '1px solid rgba(255,255,255,0.03)',
                        background: isActive
                          ? 'linear-gradient(135deg, rgba(220,38,38,0.1), rgba(220,38,38,0.02))'
                          : 'rgba(255,255,255,0.02)',
                        boxShadow: isActive ? '0 4px 16px rgba(220,38,38,0.15)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.03)';
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.02)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isActive ? 'var(--text-primary)' : 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {scenario.targetName}
                        </span>
                        {isWorst && (
                          <span style={{
                            flexShrink: 0,
                            marginLeft: '0.375rem',
                            fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em',
                            padding: '1px 5px', borderRadius: '3px',
                            background: 'rgba(220,38,38,0.15)',
                            color: 'var(--risk-critical-text)',
                            border: '1px solid rgba(220,38,38,0.25)',
                          }}>
                            #1 DANGER
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                          {scenario.impactedAgents.length} agent{scenario.impactedAgents.length !== 1 ? 's' : ''} affected
                        </span>
                        {drop > 0 ? (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: sev.color }}>
                            −{drop} pts
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>no change</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
