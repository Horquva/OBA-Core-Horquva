'use client';

import { useState } from 'react';
import { PersonProfile, AssetItem } from '../../lib/knowledgeRisk';
import { UserX, AlertTriangle, Bot, Workflow, Wrench } from 'lucide-react';

interface Props {
  profiles: PersonProfile[];
}

function TypeIcon({ type }: { type: string }) {
  const s = { flexShrink: 0 as const };
  if (type === 'agent')    return <Bot size={12} style={s} />;
  if (type === 'workflow') return <Workflow size={12} style={s} />;
  return <Wrench size={12} style={s} />;
}

const CRIT_COLOR: Record<string, string> = {
  critical: 'var(--risk-critical-text)',
  high:     'var(--risk-high-text)',
  medium:   'var(--risk-medium-text)',
  low:      'var(--risk-low-text)',
};

function ImpactAssetRow({ asset }: { asset: AssetItem }) {
  const color = CRIT_COLOR[asset.criticality] ?? 'var(--text-secondary)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '9px 12px', borderRadius: '8px',
      background: 'rgba(220,38,38,0.05)',
      border: '1px solid var(--risk-critical-border)',
    }}>
      <TypeIcon type={asset.type} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
          {asset.name}
        </p>
        <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
          {asset.department}
        </p>
      </div>
      <span style={{ fontSize: '10px', fontWeight: 700, color, flexShrink: 0, textTransform: 'uppercase' }}>
        {asset.criticality}
      </span>
    </div>
  );
}

export function DepartureSim({ profiles }: Props) {
  const candidates = profiles.filter(p => p.unrecoverableIfLeaves.length > 0);
  const [selected, setSelected] = useState<string>(candidates[0]?.name ?? '');

  const activePerson = profiles.find(p => p.name === selected);

  return (
    <div className="animate-fade-up delay-300">
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <UserX size={16} style={{ color: 'var(--risk-critical-text)' }} />
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Departure Impact Simulator
        </h2>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
          — what becomes permanently unrecoverable if this person leaves today
        </span>
      </div>

      <div className="card" style={{ borderRadius: '14px', overflow: 'hidden' }}>
        {/* Person selector row */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          background: 'rgba(0,0,0,0.12)',
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Simulate departure of:
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {profiles.map(p => {
              const isActive = p.name === selected;
              const color = p.riskTier === 'CRITICAL' ? 'var(--risk-critical-text)'
                : p.riskTier === 'HIGH' ? 'var(--risk-high-text)'
                : p.riskTier === 'MEDIUM' ? 'var(--risk-medium-text)'
                : 'var(--risk-low-text)';
              const bg = p.riskTier === 'CRITICAL' ? 'var(--risk-critical-bg)'
                : p.riskTier === 'HIGH' ? 'var(--risk-high-bg)'
                : p.riskTier === 'MEDIUM' ? 'var(--risk-medium-bg)'
                : 'var(--risk-low-bg)';
              const borderColor = p.riskTier === 'CRITICAL' ? 'var(--risk-critical-border)'
                : p.riskTier === 'HIGH' ? 'var(--risk-high-border)'
                : p.riskTier === 'MEDIUM' ? 'var(--risk-medium-border)'
                : 'var(--risk-low-border)';
              return (
                <button
                  key={p.name}
                  onClick={() => setSelected(p.name)}
                  style={{
                    padding: '6px 14px', borderRadius: '9999px', cursor: 'pointer',
                    fontSize: '13px', fontWeight: isActive ? 700 : 500,
                    color: isActive ? color : 'var(--text-secondary)',
                    background: isActive ? bg : 'transparent',
                    border: isActive ? `1.5px solid ${borderColor}` : '1.5px solid var(--border-subtle)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Impact panel */}
        {activePerson && (
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Left: summary metrics */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: '0 0 16px' }}>
                  Departure Summary
                </p>

                {/* Headline callout */}
                <div style={{
                  padding: '16px 18px', borderRadius: '10px', marginBottom: '16px',
                  background: activePerson.unrecoverableIfLeaves.length > 0
                    ? 'rgba(220,38,38,0.07)'
                    : 'var(--risk-low-bg)',
                  border: activePerson.unrecoverableIfLeaves.length > 0
                    ? '1px solid var(--risk-critical-border)'
                    : '1px solid var(--risk-low-border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <AlertTriangle size={14} style={{
                      color: activePerson.unrecoverableIfLeaves.length > 0
                        ? 'var(--risk-critical-text)'
                        : 'var(--risk-low-text)',
                    }} />
                    <span style={{
                      fontSize: '13px', fontWeight: 700,
                      color: activePerson.unrecoverableIfLeaves.length > 0
                        ? 'var(--risk-critical-text)'
                        : 'var(--risk-low-text)',
                    }}>
                      {activePerson.unrecoverableIfLeaves.length > 0
                        ? `${activePerson.unrecoverableIfLeaves.length} asset${activePerson.unrecoverableIfLeaves.length !== 1 ? 's' : ''} permanently lost`
                        : 'No unrecoverable assets'}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    {activePerson.unrecoverableIfLeaves.length > 0
                      ? `If ${activePerson.name} leaves today, ${activePerson.unrecoverableIfLeaves.length} critical asset${activePerson.unrecoverableIfLeaves.length !== 1 ? 's' : ''} have no documentation and no backup owner — they are permanently unrecoverable.`
                      : `${activePerson.name}'s assets are either documented or have a backup owner — full continuity maintained.`}
                  </p>
                </div>

                {/* Stat grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { label: 'Total Assets Owned', value: activePerson.totalOwned },
                    { label: 'Undocumented', value: activePerson.undocumentedOwned, warn: activePerson.undocumentedOwned > 0 },
                    { label: 'No Backup Owner', value: activePerson.noBackupOwned, warn: activePerson.noBackupOwned > 0 },
                    { label: 'Unrecoverable', value: activePerson.unrecoverableIfLeaves.length, critical: activePerson.unrecoverableIfLeaves.length > 0 },
                  ].map((stat, i) => (
                    <div key={i} style={{
                      padding: '12px 14px', borderRadius: '8px',
                      background: stat.critical
                        ? 'var(--risk-critical-bg)'
                        : stat.warn
                        ? 'var(--risk-high-bg)'
                        : 'var(--bg-elevated)',
                      border: stat.critical
                        ? '1px solid var(--risk-critical-border)'
                        : stat.warn
                        ? '1px solid var(--risk-high-border)'
                        : '1px solid var(--border-subtle)',
                    }}>
                      <p style={{
                        fontSize: '20px', fontWeight: 700, margin: 0,
                        color: stat.critical
                          ? 'var(--risk-critical-text)'
                          : stat.warn
                          ? 'var(--risk-high-text)'
                          : 'var(--text-primary)',
                      }}>
                        {stat.value}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '3px 0 0' }}>
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: unrecoverable assets list */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={11} style={{ color: 'var(--risk-critical-text)' }} />
                  <span style={{ color: 'var(--risk-critical-text)' }}>Assets Lost Forever</span>
                </p>
                {activePerson.unrecoverableIfLeaves.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activePerson.unrecoverableIfLeaves.map(a => (
                      <ImpactAssetRow key={a.id} asset={a} />
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: '20px', borderRadius: '10px', textAlign: 'center',
                    background: 'var(--risk-low-bg)', border: '1px solid var(--risk-low-border)',
                  }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--risk-low-text)', margin: 0 }}>
                      ✓ Full continuity guaranteed
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '6px 0 0' }}>
                      All assets can be recovered via documentation or backup owners
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
