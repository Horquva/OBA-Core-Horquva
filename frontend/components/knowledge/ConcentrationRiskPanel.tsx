'use client';

import { useState } from 'react';
import { PersonProfile } from '../../lib/knowledgeRisk';
import { AlertTriangle, ChevronDown, ChevronUp, FileX, Shield, Bot, Workflow, Wrench } from 'lucide-react';

interface Props {
  profiles: PersonProfile[];
}

const TIER_COLORS = {
  CRITICAL: { text: 'var(--risk-critical-text)', bg: 'var(--risk-critical-bg)', border: 'var(--risk-critical-border)' },
  HIGH:     { text: 'var(--risk-high-text)',      bg: 'var(--risk-high-bg)',     border: 'var(--risk-high-border)' },
  MEDIUM:   { text: 'var(--risk-medium-text)',    bg: 'var(--risk-medium-bg)',   border: 'var(--risk-medium-border)' },
  LOW:      { text: 'var(--risk-low-text)',        bg: 'var(--risk-low-bg)',      border: 'var(--risk-low-border)' },
};

function ConcentrationBar({ score, tier }: { score: number; tier: string }) {
  const tc = TIER_COLORS[tier as keyof typeof TIER_COLORS] ?? TIER_COLORS.LOW;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        flex: 1, height: '6px', borderRadius: '9999px',
        background: 'var(--border-subtle)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${score}%`,
          background: tc.text, borderRadius: '9999px',
          transition: 'width 0.7s cubic-bezier(0.19,1,0.22,1)',
        }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 700, color: tc.text, minWidth: '36px', textAlign: 'right' }}>
        {score}%
      </span>
    </div>
  );
}

