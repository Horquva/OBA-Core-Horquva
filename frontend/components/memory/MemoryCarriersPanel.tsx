'use client';

import { useState } from 'react';
import { MemoryCarrierProfile, CarrierTier, MemoryStatus } from '../../lib/orgMemory';
import { Users, ChevronDown, ChevronRight, Bot, Workflow, Wrench, AlertTriangle } from 'lucide-react';

interface Props {
  carriers: MemoryCarrierProfile[];
}

const TIER_COLOR: Record<CarrierTier, string> = {
  CRITICAL: 'var(--risk-critical-text)',
  HIGH:     'var(--risk-high-text)',
  MEDIUM:   'var(--risk-medium-text)',
  LOW:      'var(--risk-low-text)',
};
const TIER_BG: Record<CarrierTier, string> = {
  CRITICAL: 'var(--risk-critical-bg)',
  HIGH:     'var(--risk-high-bg)',
  MEDIUM:   'var(--risk-medium-bg)',
  LOW:      'var(--risk-low-bg)',
};
const TIER_BORDER: Record<CarrierTier, string> = {
  CRITICAL: 'var(--risk-critical-border)',
  HIGH:     'var(--risk-high-border)',
  MEDIUM:   'var(--risk-medium-border)',
  LOW:      'var(--risk-low-border)',
};

const STATUS_COLOR: Record<MemoryStatus, string> = {
  PRESERVED:  'var(--risk-low-text)',
  VULNERABLE: 'var(--risk-high-text)',
  AT_RISK:    'var(--risk-medium-text)',
  LOST:       'var(--risk-critical-text)',
};
const STATUS_BG: Record<MemoryStatus, string> = {
  PRESERVED:  'var(--risk-low-bg)',
  VULNERABLE: 'var(--risk-high-bg)',
  AT_RISK:    'var(--risk-medium-bg)',
  LOST:       'var(--risk-critical-bg)',
};
const STATUS_BORDER: Record<MemoryStatus, string> = {
  PRESERVED:  'var(--risk-low-border)',
  VULNERABLE: 'var(--risk-high-border)',
  AT_RISK:    'var(--risk-medium-border)',
  LOST:       'var(--risk-critical-border)',
};

function TypeIcon({ type }: { type: string }) {
  const s = { flexShrink: 0 as const, color: 'var(--text-tertiary)' };
  if (type === 'agent')    return <Bot size={12} style={s} />;
  if (type === 'workflow') return <Workflow size={12} style={s} />;
  return <Wrench size={12} style={s} />;
}

function StatusBar({ preserved, vulnerable, atRisk, lost, total }: {
  preserved: number; vulnerable: number; atRisk: number; lost: number; total: number;
}) {
  if (total === 0) return null;
  const pctP = (preserved / total) * 100;
  const pctV = (vulnerable / total) * 100;
  const pctA = (atRisk / total) * 100;
  const pctL = (lost / total) * 100;

  return (
    <div style={{
      display: 'flex', height: '5px', borderRadius: '9999px', overflow: 'hidden',
      background: 'var(--border-subtle)', width: '100%',
    }}>
      {pctP > 0 && <div style={{ width: `${pctP}%`, background: 'var(--risk-low-text)', opacity: 0.8 }} />}
      {pctV > 0 && <div style={{ width: `${pctV}%`, background: 'var(--risk-high-text)', opacity: 0.8 }} />}
      {pctA > 0 && <div style={{ width: `${pctA}%`, background: 'var(--risk-medium-text)', opacity: 0.8 }} />}
      {pctL > 0 && <div style={{ width: `${pctL}%`, background: 'var(--risk-critical-text)', opacity: 0.8 }} />}
    </div>
  );
}

