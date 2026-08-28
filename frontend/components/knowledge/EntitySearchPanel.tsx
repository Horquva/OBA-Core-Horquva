'use client';

import React, { useState, useMemo } from 'react';
import { PersonProfile, AssetItem, KnowledgeRiskReport } from '../../lib/knowledgeRisk';
import { TruthBadge } from '../dashboard/TruthBadge';
import { Search, Server, GitFork, Key, Users } from 'lucide-react';

interface Props {
  report: KnowledgeRiskReport;
}

export function EntitySearchPanel({ report }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'agent' | 'workflow' | 'tool' | 'person'>('all');

  const allAssets = useMemo(() => {
    let assets: AssetItem[] = [];
    report.profiles.forEach(p => {
      assets = assets.concat(p.ownedAgents, p.ownedWorkflows, p.ownedTools);
    });
    // Remove duplicates safely since assets are just collected from profiles
    const unique = Array.from(new Map(assets.map(a => [a.id, a])).values());
    return unique;
  }, [report.profiles]);

  const searchResults = useMemo(() => {
    if (!query) return [];

    const q = query.toLowerCase();
    
    // Search assets
    const assetMatches = allAssets.filter(a => 
      a.name.toLowerCase().includes(q) || 
      (a.owner && a.owner.toLowerCase().includes(q)) ||
      a.department.toLowerCase().includes(q)
    ).map(a => ({ type: a.type, obj: a as AssetItem }));

    // Search people
    const peopleMatches = report.profiles.filter(p =>
      p.name.toLowerCase().includes(q)
    ).map(p => ({ type: 'person' as const, obj: p as PersonProfile }));

    const combined = [...assetMatches, ...peopleMatches];
    
    if (filter === 'all') return combined.slice(0, 8);
    return combined.filter(c => c.type === filter).slice(0, 8);
  }, [query, filter, allAssets, report.profiles]);

  return (
    <div className="flex flex-col rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 bg-sky-500/5 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 z-10">
        <div>
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Global Entity Search</h2>
          </div>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">Searchable ontology browser (Agents, Workflows, Tools, People)</p>
        </div>
        <TruthBadge verified={allAssets.length > 0} />
      </div>

      <div className="relative z-10 mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--text-tertiary)]" />
        <input
          type="text"
          placeholder="Search by name, owner, or department..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] rounded-lg text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-sky-500/50"
        />
      </div>

      <div className="flex gap-2 mb-4 z-10 flex-wrap">
        {(['all', 'agent', 'workflow', 'tool', 'person'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${
              filter === f
                ? 'text-sky-400 bg-sky-500/10 border-sky-500/30'
                : 'text-[color:var(--text-secondary)] bg-[color:var(--bg-card)] border-[color:var(--border-subtle)] hover:text-[color:var(--text-primary)]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)] rounded-lg min-h-64 z-10">
        {!query ? (
           <div className="flex flex-col items-center justify-center p-12 text-center">
             <Search className="w-8 h-8 text-[color:var(--text-tertiary)] mb-3 opacity-50" />
             <p className="text-sm text-[color:var(--text-secondary)]">Start typing to search the knowledge graph</p>
           </div>
        ) : searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
             <p className="text-sm text-[color:var(--text-secondary)]">No matches found for &quot;{query}&quot;</p>
           </div>
        ) : (
          <div className="divide-y divide-[color:var(--border-subtle)]">
            {searchResults.map((res, i) => {
              if (res.type === 'person') {
                const p = res.obj as PersonProfile;
                return (
                  <div key={i} className="flex items-center gap-4 p-4 hover:bg-[color:var(--bg-hover)] transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-fuchsia-500/10 flex items-center justify-center shrink-0 border border-fuchsia-500/20">
                      <Users className="w-5 h-5 text-fuchsia-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[color:var(--text-primary)]">{p.name}</h4>
                      <p className="text-xs text-[color:var(--text-tertiary)]">Person · Owns {p.totalOwned} assets</p>
                    </div>
                    <div className="text-xs font-medium px-2 py-1 rounded bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)]">
                      Tier: {p.riskTier}
                    </div>
                  </div>
                );
              }

              const a = res.obj as AssetItem;
              const typeIcons = {
                agent: <Server className="w-5 h-5 text-indigo-400" />,
                workflow: <GitFork className="w-5 h-5 text-sky-400" />,
                tool: <Key className="w-5 h-5 text-violet-400" />
              };
              const typeColors = {
                agent: 'bg-indigo-500/10 border-indigo-500/20',
                workflow: 'bg-sky-500/10 border-sky-500/20',
                tool: 'bg-violet-500/10 border-violet-500/20'
              };

              return (
                <div key={i} className="flex items-start gap-4 p-4 hover:bg-[color:var(--bg-hover)] transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${typeColors[a.type as keyof typeof typeColors]}`}>
                    {typeIcons[a.type as keyof typeof typeIcons]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-[color:var(--text-primary)]">{a.name}</h4>
                      {!a.documented && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-400 uppercase font-semibold">
                          Undocumented
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[color:var(--text-tertiary)]">
                      <span className="capitalize">{a.type}</span>
                      <span>·</span>
                      <span>Owner: <strong className="text-[color:var(--text-secondary)]">{a.owner || 'None'}</strong></span>
                      <span>·</span>
                      <span>{a.department}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
