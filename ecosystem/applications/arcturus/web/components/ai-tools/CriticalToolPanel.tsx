'use client';

import { ToolRiskProfile } from '../../lib/aiToolIntelligence';
import { ShieldOff, FileX, Cpu, Workflow, Users, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface Props {
  criticalTools: ToolRiskProfile[];
}

const TIER_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  CRITICAL: { text: 'var(--risk-critical-text)', bg: 'var(--risk-critical-bg)', border: 'var(--risk-critical-border)' },
  HIGH:     { text: 'var(--risk-high-text)',      bg: 'var(--risk-high-bg)',      border: 'var(--risk-high-border)' },
  MEDIUM:   { text: 'var(--risk-medium-text)',    bg: 'var(--risk-medium-bg)',    border: 'var(--risk-medium-border)' },
  LOW:      { text: 'var(--risk-low-text)',        bg: 'var(--risk-low-bg)',       border: 'var(--risk-low-border)' },
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'var(--risk-critical-text)'
    : score >= 45 ? 'var(--risk-high-text)'
    : score >= 20 ? 'var(--risk-medium-text)'
    : 'var(--risk-low-text)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        flex: 1, height: '6px', borderRadius: '9999px',
        background: 'var(--border-subtle)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${score}%`,
          background: color, borderRadius: '9999px',
          transition: 'width 0.6s cubic-bezier(0.19,1,0.22,1)',
        }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 700, color, minWidth: '32px', textAlign: 'right' }}>
        {score}
      </span>
    </div>
  );
}

function ToolCard({ profile, index }: { profile: ToolRiskProfile; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const tc = TIER_COLORS[profile.tier];

  return (
    <div
      className="card"
      style={{
        border: `1px solid ${tc.border}`,
        borderRadius: '14px',
        overflow: 'hidden',
        animation: `fade-up 0.55s cubic-bezier(0.19,1,0.22,1) ${index * 100}ms both`,
      }}
    >
      {/* Card header */}
      <div
        style={{
          padding: '20px 24px',
          display: 'flex', alignItems: 'flex-start', gap: '16px',
          cursor: 'pointer', userSelect: 'none',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Tool icon placeholder */}
        <div style={{
          width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
          background: tc.bg, border: `1px solid ${tc.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', fontWeight: 700, color: tc.text,
        }}>
          {profile.tool.name.charAt(0)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {profile.tool.name}
            </span>
            <span style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', padding: '2px 8px',
              borderRadius: '9999px', background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`,
            }}>
              {profile.tier}
            </span>
            {profile.hasNoBackup && (
              <span style={{
                fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px',
                background: 'rgba(239,68,68,0.08)', color: '#f87171',
                border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <ShieldOff size={10} /> No Backup
              </span>
            )}
            {profile.hasNoPolicy && (
              <span style={{
                fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px',
                background: 'rgba(251,146,60,0.08)', color: '#fb923c',
                border: '1px solid rgba(251,146,60,0.2)', display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <FileX size={10} /> No Policy
              </span>
            )}
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
            {profile.tool.vendor} · {profile.tool.category}
          </p>

          <div style={{ marginTop: '12px' }}>
            <ScoreBar score={profile.compositeScore} />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '20px', flexShrink: 0, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {profile.tool.users.length}
            </p>
            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: 0 }}>Users</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {profile.tool.departments.length}
            </p>
            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: 0 }}>Depts</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#a78bfa', margin: 0 }}>
              ${profile.tool.monthly_cost_usd}
            </p>
            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: 0 }}>/ mo</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            style={{
              background: 'transparent', border: '1px solid var(--border-subtle)',
              borderRadius: '8px', padding: '6px', cursor: 'pointer',
              color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center',
            }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '20px 24px',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px',
          background: 'rgba(0,0,0,0.12)',
        }}>
          {/* Risk Factors */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: '0 0 12px' }}>
              Risk Factors
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {profile.factors.map((f, i) => {
                const fc = TIER_COLORS[f.severity.toUpperCase()] || TIER_COLORS.LOW;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', borderRadius: '8px',
                    background: fc.bg, border: `1px solid ${fc.border}`,
                  }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{f.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: fc.text }}>+{f.points}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Affected Workflows */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Workflow size={11} /> Workflows at Risk
            </p>
            {profile.affectedWorkflows.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {profile.affectedWorkflows.map(wf => {
                  const wfc = TIER_COLORS[wf.criticality.toUpperCase()] || TIER_COLORS.LOW;
                  return (
                    <div key={wf.id} style={{
                      padding: '8px 10px', borderRadius: '8px',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{wf.name}</span>
                        <span style={{ fontSize: '10px', color: wfc.text, fontWeight: 600 }}>{wf.criticality.toUpperCase()}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{wf.department}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No direct workflow dependencies</p>
            )}
          </div>

          {/* Agents + Departments */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={11} /> Agents Powered
            </p>
            {profile.affectedAgents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {profile.affectedAgents.map(ag => {
                  const ac = TIER_COLORS[ag.criticality.toUpperCase()] || TIER_COLORS.LOW;
                  return (
                    <div key={ag.id} style={{
                      padding: '8px 10px', borderRadius: '8px',
                      background: 'var(--bg-elevated)', border: `1px solid ${ac.border}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ag.name}</span>
                      <span style={{ fontSize: '10px', color: ac.text, fontWeight: 600 }}>{ag.criticality.toUpperCase()}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic', marginBottom: '16px' }}>No agents powered directly</p>
            )}

            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={11} /> Department Exposure
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {profile.tool.departments.map(d => (
                <span key={d} style={{
                  fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                  background: 'var(--accent-dim)', color: 'var(--accent)',
                  border: '1px solid var(--accent-border)',
                }}>
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CriticalToolPanel({ criticalTools }: Props) {
  if (criticalTools.length === 0) return null;

  return (
    <div className="animate-fade-up delay-150">
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <AlertTriangle size={16} style={{ color: 'var(--risk-critical-text)' }} />
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Critical Risk Tools
        </h2>
        <span style={{
          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px',
          background: 'var(--risk-critical-bg)', color: 'var(--risk-critical-text)',
          border: '1px solid var(--risk-critical-border)',
        }}>
          {criticalTools.length} tool{criticalTools.length > 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {criticalTools.map((p, i) => (
          <ToolCard key={p.tool.id} profile={p} index={i} />
        ))}
      </div>
    </div>
  );
}
