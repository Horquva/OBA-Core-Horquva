'use client';

import { ScenarioResult, ScenarioType } from '../../lib/simulation';
import { RiskLevel } from '../../types';
import {
  Activity, ArrowRight, ShieldAlert, Info,
  UserMinus, ShieldOff, Cpu, GitBranch,
} from 'lucide-react';

interface Props {
  scenario: ScenarioResult;
}

const riskBadgeClass: Record<RiskLevel, string> = {
  critical: 'risk-critical',
  high:     'risk-high',
  medium:   'risk-medium',
  low:      'risk-low',
};

const typeConfig: Record<ScenarioType, { icon: React.ElementType; verb: string; color: string }> = {
  PERSON_LEAVES:    { icon: UserMinus, verb: 'leaves',       color: 'var(--risk-critical-text)' },
  AGENT_FAILS:      { icon: ShieldOff, verb: 'fails',        color: 'var(--risk-high-text)'     },
  TOOL_UNAVAILABLE: { icon: Cpu,       verb: 'goes offline', color: 'var(--risk-medium-text)'   },
};

// Was a health-score-drop-magnitude banding (>=7/3/1) duplicated verbatim in
// ScenarioRanking.tsx, and less meaningful than what the backend already
// computes -- domain/simulations.js's severityFor() looks at the real
// criticality of the entities impacted, not just how many health points
// moved. Now a lookup on the real scenario.severity value.
const SEVERITY_META: Record<RiskLevel, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'CRITICAL IMPACT', color: 'var(--risk-critical-text)', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.22)' },
  high:     { label: 'HIGH IMPACT',     color: 'var(--risk-high-text)',     bg: 'rgba(234,88,12,0.08)', border: 'rgba(234,88,12,0.22)' },
  medium:   { label: 'MEDIUM IMPACT',   color: 'var(--risk-medium-text)',   bg: 'rgba(202,138,4,0.08)', border: 'rgba(202,138,4,0.22)' },
  low:      { label: 'LOW IMPACT',      color: 'var(--risk-low-text)',      bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.22)' },
};

export function ImpactSummary({ scenario }: Props) {
  const drop = scenario.baselineHealthScore - scenario.simulatedHealthScore;
  const tc = typeConfig[scenario.type];

  const severity = SEVERITY_META[scenario.severity];

  const afterScore = scenario.simulatedHealthScore;
  const afterColor =
    afterScore < 50 ? 'var(--risk-critical-text)' :
    afterScore < 65 ? 'var(--risk-high-text)'     :
    afterScore < 80 ? 'var(--risk-medium-text)'   :
                      'var(--risk-low-text)';

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Health Score Card ──────────────────────────────────── */}
      <div className="card" style={{ 
        padding: '1.5rem', 
        position: 'relative', 
        overflow: 'hidden',
        background: 'var(--bg-elevated)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        {/* Top accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: `linear-gradient(90deg, ${tc.color}, transparent)`,
          opacity: 0.8
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Activity size={15} style={{ color: 'var(--accent)' }} />
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Organizational Health Impact
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              If <strong style={{ color: 'var(--text-primary)' }}>{scenario.targetName}</strong> {tc.verb}
            </p>
          </div>
          <div style={{
            flexShrink: 0,
            padding: '3px 10px', borderRadius: '20px',
            background: severity.bg,
            border: `1px solid ${severity.border}`,
            fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em',
            color: severity.color,
          }}>
            {severity.label}
          </div>
        </div>

        {/* Score visualisation */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: '1.5rem',
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          background: 'var(--bg-hover)',
          border: '1px solid var(--border-default)',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)'
        }}>
          {/* Before */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '4px' }}>BEFORE</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {scenario.baselineHealthScore}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>/100</div>
          </div>

          {/* Arrow */}
          <ArrowRight size={20} style={{ color: 'var(--border-strong)', flexShrink: 0 }} />

          {/* After */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '4px' }}>AFTER</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: afterColor, lineHeight: 1 }}>
              {afterScore}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>/100</div>
          </div>

          {/* Drop */}
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '4px' }}>SCORE DROP</div>
            {drop > 0 ? (
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--risk-critical-text)', lineHeight: 1 }}>
                −{drop}
              </div>
            ) : (
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--risk-low-text)', lineHeight: 1 }}>
                0
              </div>
            )}
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>points</div>
          </div>

          {/* Affected count */}
          <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.25rem' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '4px' }}>AFFECTED</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: tc.color, lineHeight: 1 }}>
              {scenario.impactedAgents.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>agent{scenario.impactedAgents.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      {/* ── Impacted Agents ────────────────────────────────────── */}
      <div className="card" style={{ 
        padding: '1.5rem',
        background: 'var(--bg-elevated)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-default)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ShieldAlert size={15} style={{ color: 'var(--risk-high-text)' }} />
          <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Cascade Victims & Exposed Agents
          </h3>
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: '20px',
            background: 'rgba(234,88,12,0.1)', color: 'var(--risk-high-text)', border: '1px solid rgba(234,88,12,0.22)',
          }}>
            {scenario.impactedAgents.length}
          </span>
        </div>

        {scenario.impactedAgents.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '2rem',
            border: '1px dashed var(--border-default)', borderRadius: '8px',
          }}>
            <Info size={24} style={{ color: 'var(--text-tertiary)', marginBottom: '0.5rem' }} />
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              No agents directly impacted by this scenario.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {scenario.impactedAgents.map((impact, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.875rem 1.25rem',
                  borderRadius: '10px',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-default)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  gap: '0.75rem',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {impact.name}
                  </div>
                </div>

                {/* Risk badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <span
                    className={riskBadgeClass[impact.risk]}
                    style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', padding: '2px 7px', borderRadius: '4px' }}
                  >
                    {impact.risk.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Workflow impact ─────────────────────────────────────── */}
      {scenario.impactedWorkflowNames.length > 0 && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <GitBranch size={15} style={{ color: 'var(--accent)' }} />
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Workflows Using {scenario.targetName}
            </h3>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: '20px',
              background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)',
            }}>
              {scenario.impactedWorkflowNames.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {scenario.impactedWorkflowNames.map(wfId => (
              <span key={wfId} style={{
                fontSize: '0.75rem', fontWeight: 500,
                padding: '4px 10px', borderRadius: '6px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}>
                {wfId}
              </span>
            ))}
          </div>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.77rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            If <strong style={{ color: 'var(--text-primary)' }}>{scenario.targetName}</strong> becomes unavailable, all workflows listed above lose a critical dependency and must fall back to manual processes or alternative tools immediately.
          </p>
        </div>
      )}
    </div>
  );
}
