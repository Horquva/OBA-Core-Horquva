"use client";

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAgents } from '../../lib/useAgents';

const RISK_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e'
};

interface HeatmapTooltipPayloadEntry {
  color: string;
  dataKey: string;
  value: number;
}

function HeatmapTooltip({ active, payload, label }: { active?: boolean; payload?: HeatmapTooltipPayloadEntry[]; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] p-3 rounded-lg shadow-xl text-sm min-w-[150px]">
        <p className="font-medium text-[color:var(--text-primary)] mb-2">{label} Department</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex justify-between items-center space-x-4 mb-1">
            <span style={{ color: entry.color }} className="capitalize">{entry.dataKey} Risk</span>
            <span className="font-semibold text-[color:var(--text-primary)]">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function Heatmap() {
  const { agents, loading, error } = useAgents();

  const barData = useMemo(() => {
    // This chart visualizes SCORED risk severity only -- an 'unknown'
    // (unscored) agent has no bar series here (F-11) and is deliberately
    // excluded from the stack rather than counted as a fifth, uncolored
    // category; `unknown` still needs a slot on the bucket type so the `in`
    // guard below stays type-safe against the widened RiskLevel.
    const deps: Record<string, { name: string; critical: number; high: number; medium: number; low: number; unknown: number }> = {};
    agents.forEach(agent => {
      if (!deps[agent.department]) {
        deps[agent.department] = { name: agent.department, critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
      }
      if (agent.criticality in deps[agent.department]) {
        deps[agent.department][agent.criticality] += 1;
      }
    });
    return Object.values(deps).sort((a, b) =>
      (b.critical * 4 + b.high * 3 + b.medium * 2 + b.low) -
      (a.critical * 4 + a.high * 3 + a.medium * 2 + a.low)
    );
  }, [agents]);

  return (
    <div className="card p-6 flex flex-col w-full animate-fade-up delay-300">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Risk Distribution by Department</h3>
        <p className="text-sm text-[color:var(--text-secondary)] mt-1">Visual breakdown of critical, high, medium, and low risk agents across organizational units.</p>
      </div>

      {loading && (
        <div className="w-full h-[300px] flex items-center justify-center">
          <div className="space-y-2 w-full animate-pulse">
            <div className="h-[260px] rounded bg-[var(--border-subtle)]" />
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="w-full h-[300px] flex items-center justify-center text-xs text-red-400">
          Could not load agent data — {error}
        </div>
      )}

      {!loading && !error && barData.length === 0 && (
        <div className="w-full h-[300px] flex items-center justify-center text-xs text-[color:var(--text-tertiary)]">
          No agent data available
        </div>
      )}

      {!loading && !error && barData.length > 0 && (
        <div className="w-full h-[300px] min-h-0 min-w-0">
          <ResponsiveContainer width="100%" height={300} minHeight={0}>
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} maxBarSize={60}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-subtle)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8b8b9e', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b8b9e', fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<HeatmapTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
              <Bar dataKey="critical" name="Critical" stackId="a" fill={RISK_COLORS.critical} radius={[0, 0, 0, 0]} />
              <Bar dataKey="high" name="High" stackId="a" fill={RISK_COLORS.high} radius={[0, 0, 0, 0]} />
              <Bar dataKey="medium" name="Medium" stackId="a" fill={RISK_COLORS.medium} radius={[0, 0, 0, 0]} />
              <Bar dataKey="low" name="Low" stackId="a" fill={RISK_COLORS.low} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center space-x-5 mt-4 opacity-50">
        {Object.entries(RISK_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center space-x-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-medium text-[color:var(--text-secondary)] uppercase tracking-wider capitalize">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