function CarrierCard({ carrier, defaultOpen }: { carrier: MemoryCarrierProfile; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const tierColor  = TIER_COLOR[carrier.tier];
  const tierBg     = TIER_BG[carrier.tier];
  const tierBorder = TIER_BORDER[carrier.tier];

  return (
    <div
      className="card"
      style={{
        borderRadius: '12px',
        borderLeft: `3px solid ${tierBorder}`,
        overflow: 'hidden',
      }}
    >
      {/* Card header — always visible */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: '16px',
          alignItems: 'center',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Left: tier badge + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '9px',
            background: tierBg, border: `1px solid ${tierBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={16} style={{ color: tierColor }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {carrier.name}
              </span>
              <span style={{
                fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px',
                background: tierBg, color: tierColor, border: `1px solid ${tierBorder}`,
                letterSpacing: '0.08em',
              }}>
                {carrier.tier}
              </span>
              {carrier.isCriticalCarrier && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '3px',
                  fontSize: '10px', fontWeight: 700,
                  color: 'var(--risk-critical-text)',
                }}>
                  <AlertTriangle size={10} />
                  Memory Carrier
                </span>
              )}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
              {carrier.totalOwned} asset{carrier.totalOwned !== 1 ? 's' : ''} owned
              {carrier.undocumentedCount > 0 && ` · ${carrier.undocumentedCount} undocumented`}
              {carrier.noBackupCount > 0 && ` · ${carrier.noBackupCount} no backup`}
            </p>
          </div>
        </div>

        {/* Middle: status breakdown + bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '360px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { label: 'PRESERVED',  count: carrier.preservedCount,  color: 'var(--risk-low-text)' },
              { label: 'VULNERABLE', count: carrier.vulnerableCount, color: 'var(--risk-high-text)' },
              { label: 'AT RISK',    count: carrier.atRiskCount,     color: 'var(--risk-medium-text)' },
              { label: 'LOST',       count: carrier.lostCount,       color: 'var(--risk-critical-text)' },
            ].filter(s => s.count > 0).map(s => (
              <span key={s.label} style={{ fontSize: '11px', color: s.color, fontWeight: 600 }}>
                {s.count} {s.label}
              </span>
            ))}
          </div>
          <StatusBar
            preserved={carrier.preservedCount}
            vulnerable={carrier.vulnerableCount}
            atRisk={carrier.atRiskCount}
            lost={carrier.lostCount}
            total={carrier.totalOwned}
          />
        </div>

        {/* Right: expand toggle */}
        <div style={{ color: 'var(--text-tertiary)' }}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>

      {/* Expanded asset list */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {carrier.assets.map((asset, i) => {
            const sc = STATUS_COLOR[asset.memoryStatus];
            const sb = STATUS_BG[asset.memoryStatus];
            const sbr = STATUS_BORDER[asset.memoryStatus];
            const isLast = i === carrier.assets.length - 1;

            return (
              <div
                key={asset.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 100px 100px 90px 120px',
                  gap: '12px',
                  padding: '10px 20px 10px 28px',
                  borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                  alignItems: 'center',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.015)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <TypeIcon type={asset.type} />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {asset.name}
                  </span>
                </div>

                {/* Type badge */}
                <span style={{
                  fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px',
                  background: 'var(--accent-dim)', color: 'var(--accent)',
                  border: '1px solid var(--accent-border)', width: 'fit-content',
                }}>
                  {asset.type.charAt(0).toUpperCase() + asset.type.slice(1)}
                </span>

                {/* Documented */}
                <span style={{
                  fontSize: '11px', fontWeight: 600,
                  color: asset.documented ? 'var(--risk-low-text)' : 'var(--risk-critical-text)',
                }}>
                  {asset.documented ? '✓ Documented' : '✗ No docs'}
                </span>

                {/* Backup owner */}
                <span style={{ fontSize: '11px', color: asset.backup_owner ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
                  {asset.backup_owner ? `↳ ${asset.backup_owner}` : 'No backup'}
                </span>

                {/* Criticality */}
                <span style={{
                  fontSize: '10px', fontWeight: 700,
                  color: asset.criticality === 'critical' ? 'var(--risk-critical-text)' :
                         asset.criticality === 'high'     ? 'var(--risk-high-text)' :
                         asset.criticality === 'medium'   ? 'var(--risk-medium-text)' :
                                                            'var(--risk-low-text)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {asset.criticality}
                </span>

                {/* Memory status pill */}
                <span style={{
                  fontSize: '10px', fontWeight: 800, padding: '2px 9px', borderRadius: '9999px',
                  background: sb, color: sc, border: `1px solid ${sbr}`,
                  width: 'fit-content', letterSpacing: '0.05em',
                }}>
                  {asset.memoryStatus.replace('_', ' ')}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MemoryCarriersPanel({ carriers }: Props) {
  if (carriers.length === 0) return null;

  const criticalCount = carriers.filter(c => c.tier === 'CRITICAL').length;
  const highCount     = carriers.filter(c => c.tier === 'HIGH').length;

  return (
    <div className="animate-fade-up delay-225">
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Users size={16} style={{ color: 'var(--risk-high-text)' }} />
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Critical Memory Carriers
        </h2>
        {criticalCount > 0 && (
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px',
            background: 'var(--risk-critical-bg)', color: 'var(--risk-critical-text)',
            border: '1px solid var(--risk-critical-border)',
          }}>
            {criticalCount} CRITICAL
          </span>
        )}
        {highCount > 0 && (
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px',
            background: 'var(--risk-high-bg)', color: 'var(--risk-high-text)',
            border: '1px solid var(--risk-high-border)',
          }}>
            {highCount} HIGH
          </span>
        )}
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
          — individuals whose departure would cause irreversible knowledge loss
        </span>
      </div>

      {/* Callout */}
      <div style={{
        padding: '14px 18px', borderRadius: '10px', marginBottom: '16px',
        background: 'rgba(234,88,12,0.07)', border: '1px solid var(--risk-high-border)',
        display: 'flex', alignItems: 'center', gap: '20px',
      }}>
        <div>
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Critical Carriers</p>
          <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--risk-critical-text)', margin: 0 }}>{criticalCount}</p>
        </div>
        <div style={{ width: '1px', height: '36px', background: 'var(--risk-high-border)' }} />
        <div>
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>High Risk</p>
          <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--risk-high-text)', margin: 0 }}>{highCount}</p>
        </div>
        <div style={{ width: '1px', height: '36px', background: 'var(--border-subtle)' }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            These individuals are the <strong style={{ color: 'var(--risk-high-text)' }}>sole holders</strong> of critical organizational knowledge.
            If they leave today, significant portions of your AI infrastructure would be unrecoverable.
          </p>
        </div>
      </div>

      {/* Carrier cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {carriers.map((c, i) => (
          <div
            key={c.name}
            style={{ animation: `fade-up 0.5s cubic-bezier(0.19,1,0.22,1) ${i * 60}ms both` }}
          >
            <CarrierCard
              carrier={c}
              defaultOpen={c.tier === 'CRITICAL' || c.tier === 'HIGH'}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
