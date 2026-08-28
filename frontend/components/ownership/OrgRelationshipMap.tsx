"use client";

import { useMemo, useState } from 'react';
import { Dataset } from '../../types';
import { Network, Users, Bot, Cpu, GitBranch, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { resolveCriticality } from '../../lib/criticality';

interface OrgRelationshipMapProps {
  dataset: Dataset;
}

type PersonProfile = {
  name: string;
  departments: string[];
  ownedAgentIds: string[];
  backupAgentIds: string[];
  ownedWorkflows: string[];
  toolsOwned: string[];
  toolsUsed: string[];
};

const DEPT_COLORS: Record<string, { pill: string; dot: string }> = {
  Sales:      { pill: 'bg-blue-500/10 text-blue-400 border-blue-500/20',   dot: 'bg-blue-400' },
  Marketing:  { pill: 'bg-pink-500/10 text-pink-400 border-pink-500/20',   dot: 'bg-pink-400' },
  HR:         { pill: 'bg-violet-500/10 text-violet-400 border-violet-500/20', dot: 'bg-violet-400' },
  Finance:    { pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  Operations: { pill: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',   dot: 'bg-cyan-400' },
  Support:    { pill: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', dot: 'bg-yellow-400' },
  Legal:      { pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
  IT:         { pill: 'bg-red-500/10 text-red-400 border-red-500/20',       dot: 'bg-red-400' },
  Analytics:  { pill: 'bg-teal-500/10 text-teal-400 border-teal-500/20',   dot: 'bg-teal-400' },
};

function getDeptStyle(dept: string) {
  return DEPT_COLORS[dept] ?? { pill: 'bg-slate-700/30 text-[color:var(--text-secondary)] border-slate-600/30', dot: 'bg-slate-400' };
}

export function OrgRelationshipMap({ dataset }: OrgRelationshipMapProps) {
  const { agents, ai_tools, workflows } = dataset;
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);

  const profiles = useMemo<PersonProfile[]>(() => {
    const names = new Set<string>();
    agents.forEach(a => {
      if (a.owner) names.add(a.owner);
      if (a.backup_owner) names.add(a.backup_owner);
    });
    ai_tools.forEach(t => {
      if (t.access_owner) names.add(t.access_owner);
      t.users.forEach(u => names.add(u));
    });
    workflows.forEach(w => { if (w.owner) names.add(w.owner); });

    return Array.from(names).map(name => {
      const ownedAgents = agents.filter(a => a.owner === name);
      const backupAgents = agents.filter(a => a.backup_owner === name);
      const ownedWfs = workflows.filter(w => w.owner === name);
      const toolsOwned = ai_tools.filter(t => t.access_owner === name);
      const toolsUsed = ai_tools.filter(t => t.users.includes(name) && t.access_owner !== name);

      const departments = Array.from(new Set([
        ...ownedAgents.map(a => a.department),
        ...backupAgents.map(a => a.department),
        ...ownedWfs.map(w => w.department),
      ])).filter(Boolean);

      return {
        name,
        departments,
        ownedAgentIds: ownedAgents.map(a => a.id),
        backupAgentIds: backupAgents.map(a => a.id),
        ownedWorkflows: ownedWfs.map(w => w.name),
        toolsOwned: toolsOwned.map(t => t.name),
        toolsUsed: toolsUsed.map(t => t.name),
      };
    }).sort((a, b) => (b.ownedAgentIds.length + b.ownedWorkflows.length) - (a.ownedAgentIds.length + a.ownedWorkflows.length));
  }, [agents, ai_tools, workflows]);

  // Department-level rollup
  const deptMap = useMemo(() => {
    const map: Record<string, { agents: number; criticalAgents: number; owners: Set<string>; workflows: number }> = {};
    agents.forEach(a => {
      if (!map[a.department]) map[a.department] = { agents: 0, criticalAgents: 0, owners: new Set(), workflows: 0 };
      map[a.department].agents += 1;
      if (resolveCriticality(a) === 'critical') map[a.department].criticalAgents += 1;
      if (a.owner) map[a.department].owners.add(a.owner);
    });
    workflows.forEach(w => {
      if (!map[w.department]) map[w.department] = { agents: 0, criticalAgents: 0, owners: new Set(), workflows: 0 };
      map[w.department].workflows += 1;
    });
    return map;
  }, [agents, workflows]);

  return (
    <div className="card p-7 animate-fade-up delay-400 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.015] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="mb-8 relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Network className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="text-xl font-semibold text-[color:var(--text-primary)] tracking-tight">Organizational Relationship Map</h3>
        </div>
        <p className="text-sm text-[color:var(--text-secondary)] mt-1">
          Cross-department ownership topology — who controls what agents, tools, and workflows across the organization.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
        {/* Left: People-centric view */}
        <div className="flex flex-col space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-tertiary)] flex items-center gap-2 mb-1">
            <Users className="w-3 h-3" /> People Overview
          </div>
          {profiles.map(profile => {
            const isExpanded = expandedPerson === profile.name;
            const totalResp = profile.ownedAgentIds.length + profile.ownedWorkflows.length + profile.toolsOwned.length;
            const backupLoad = profile.backupAgentIds.length;

            return (
              <div
                key={profile.name}
                className={clsx(
                  "relative group cursor-pointer border rounded-xl p-4 transition-all duration-300",
                  isExpanded ? 'border-indigo-500/30 bg-indigo-500/[0.03]' : 'border-[var(--border-default)] bg-[var(--bg-surface)]/50 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]/50'
                )}
              >
                <button
                  onClick={() => setExpandedPerson(isExpanded ? null : profile.name)}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left"
                >
                  {/* Avatar */}
                  <div className={clsx(
                    'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border flex-shrink-0',
                    isExpanded
                      ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                      : 'bg-[var(--bg-hover)] border-[var(--border-default)] text-[color:var(--text-primary)]'
                  )}>
                    {profile.name.charAt(0)}
                  </div>

                  {/* Name & departments */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[color:var(--text-primary)]">{profile.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.departments.slice(0, 3).map(d => (
                        <span key={d} className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider', getDeptStyle(d).pill)}>
                          {d}
                        </span>
                      ))}
                      {profile.departments.length > 3 && (
                        <span className="text-[9px] text-[color:var(--text-tertiary)]">+{profile.departments.length - 3}</span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 flex-shrink-0 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-light text-[color:var(--text-primary)]">{totalResp}</span>
                      <span className="text-[9px] text-[color:var(--text-tertiary)] uppercase tracking-wider">owned</span>
                    </div>
                    {backupLoad > 0 && (
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-light text-[color:var(--text-secondary)]">{backupLoad}</span>
                        <span className="text-[9px] text-slate-600 uppercase tracking-wider">backup</span>
                      </div>
                    )}
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-indigo-400" />
                      : <ChevronDown className="w-4 h-4 text-[color:var(--text-tertiary)]" />
                    }
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-indigo-500/10">
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <ExpandSection icon={Bot} label="Agents Owned" items={profile.ownedAgentIds.map(id => agents.find(a => a.id === id)?.name ?? id)} color="text-indigo-400" />
                      <ExpandSection icon={GitBranch} label="Workflows" items={profile.ownedWorkflows} color="text-emerald-400" />
                      <ExpandSection icon={Cpu} label="Tools Owned" items={profile.toolsOwned} color="text-cyan-400" />
                    </div>
                    {profile.backupAgentIds.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                        <div className="text-[9px] uppercase tracking-widest text-[color:var(--text-tertiary)] font-semibold mb-2">Backup Coverage Provided For</div>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.backupAgentIds.map(id => {
                            const agent = agents.find(a => a.id === id);
                            if (!agent) return null;
                            return (
                              <span key={id} className={clsx(
                                "px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border",
                                'bg-[var(--bg-hover)] text-[color:var(--text-secondary)] border-[var(--border-default)]'
                              )}>
                                {agent.name.replace(' Agent', '')}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {profile.toolsUsed.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                        <div className="text-[9px] uppercase tracking-widest text-[color:var(--text-tertiary)] font-semibold mb-2">Tools Used (Non-Owner)</div>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.toolsUsed.slice(0, 3).map(t => (
                            <span key={t} className="text-[10px] px-2 py-0.5 rounded border bg-[var(--bg-hover)] text-[color:var(--text-secondary)] border-[var(--border-default)] font-medium">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Department-level rollup */}
        <div className="flex flex-col space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-tertiary)] flex items-center gap-2 mb-1">
            <Bot className="w-3 h-3" /> Department Coverage
          </div>
          {Object.entries(deptMap)
            .sort(([, a], [, b]) => b.agents - a.agents)
            .map(([dept, info]) => {
              const style = getDeptStyle(dept);
              const owners = Array.from(info.owners);
              const isSingleOwner = owners.length === 1;

              return (
                <div
                  key={dept}
                  className={clsx(
                    'flex items-start gap-4 px-4 py-4 rounded-xl border transition-colors',
                    isSingleOwner && info.agents >= 2
                      ? 'border-red-500/15 bg-red-500/[0.03] hover:bg-red-500/[0.05]'
                      : 'border-[var(--border-default)] bg-[var(--bg-surface)]/50 hover:bg-[var(--bg-hover)]/40'
                  )}
                >
                  {/* Dept color dot */}
                  <div className={clsx('w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0', style.dot)} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-[color:var(--text-primary)]">{dept}</span>
                      {isSingleOwner && info.agents >= 2 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider">
                          Single Owner
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {owners.map(o => (
                        <span key={o} className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-hover)] border border-[var(--border-default)] text-[color:var(--text-primary)] font-medium">
                          {o}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-wider font-semibold">
                      <span className="flex items-center gap-1">
                        <Bot className="w-3 h-3" /> {info.agents} agents
                        {info.criticalAgents > 0 && (
                          <span className="text-red-400 ml-1">({info.criticalAgents} critical)</span>
                        )}
                      </span>
                      {info.workflows > 0 && (
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3" /> {info.workflows} workflows
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
          })}
        </div>
      </div>
    </div>
  );
}

function ExpandSection({ icon: Icon, label, items, color }: {
  icon: React.ElementType;
  label: string;
  items: string[];
  color: string;
}) {
  return (
    <div className="flex flex-col">
      <div className={clsx('text-[9px] uppercase tracking-widest font-bold mb-2 flex items-center gap-1', color)}>
        <Icon className="w-3 h-3" /> {label}
      </div>
      {items.length === 0 ? (
        <span className="text-[10px] text-slate-600">None</span>
      ) : (
        <div className="space-y-1">
          {items.map(item => (
            <div key={item} className="text-[10px] text-[color:var(--text-primary)] truncate" title={item}>
              {item.replace(' Agent', '')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
