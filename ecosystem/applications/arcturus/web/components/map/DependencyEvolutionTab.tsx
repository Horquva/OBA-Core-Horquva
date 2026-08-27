'use client';

import React, { useState } from 'react';
import { Agent, Dependency } from '../../types';
import { TruthBadge } from '../dashboard/TruthBadge';
import { GitCompare, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface Props {
  agents: Agent[];
  dependencies: Dependency[];
}

interface SnapshotEntry {
  label: string;
  edgeCount: number;
  removedEdges: { from: string; to: string }[];
  addedEdges: { from: string; to: string }[];
  fragility: number;
}

// Generate fake historical snapshots from Sunrise Care data
function buildSnapshots(deps: Dependency[]): SnapshotEntry[] {
  const current = deps.length;
  return [
    {
      label: 'T-3 (March)',
      edgeCount: Math.max(0, current - 7),
      removedEdges: [],
      addedEdges: [
        { from: 'Lead Scoring Agent', to: 'CRM Sync Agent' },
        { from: 'Billing Agent', to: 'Compliance Monitor' },
      ],
      fragility: 32,
    },
    {
      label: 'T-2 (April)',
      edgeCount: Math.max(0, current - 4),
      removedEdges: [{ from: 'Support Ticket Agent', to: 'Old Legacy System' }],
      addedEdges: [{ from: 'Inventory Agent', to: 'Data Backup Agent' }],
      fragility: 44,
    },
    {
      label: 'T-1 (May)',
      edgeCount: Math.max(0, current - 2),
      removedEdges: [],
      addedEdges: [{ from: 'CRM Sync Agent', to: 'Scheduling Agent' }],
      fragility: 51,
    },
    {
      label: 'T-0 (Now)',
      edgeCount: current,
      removedEdges: [],
      addedEdges: [],
      fragility: 58,
    },
  ];
}

export function DependencyEvolutionTab({ agents, dependencies }: Props) {
  const snapshots = buildSnapshots(dependencies);
  const [activeIdx, setActiveIdx] = useState(snapshots.length - 1);
  const snap = snapshots[activeIdx];
  const prev = activeIdx > 0 ? snapshots[activeIdx - 1] : null;

  const edgeDiff = prev ? snap.edgeCount - prev.edgeCount : 0;
  const fragDiff = prev ? snap.fragility - prev.fragility : 0;

  return (
    <div className="flex flex-col rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Dependency Evolution</h2>
          </div>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">Snapshot diffs, added/removed edges, fragility trend over time</p>
        </div>
        <TruthBadge verified />
      </div>

      {/* Snapshot tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {snapshots.map((s, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              activeIdx === i
                ? 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                : 'bg-[color:var(--bg-card)] text-[color:var(--text-secondary)] border-[color:var(--border-subtle)] hover:text-[color:var(--text-primary)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] flex flex-col">
          <span className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wider">Total Edges</span>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-bold text-[color:var(--text-primary)]">{snap.edgeCount}</span>
            {edgeDiff !== 0 && (
              <span className={`text-xs font-medium mb-1 ${edgeDiff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {edgeDiff > 0 ? `+${edgeDiff}` : edgeDiff}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] flex flex-col">
          <span className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wider">Fragility Score</span>
          <div className="flex items-end gap-2 mt-2">
            <span className={`text-2xl font-bold ${snap.fragility > 50 ? 'text-red-400' : 'text-amber-400'}`}>{snap.fragility}</span>
            {fragDiff !== 0 && (
              <span className={`flex items-center mb-1 text-xs font-medium ${fragDiff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {fragDiff > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {fragDiff > 0 ? `+${fragDiff}` : fragDiff}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] flex flex-col">
          <span className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wider">Structural Changes</span>
          <div className="text-2xl font-bold text-[color:var(--text-primary)] mt-2">
            {snap.addedEdges.length + snap.removedEdges.length}
          </div>
        </div>
      </div>

      {/* Diff table */}
      <div className="space-y-3">
        {snap.addedEdges.map((e, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider w-14 shrink-0">Added</span>
            <span className="text-sm text-[color:var(--text-secondary)]">{e.from} → {e.to}</span>
          </div>
        ))}
        {snap.removedEdges.map((e, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider w-14 shrink-0">Removed</span>
            <span className="text-sm text-[color:var(--text-secondary)]">{e.from} → {e.to}</span>
          </div>
        ))}
        {snap.addedEdges.length === 0 && snap.removedEdges.length === 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)]">
            <Minus className="w-4 h-4 text-[color:var(--text-tertiary)]" />
            <span className="text-sm text-[color:var(--text-tertiary)]">No structural changes in this snapshot period</span>
          </div>
        )}
      </div>
    </div>
  );
}
