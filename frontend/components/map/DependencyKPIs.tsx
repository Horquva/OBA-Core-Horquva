import React from 'react';
import { Activity, GitMerge, AlertOctagon, Share2 } from 'lucide-react';

interface DependencyKPIsProps {
  totalAgents: number;
  totalDependencies: number;
  spofCount: number;
  maxCascadeRisk: number;
}

export function DependencyKPIs({ totalAgents, totalDependencies, spofCount, maxCascadeRisk }: DependencyKPIsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="card p-5 animate-fade-up">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">Total Active Agents</span>
          <Activity size={18} className="text-[var(--accent)]" />
        </div>
        <div className="text-3xl font-bold text-[var(--text-primary)]">{totalAgents}</div>
      </div>

      <div className="card p-5 animate-fade-up delay-75">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">Map Edges (Dependencies)</span>
          <GitMerge size={18} className="text-[var(--text-tertiary)]" />
        </div>
        <div className="text-3xl font-bold text-[var(--text-primary)]">{totalDependencies}</div>
      </div>

      <div className="card p-5 animate-fade-up delay-150 border-l-[3px] border-l-red-500">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-red-400">SPOFs Detected</span>
          <AlertOctagon size={18} className="text-red-500" />
        </div>
        <div className="text-3xl font-bold text-[var(--text-primary)]">{spofCount}</div>
        <div className="text-xs text-[var(--text-secondary)] mt-1">Nodes with 3+ victims & no backup</div>
      </div>

      <div className="card p-5 animate-fade-up delay-225">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">Max Cascade Depth</span>
          <Share2 size={18} className="text-orange-400" />
        </div>
        <div className="text-3xl font-bold text-[var(--text-primary)]">{maxCascadeRisk}</div>
        <div className="text-xs text-[var(--text-secondary)] mt-1">Largest downstream failure chain</div>
      </div>
    </div>
  );
}
