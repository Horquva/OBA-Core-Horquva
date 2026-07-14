'use client';

import { ToolRiskProfile } from '../../lib/aiToolIntelligence';
import { ShieldOff, FileX } from 'lucide-react';

interface Props {
  tools: ToolRiskProfile[];
  title: string;
  subtitle: string;
  tier: 'HIGH' | 'MEDIUM' | 'LOW';
}

const TIER_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  HIGH:   { text: 'var(--risk-high-text)',   bg: 'var(--risk-high-bg)',   border: 'var(--risk-high-border)' },
  MEDIUM: { text: 'var(--risk-medium-text)', bg: 'var(--risk-medium-bg)', border: 'var(--risk-medium-border)' },
  LOW:    { text: 'var(--risk-low-text)',     bg: 'var(--risk-low-bg)',    border: 'var(--risk-low-border)' },
};

function ScoreBar({ score, tier }: { score: number; tier: string }) {
  const color = TIER_COLORS[tier]?.text || 'var(--text-tertiary)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '4px', borderRadius: '9999px', background: 'var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: '9999px' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, color, minWidth: '28px', textAlign: 'right' }}>{score}</span>
    </div>
  );
}

export function ToolRiskTable({ tools, title, subtitle, tier }: Props) {
  if (tools.length === 0) return null;
  const tc = TIER_COLORS[tier];

  return (
    <div className="card animate-fade-up delay-225" style={{ borderRadius: '14px', overflow: 'hidden' }}>
      {/* Table header */}
      <div style={{
        padding: '18px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {title}
            </h2>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px',
              background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`,
            }}>
              {tools.length}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '4px 0 0' }}>{subtitle}</p>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Tool', 'Vendor', 'Category', 'Risk Score', 'Users', 'Depts', 'Monthly Cost', 'Flags', 'Access Owner'].map(h => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: 'left',
                  fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--text-tertiary)', whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tools.map((profile, i) => (
              <tr
                key={profile.tool.id}
                style={{
                  borderBottom: i < tools.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
                      background: tc.bg, border: `1px solid ${tc.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700, color: tc.text,
                    }}>
                      {profile.tool.name.charAt(0)}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {profile.tool.name}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{profile.tool.vendor}</span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{
                    fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                    background: 'var(--accent-dim)', color: 'var(--accent)',
                    border: '1px solid var(--accent-border)',
                  }}>
                    {profile.tool.category}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', minWidth: '140px' }}>
                  <ScoreBar score={profile.compositeScore} tier={tier} />
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {profile.tool.users.length}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {profile.tool.departments.length}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#a78bfa' }}>
                    ${profile.tool.monthly_cost_usd}/mo
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {profile.hasNoBackup && (
                      <span title="No backup tool" style={{
                        padding: '3px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px',
                        background: 'var(--risk-critical-bg)', border: '1px solid var(--risk-critical-border)',
                        fontSize: '10px', color: 'var(--risk-critical-text)',
                      }}>
                        <ShieldOff size={9} /> No Backup
                      </span>
                    )}
                    {profile.hasNoPolicy && (
                      <span title="No policy" style={{
                        padding: '3px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px',
                        background: 'var(--risk-high-bg)', border: '1px solid var(--risk-high-border)',
                        fontSize: '10px', color: 'var(--risk-high-text)',
                      }}>
                        <FileX size={9} /> No Policy
                      </span>
                    )}
                    {!profile.hasNoBackup && !profile.hasNoPolicy && (
                      <span style={{ fontSize: '11px', color: 'var(--risk-low-text)' }}>—</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {profile.tool.access_owner}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
