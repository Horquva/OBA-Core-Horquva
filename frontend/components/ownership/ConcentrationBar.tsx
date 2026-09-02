"use client";

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Agent } from '../../types';

interface ConcentrationBarProps {
  agents: Agent[];
}

interface TooltipPayloadEntry {
  color: string;
  name: string;
  value: number;
}

function ConcentrationTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry) => sum + entry.value, 0);
    return (
      <div className="bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-default)] p-4 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] text-sm min-w-[200px]">
        <div className="flex items-center space-x-3 mb-3 pb-3 border-b border-[var(--border-subtle)]">
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-hover)] flex items-center justify-center border border-[var(--border-default)] text-[color:var(--text-primary)] font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            {label?.charAt(0)}
          </div>
          <p className="font-semibold text-[color:var(--text-primary)] tracking-tight">{label}&apos;s Portfolio</p>
        </div>
        {payload.map((entry, index) => {
          if (entry.value === 0) return null;
          return (
            <div key={index} className="flex justify-between items-center space-x-4 mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[color:var(--text-primary)] capitalize text-xs tracking-wide">{entry.name}</span>
              </div>
              <span className="font-bold text-[color:var(--text-primary)] text-base">{entry.value}</span>
            </div>
          );
        })}
        <div className="mt-3 pt-3 flex justify-between items-center bg-[var(--bg-elevated)] -mx-4 -mb-4 px-4 py-3 rounded-b-xl border-t border-[var(--border-subtle)]">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-[color:var(--text-tertiary)]">Total Agents</span>
          <span className="font-bold text-[color:var(--text-primary)]">{total}</span>
        </div>
      </div>
    );
  }
  return null;
}

export function ConcentrationBar({ agents }: ConcentrationBarProps) {
  const barData = useMemo(() => {
    const data: Record<string, { name: string, covered: number, exposed: number }> = {};
    
    agents.forEach(agent => {
      if (!agent.owner) return; // Skip orphaned for human concentration
      
      if (!data[agent.owner]) {
        data[agent.owner] = { name: agent.owner, covered: 0, exposed: 0 };
      }
      
      if (agent.backup_owner) {
        data[agent.owner].covered += 1;
      } else {
        data[agent.owner].exposed += 1;
      }
    });

    return Object.values(data).sort((a, b) => {
      const totalB = b.covered + b.exposed;
      const totalA = a.covered + a.exposed;
      if (totalB !== totalA) return totalB - totalA;
      return b.exposed - a.exposed;
    });
  }, [agents]);

  return (
    <div className="card p-7 flex flex-col w-full animate-fade-up delay-400 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/[0.02] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="mb-8 relative z-10">
        <h3 className="text-xl font-semibold text-[color:var(--text-primary)] tracking-tight">Owner Concentration & Coverage</h3>
        <p className="text-sm text-[color:var(--text-secondary)] mt-1.5">Visualizing human single points of failure. Agents without a backup owner are marked as exposed.</p>
      </div>
      
      <div className="w-full h-[320px] relative z-10 min-h-0 min-w-0">
        <ResponsiveContainer width="100%" height={320} minHeight={0}>
          <BarChart data={barData} margin={{ top: 10, right: 30, left: -10, bottom: 0 }} maxBarSize={40} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
            <XAxis 
              type="number"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }} 
              allowDecimals={false}
            />
            <YAxis 
              type="category"
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}
              width={140}
            />
            <Tooltip content={<ConcentrationTooltip />} cursor={{ fill: 'var(--bg-hover)', opacity: 0.5 }} />
            {/* Exposed (Red gradient-like hex) */}
            <Bar dataKey="exposed" name="Exposed (No Backup)" stackId="a" fill="#f87171" radius={[0, 0, 0, 0]} />
            {/* Covered (Emerald gradient-like hex) */}
            <Bar dataKey="covered" name="Covered" stackId="a" fill="#34d399" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-8 mt-6 relative z-10">
        <div className="flex items-center space-x-2.5 opacity-90 hover:opacity-100 transition-opacity cursor-default">
          <div className="w-3 h-3 rounded bg-[#f87171] shadow-[0_0_8px_rgba(248,113,113,0.4)]"></div>
          <span className="text-[11px] font-bold text-[color:var(--text-primary)] uppercase tracking-widest">Exposed</span>
        </div>
        <div className="flex items-center space-x-2.5 opacity-90 hover:opacity-100 transition-opacity cursor-default">
          <div className="w-3 h-3 rounded bg-[#34d399] shadow-[0_0_8px_rgba(52,211,153,0.4)]"></div>
          <span className="text-[11px] font-bold text-[color:var(--text-primary)] uppercase tracking-widest">Covered</span>
        </div>
      </div>
    </div>
  );
}