function PersonCard({ profile, index }: { profile: PersonProfile; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const tc = TIER_COLORS[profile.riskTier];

  const initials = profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      className="card"
      style={{
        border: `1px solid ${tc.border}`,
        borderRadius: '14px',
        overflow: 'hidden',
        animation: `fade-up 0.55s cubic-bezier(0.19,1,0.22,1) ${index * 90}ms both`,
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
        {/* Avatar */}
        <div style={{
          width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0,
          background: tc.bg, border: `1px solid ${tc.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '15px', fontWeight: 700, color: tc.text,
          letterSpacing: '0.04em',
        }}>
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {profile.name}
            </span>
            <span style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', padding: '2px 8px',
              borderRadius: '9999px', background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`,
            }}>
              {profile.riskTier}
            </span>
            {profile.isSoleHolder && (
              <span style={{
                fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px',
                background: 'rgba(239,68,68,0.08)', color: '#f87171',
                border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <Shield size={10} /> Sole Holder
              </span>
            )}
            {profile.undocumentedOwned > 0 && (
              <span style={{
                fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px',
                background: 'rgba(251,146,60,0.08)', color: '#fb923c',
                border: '1px solid rgba(251,146,60,0.2)', display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <FileX size={10} /> {profile.undocumentedOwned} Undocumented
              </span>
            )}
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
            {profile.totalOwned} asset{profile.totalOwned !== 1 ? 's' : ''} owned ·{' '}
            {profile.ownedAgents.length} agent{profile.ownedAgents.length !== 1 ? 's' : ''} ·{' '}
            {profile.ownedWorkflows.length} workflow{profile.ownedWorkflows.length !== 1 ? 's' : ''} ·{' '}
            {profile.ownedTools.length} tool{profile.ownedTools.length !== 1 ? 's' : ''}
          </p>

          <div style={{ marginTop: '12px' }}>
            <ConcentrationBar score={profile.concentrationScore} tier={profile.riskTier} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '20px', flexShrink: 0, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--risk-critical-text)', margin: 0 }}>
              {profile.unrecoverableIfLeaves.length}
            </p>
            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: 0 }}>Unrecoverable</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {profile.noBackupOwned}
            </p>
            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: 0 }}>No Backup</p>
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
          {/* Agents */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bot size={11} /> Owned Agents
            </p>
            {profile.ownedAgents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {profile.ownedAgents.map(a => {
                  const isUndoc = !a.documented;
                  const noBack = !a.backup_owner;
                  const critColor = a.criticality === 'critical' ? 'var(--risk-critical-text)'
                    : a.criticality === 'high' ? 'var(--risk-high-text)'
                    : a.criticality === 'medium' ? 'var(--risk-medium-text)'
                    : 'var(--risk-low-text)';
                  return (
                    <div key={a.id} style={{
                      padding: '8px 10px', borderRadius: '8px',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{a.name}</span>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: critColor }}>{a.criticality.toUpperCase()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        {isUndoc && <span style={{ fontSize: '9px', color: '#fb923c', background: 'rgba(251,146,60,0.08)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(251,146,60,0.2)' }}>Undocumented</span>}
                        {noBack && <span style={{ fontSize: '9px', color: '#f87171', background: 'rgba(239,68,68,0.08)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.2)' }}>No Backup</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No agents owned</p>
            )}
          </div>

          {/* Workflows */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Workflow size={11} /> Owned Workflows
            </p>
            {profile.ownedWorkflows.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {profile.ownedWorkflows.map(w => {
                  const isUndoc = !w.documented;
                  const noBack = !w.backup_owner;
                  const critColor = w.criticality === 'critical' ? 'var(--risk-critical-text)'
                    : w.criticality === 'high' ? 'var(--risk-high-text)'
                    : w.criticality === 'medium' ? 'var(--risk-medium-text)'
                    : 'var(--risk-low-text)';
                  return (
                    <div key={w.id} style={{
                      padding: '8px 10px', borderRadius: '8px',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{w.name}</span>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: critColor }}>{w.criticality.toUpperCase()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        {isUndoc && <span style={{ fontSize: '9px', color: '#fb923c', background: 'rgba(251,146,60,0.08)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(251,146,60,0.2)' }}>Undocumented</span>}
                        {noBack && <span style={{ fontSize: '9px', color: '#f87171', background: 'rgba(239,68,68,0.08)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.2)' }}>No Backup</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No workflows owned</p>
            )}
          </div>

          {/* Unrecoverable if leaves */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={11} style={{ color: 'var(--risk-critical-text)' }} />
              <span style={{ color: 'var(--risk-critical-text)' }}>Unrecoverable if {profile.name} Leaves</span>
            </p>
            {profile.unrecoverableIfLeaves.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {profile.unrecoverableIfLeaves.map(a => {
                  const critColor = a.criticality === 'critical' ? 'var(--risk-critical-text)'
                    : a.criticality === 'high' ? 'var(--risk-high-text)'
                    : 'var(--risk-medium-text)';
                  const TypeIcon = a.type === 'agent' ? Bot : a.type === 'workflow' ? Workflow : Wrench;
                  return (
                    <div key={a.id} style={{
                      padding: '8px 10px', borderRadius: '8px',
                      background: 'rgba(220,38,38,0.05)',
                      border: '1px solid var(--risk-critical-border)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <TypeIcon size={11} style={{ color: 'var(--risk-critical-text)', flexShrink: 0 }} />
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{a.name}</span>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: critColor }}>{a.criticality.toUpperCase()}</span>
                      </div>
                      <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: '3px 0 0' }}>
                        {a.department}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                padding: '12px 14px', borderRadius: '8px',
                background: 'var(--risk-low-bg)', border: '1px solid var(--risk-low-border)',
              }}>
                <p style={{ fontSize: '12px', color: 'var(--risk-low-text)', margin: 0, fontWeight: 600 }}>
                  ✓ No unrecoverable assets
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '3px 0 0' }}>
                  All assets are documented or have a backup owner
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ConcentrationRiskPanel({ profiles }: Props) {
  const critical = profiles.filter(p => p.riskTier === 'CRITICAL');
  const high = profiles.filter(p => p.riskTier === 'HIGH');
  const rest = profiles.filter(p => p.riskTier === 'MEDIUM' || p.riskTier === 'LOW');

  return (
    <div className="animate-fade-up delay-150">
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <AlertTriangle size={16} style={{ color: 'var(--risk-critical-text)' }} />
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Knowledge Concentration Risk
        </h2>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
          — who holds critical knowledge and what happens if they leave
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {[...critical, ...high, ...rest].map((p, i) => (
          <PersonCard key={p.name} profile={p} index={i} />
        ))}
      </div>
    </div>
  );
}
