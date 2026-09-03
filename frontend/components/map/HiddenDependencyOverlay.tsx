'use client';

import React, { useState, useMemo } from 'react';
import { Agent, Dependency } from '../../types';
import { TruthBadge } from '../dashboard/TruthBadge';
import { Eye, EyeOff, Share2 } from 'lucide-react';

interface Props {
  agents: Agent[];
  dependencies: Dependency[];
}

type OverlayMode = 'none' | 'transitive' | 'same-department' | 'shared-owner';

interface HiddenEdge {
  from: string;
  to: string;
  type: string;
  label: string;
}

function computeTransitiveEdges(agents: Agent[], deps: Dependency[]): HiddenEdge[] {
  // Reveal edges that skip a hop (A→C where A→B and B→C but A→C is implicit)
  const adj: Record<string, Set<string>> = {};
  deps.forEach(d => {
    if (!adj[d.from]) adj[d.from] = new Set();
    adj[d.from].add(d.to);
  });
  const directEdges = new Set(deps.map(d => `${d.from}→${d.to}`));
  const transitiveEdges: HiddenEdge[] = [];

  Object.entries(adj).forEach(([from, targets]) => {
    targets.forEach(mid => {
      const onwardEdges = adj[mid] || new Set();
      onwardEdges.forEach(to => {
        const key = `${from}→${to}`;
        if (!directEdges.has(key) && from !== to) {
          const agentFrom = agents.find(a => a.id === from);
          const agentTo = agents.find(a => a.id === to);
          if (agentFrom && agentTo) {
            transitiveEdges.push({
              from: agentFrom.name,
              to: agentTo.name,
              type: 'transitive',
              label: 'Transitive Dependency',
            });
          }
        }
      });
    });
  });

  return transitiveEdges.slice(0, 8); // Cap for readability
}

function computeSharedOwnerEdges(agents: Agent[]): HiddenEdge[] {
  const ownerMap: Record<string, string[]> = {};
  agents.forEach(a => {
    const owner = a.owner || 'Unknown';
    if (!ownerMap[owner]) ownerMap[owner] = [];
    ownerMap[owner].push(a.name);
  });
  const edges: HiddenEdge[] = [];
  Object.entries(ownerMap).forEach(([owner, agentNames]) => {
    if (agentNames.length > 1) {
      for (let i = 0; i < agentNames.length - 1; i++) {
        edges.push({
          from: agentNames[i],
          to: agentNames[i + 1],
          type: 'shared-owner',
          label: `Shared owner: ${owner}`,
        });
      }
    }
  });
  return edges.slice(0, 8);
}

// Same department is a real, verifiable grouping fact -- unlike the "virtual
// resource pool" this used to invent and label as a discovered dependency
// (nothing in the data model represents a shared resource pool; it was a
// department grouping wearing a dependency's clothes on a page whose stated
// purpose is uncovering dependencies you didn't know about). Same
// visualization -- a connecting line between agents that share something
// real, exactly like computeSharedOwnerEdges below -- honest label.
function computeSameDepartmentEdges(agents: Agent[]): HiddenEdge[] {
  const deptMap: Record<string, string[]> = {};
  agents.forEach(a => {
    if (!deptMap[a.department]) deptMap[a.department] = [];
    deptMap[a.department].push(a.name);
  });
  const edges: HiddenEdge[] = [];
  Object.entries(deptMap).forEach(([dept, agentNames]) => {
    if (agentNames.length > 1) {
      for (let i = 0; i < agentNames.length - 1; i++) {
        edges.push({
          from: agentNames[i],
          to: agentNames[i + 1],
          type: 'same-department',
          label: `Same department: ${dept}`,
        });
      }
    }
  });
  return edges.slice(0, 8);
}

const OVERLAY_META = {
  none:              { label: 'None', color: 'text-[color:var(--text-tertiary)]' },
  transitive:        { label: 'Transitive Edges', color: 'text-violet-400' },
  'same-department': { label: 'Same Department', color: 'text-cyan-400' },
  'shared-owner':    { label: 'Shared Owner Edges', color: 'text-amber-400' },
};

export function HiddenDependencyOverlay({ agents, dependencies }: Props) {
  const [mode, setMode] = useState<OverlayMode>('none');
  const [visible, setVisible] = useState(false);

  const hiddenEdges = useMemo<HiddenEdge[]>(() => {
    if (!visible || mode === 'none') return [];
    if (mode === 'transitive') return computeTransitiveEdges(agents, dependencies);
    if (mode === 'shared-owner') return computeSharedOwnerEdges(agents);
    if (mode === 'same-department') return computeSameDepartmentEdges(agents);
    return [];
  }, [mode, visible, agents, dependencies]);

  const edgeColor = (type: string) => {
    if (type === 'transitive') return 'border-violet-500/30 bg-violet-500/5 text-violet-400';
    if (type === 'shared-owner') return 'border-amber-500/30 bg-amber-500/5 text-amber-400';
    return 'border-cyan-500/30 bg-cyan-500/5 text-cyan-400';
  };

  return (
    <div className="flex flex-col rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Hidden Dependency Overlay</h2>
          </div>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">Reveal transitive dependencies, or group agents that share a department or an owner, not visible in the main graph</p>
        </div>
        <TruthBadge verified={agents.length > 0 && dependencies.length > 0} />
      </div>

      {/* Mode selector + toggle */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {(Object.keys(OVERLAY_META) as OverlayMode[]).filter(m => m !== 'none').map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setVisible(true); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              mode === m && visible
                ? `${OVERLAY_META[m].color} bg-[color:var(--bg-card)] border-current`
                : 'text-[color:var(--text-secondary)] bg-[color:var(--bg-card)] border-[color:var(--border-subtle)] hover:text-[color:var(--text-primary)]'
            }`}
          >
            {OVERLAY_META[m].label}
          </button>
        ))}

        <button
          onClick={() => setVisible(v => !v)}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {visible ? 'Hide Overlay' : 'Show Overlay'}
        </button>
      </div>

      {/* Edge list */}
      {!visible && (
        <div className="flex items-center justify-center h-24 rounded-lg border border-dashed border-[color:var(--border-subtle)]">
          <p className="text-sm text-[color:var(--text-tertiary)]">Toggle the overlay to reveal hidden edges</p>
        </div>
      )}

      {visible && hiddenEdges.length === 0 && mode === 'none' && (
        <div className="flex items-center justify-center h-24 rounded-lg border border-dashed border-[color:var(--border-subtle)]">
          <p className="text-sm text-[color:var(--text-tertiary)]">Select an overlay type above to reveal hidden edges</p>
        </div>
      )}

      {visible && hiddenEdges.length === 0 && mode !== 'none' && (
        <div className="flex items-center justify-center h-24 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-sm text-emerald-400">✓ No hidden {OVERLAY_META[mode].label} detected</p>
        </div>
      )}

      {visible && hiddenEdges.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[color:var(--text-tertiary)] mb-3">
            Revealing <strong className="text-[color:var(--text-secondary)]">{hiddenEdges.length}</strong> hidden edges via {OVERLAY_META[mode].label}
          </p>
          {hiddenEdges.map((e, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${edgeColor(e.type)}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider shrink-0 w-28">{e.label}</span>
              <span className="text-sm text-[color:var(--text-secondary)]">{e.from} → {e.to}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
