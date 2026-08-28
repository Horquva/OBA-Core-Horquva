"use client";

import { useMemo } from 'react';
import { Dataset } from '../../types';
import { Users, Bot, Cpu, GitBranch, ArrowRight, AlertTriangle, Shield } from 'lucide-react';
import clsx from 'clsx';
import { PredictiveRiskEntry } from '../../lib/predictiveRisk';

interface DependencyPipelineProps {
  dataset: Dataset;
  riskByAgentName: Map<string, PredictiveRiskEntry>;
  /** Owner names flagged by the backend's isHumanSpof (>=3 unbacked agents,
   *  GET /api/ownership) -- replaces this component's own independently-coded
   *  `noBackupAgents.length >= 3` check. */
  humanSpofOwners: Set<string>;
}

const TIER_WEIGHT: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

type PersonNode = {
  name: string;
  agentCount: number;
  toolCount: number;
  workflowCount: number;
  isSpof: boolean;
  riskScore: number;
};

export function DependencyPipeline({ dataset, riskByAgentName, humanSpofOwners }: DependencyPipelineProps) {
  const { agents, ai_tools, workflows } = dataset;

  const peopleMap = useMemo(() => {
    const map: Record<string, PersonNode> = {};

    // Gather unique humans from agents (owner / backup_owner)
    const allHumans = new Set<string>();
    agents.forEach(a => {
      if (a.owner) allHumans.add(a.owner);
      if (a.backup_owner) allHumans.add(a.backup_owner);
    });
    ai_tools.forEach(t => { if (t.access_owner) allHumans.add(t.access_owner); });
    workflows.forEach(w => {
      if (w.owner) allHumans.add(w.owner);
      if (w.backup_owner) allHumans.add(w.backup_owner);
    });

    allHumans.forEach(name => {
      const ownedAgents = agents.filter(a => a.owner === name);
      const ownedTools = ai_tools.filter(t => t.access_owner === name);
      const ownedWorkflows = workflows.filter(w => w.owner === name);
      const noBackupAgents = ownedAgents.filter(a => !a.backup_owner);
      const riskScore = noBackupAgents.reduce((acc, a) => {
        const tier = riskByAgentName.get(a.name)?.threatLevel ?? 'low';
        return acc + TIER_WEIGHT[tier];
      }, 0);

      map[name] = {
        name,
        agentCount: ownedAgents.length,
        toolCount: ownedTools.length,
        workflowCount: ownedWorkflows.length,
        isSpof: humanSpofOwners.has(name),
        riskScore,
      };
    });

    return Object.values(map).sort((a, b) => b.riskScore - a.riskScore);
  }, [agents, ai_tools, workflows, riskByAgentName, humanSpofOwners]);

  // Column totals
  const uniqueAgents = agents.length;
  const uniqueTools = ai_tools.length;
  const uniqueWorkflows = workflows.length;
  const totalPeople = peopleMap.length;

  const columns = [
    {
      label: 'People',
      count: totalPeople,
      icon: Users,
      color: 'text-violet-400',
      border: 'border-violet-500/20',
      bg: 'bg-violet-500/10',
      glow: 'bg-violet-500/5',
      dot: 'bg-violet-400',
    },
    {
      label: 'Agents',
      count: uniqueAgents,
      icon: Bot,
      color: 'text-indigo-400',
      border: 'border-indigo-500/20',
      bg: 'bg-indigo-500/10',
      glow: 'bg-indigo-500/5',
      dot: 'bg-indigo-400',
    },
    {
      label: 'AI Platforms',
      count: uniqueTools,
      icon: Cpu,
      color: 'text-cyan-400',
      border: 'border-cyan-500/20',
      bg: 'bg-cyan-500/10',
      glow: 'bg-cyan-500/5',
      dot: 'bg-cyan-400',
    },
    {
      label: 'Workflows',
      count: uniqueWorkflows,
      icon: GitBranch,
      color: 'text-emerald-400',
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/10',
      glow: 'bg-emerald-500/5',
      dot: 'bg-emerald-400',
    },
  ];

  return (
    <div className="card p-7 animate-fade-up delay-150 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="mb-8 relative z-10">
        <h3 className="text-xl font-semibold text-[color:var(--text-primary)] tracking-tight">Human-Agent Dependency Pipeline</h3>
        <p className="text-sm text-[color:var(--text-secondary)] mt-1.5">
          Full-stack dependency chain from people to operational workflows via agents and AI platforms.
        </p>
      </div>

      {/* Pipeline header columns */}
      <div className="grid grid-cols-4 gap-4 mb-8 relative z-10">
        {columns.map((col, i) => (
          <div key={col.label} className="flex items-center">
            <div className={clsx('flex-1 card p-4 flex flex-col items-center text-center relative overflow-hidden', col.border)}>
              <div className={clsx('absolute inset-0 pointer-events-none', col.glow)} />
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3 border', col.bg, col.border)}>
                <col.icon className={clsx('w-5 h-5', col.color)} />
              </div>
              <div className="text-3xl font-light text-[color:var(--text-primary)] tracking-tight">{col.count}</div>
              <div className={clsx('text-[10px] font-bold uppercase tracking-widest mt-1', col.color)}>{col.label}</div>
            </div>
            {i < columns.length - 1 && (
              <div className="flex-shrink-0 px-2 flex flex-col items-center">
                <ArrowRight className="w-4 h-4 text-slate-600" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Per-person pipeline rows */}
      <div className="relative z-10 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-tertiary)] mb-3 px-1">Individual Dependency Load</div>
        {peopleMap.map((person) => {
          const maxAgents = Math.max(...peopleMap.map(p => p.agentCount), 1);
          const pct = (person.agentCount / maxAgents) * 100;

          return (
            <div
              key={person.name}
              className={clsx(
                'flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors',
                person.isSpof
                  ? 'border-red-500/20 bg-red-500/[0.04] hover:bg-red-500/[0.07]'
                  : 'border-[var(--border-default)] bg-[var(--bg-surface)]/60 hover:bg-[var(--bg-hover)]'
              )}
            >
              {/* Avatar */}
              <div className={clsx(
                'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border flex-shrink-0',
                person.isSpof
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-[var(--bg-hover)] border-[var(--border-default)] text-[color:var(--text-primary)]'
              )}>
                {person.name.charAt(0)}
              </div>

              {/* Name + SPOF badge */}
              <div className="w-24 flex-shrink-0">
                <div className="text-sm font-medium text-[color:var(--text-primary)]">{person.name}</div>
                {person.isSpof && (
                  <div className="flex items-center mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-pulse" />
                    <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">SPOF</span>
                  </div>
                )}
              </div>

              {/* Agents bar */}
              <div className="flex-1 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                  <div 
                    className={clsx('h-full rounded-full transition-all duration-700', person.isSpof ? 'bg-red-500' : 'bg-indigo-500')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={clsx('text-xs font-bold w-4 text-right', person.isSpof ? 'text-red-400' : 'text-indigo-400')}>
                  {person.agentCount}
                </span>
              </div>

              {/* Connector line 1 */}
              <div className="w-px h-6 bg-[var(--border-default)]" />

              {/* Node 2: Agents */}
              <div className="flex items-center gap-1.5 w-16 justify-center">
                <Cpu className="w-3.5 h-3.5 text-cyan-500/70 flex-shrink-0" />
                <span className="text-sm font-bold text-cyan-400">{person.toolCount}</span>
                <span className="text-[10px] text-[color:var(--text-tertiary)]">tools</span>
              </div>

              <div className="w-px h-6 bg-[#28283a]" />

              {/* Workflows */}
              <div className="flex items-center gap-1.5 w-20 justify-center">
                <GitBranch className="w-3.5 h-3.5 text-emerald-500/70 flex-shrink-0" />
                <span className="text-sm font-bold text-emerald-400">{person.workflowCount}</span>
                <span className="text-[10px] text-[color:var(--text-tertiary)]">flows</span>
              </div>

              {/* Risk indicator */}
              {person.isSpof ? (
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              ) : (
                <Shield className="w-4 h-4 text-slate-600 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
