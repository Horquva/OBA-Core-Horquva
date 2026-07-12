"use client";

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Agent } from '../../types';

interface HeatmapProps {
  agents: Agent[];
}

const RISK_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e'
};

export function Heatmap({ agents }: HeatmapProps) {
  const barData = useMemo(() => {
    const deps: Record<string, { name: string; critical: number; high: number; medium: number; low: number }> = {};
    
    agents.forEach(agent => {
      if (!deps[agent.department]) {
        deps[agent.department] = { name: agent.department, critical: 0, high: 0, medium: 0, low: 0 };
      }
      deps[agent.department][agent.criticality] += 1;
    });

    return Object.values(deps).sort((a, b) => 
      (b.critical * 4 + b.high * 3 + b.medium * 2 + b.low) - 
      (a.critical * 4 + a.high * 3 + a.medium * 2 + a.low)
    );
  }, [agents]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#16161c] border border-[#28283a] p-3 rounded-lg shadow-xl text-sm min-w-[150px]">
          <p className="font-medium text-white mb-2">{label} Department</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center space-x-4 mb-1">
              <span style={{ color: entry.color }} className="capitalize">{entry.dataKey} Risk</span>
              <span className="font-semibold text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card p-6 flex flex-col w-full animate-fade-up delay-300">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white">Risk Distribution by Department</h3>
        <p className="text-sm text-slate-400 mt-1">Visual breakdown of critical, high, medium, and low risk agents across organizational units.</p>
      </div>
      
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} maxBarSize={60}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#1f1f29" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#8b8b9e', fontSize: 12 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#8b8b9e', fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1c1c24' }} />
            <Bar dataKey="critical" name="Critical" stackId="a" fill={RISK_COLORS.critical} radius={[0, 0, 0, 0]} />
            <Bar dataKey="high" name="High" stackId="a" fill={RISK_COLORS.high} radius={[0, 0, 0, 0]} />
            <Bar dataKey="medium" name="Medium" stackId="a" fill={RISK_COLORS.medium} radius={[0, 0, 0, 0]} />
            <Bar dataKey="low" name="Low" stackId="a" fill={RISK_COLORS.low} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend — below graph, small and dimmed */}
      <div className="flex items-center justify-center space-x-5 mt-4 opacity-50">
        {Object.entries(RISK_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center space-x-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider capitalize">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
