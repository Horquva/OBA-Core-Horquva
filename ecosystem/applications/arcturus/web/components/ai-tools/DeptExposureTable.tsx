'use client';

import { DeptExposure } from '../../lib/aiToolIntelligence';
import { Building2, DollarSign } from 'lucide-react';

interface Props {
  deptExposure: DeptExposure[];
  totalMonthlySpend: number;
}

export function DeptExposureTable({ deptExposure, totalMonthlySpend }: Props) {
  const maxSpend = Math.max(...deptExposure.map(d => d.monthlySpend));

  return (
    <div className="card animate-fade-up delay-400" style={{ borderRadius: '14px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '18px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building2 size={16} style={{ color: 'var(--text-tertiary)' }} />
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Department-Level AI Exposure
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '3px 0 0' }}>
              Tool penetration and estimated spend by department
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={14} style={{ color: '#a78bfa' }} />
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#a78bfa' }}>
              ${totalMonthlySpend.toLocaleString()}
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
            Total monthly AI spend
          </p>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Department', 'Tools in Use', 'Tool Count', 'High-Risk Tools', 'Est. Monthly Spend', 'Spend Share'].map(h => (
                <th key={h} style={{
                  padding: '10px 18px', textAlign: 'left',
                  fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--text-tertiary)', whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deptExposure.map((dept, i) => {
              const spendPercent = Math.round((dept.monthlySpend / maxSpend) * 100);
              const isHighRisk = dept.criticalToolCount >= 2;
              return (
                <tr
                  key={dept.department}
                  style={{
                    borderBottom: i < deptExposure.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '7px',
                        background: isHighRisk ? 'var(--risk-high-bg)' : 'var(--accent-dim)',
                        border: `1px solid ${isHighRisk ? 'var(--risk-high-border)' : 'var(--accent-border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 700,
                        color: isHighRisk ? 'var(--risk-high-text)' : 'var(--accent)',
                      }}>
                        {dept.department.charAt(0)}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {dept.department}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {dept.tools.map(t => (
                        <span key={t} style={{
                          fontSize: '11px', padding: '2px 7px', borderRadius: '5px',
                          background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                          border: '1px solid var(--border-default)',
                        }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {dept.toolCount}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: 700,
                      color: dept.criticalToolCount >= 2
                        ? 'var(--risk-high-text)'
                        : dept.criticalToolCount === 1
                        ? 'var(--risk-medium-text)'
                        : 'var(--risk-low-text)',
                    }}>
                      {dept.criticalToolCount}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#a78bfa' }}>
                      ${dept.monthlySpend}/mo
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', minWidth: '140px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        flex: 1, height: '5px', borderRadius: '9999px',
                        background: 'var(--border-subtle)', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', width: `${spendPercent}%`,
                          background: 'linear-gradient(90deg, #a78bfa, #818cf8)',
                          borderRadius: '9999px',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', minWidth: '32px', textAlign: 'right' }}>
                        {spendPercent}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
