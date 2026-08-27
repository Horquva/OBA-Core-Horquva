'use client';

import React, { useEffect, useState } from 'react';
import { accountabilityApi, AccountabilityChain, AccountabilityIssues } from '../../lib/api';
import { TruthBadge } from './TruthBadge';
import { AlertCircle, FileText, UserCheck } from 'lucide-react';

export function AccountabilityChainTable() {
  const [chains, setChains] = useState<AccountabilityChain[]>([]);
  const [issues, setIssues] = useState<AccountabilityIssues | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      accountabilityApi.chains(),
      accountabilityApi.issues()
    ])
      .then(([chainData, issueData]) => {
        setChains(chainData);
        setIssues(issueData);
      })
      .catch(() => {
        setChains([]);
        setIssues(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-48 rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] animate-pulse" />;
  }

  return (
    <div className="flex flex-col rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-[color:var(--text-primary)]">
              Accountability Intelligence
            </span>
          </div>
          <p className="text-xs text-[color:var(--text-tertiary)] mt-1">RACI Chain Mapping & Conflict Detection</p>
        </div>
        <TruthBadge verified={chains.length > 0} />
      </div>

      {issues && issues.noSeparationOfDutiesCount > 0 && (
        <div className="mb-6 p-4 rounded-lg border border-red-500/20 bg-red-500/5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <h4 className="text-red-400 font-semibold mb-1">
              {issues.noSeparationOfDutiesCount} Separation of Duties Conflicts
            </h4>
            <p className="text-[color:var(--text-secondary)]">
              Entities where the Responsible party is also the Accountable party. This represents an governance gap where execution and oversight are concentrated in the same person.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[color:var(--border-subtle)]">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-[color:var(--bg-card)] border-b border-[color:var(--border-subtle)]">
              <th className="p-3 text-[color:var(--text-tertiary)] font-medium">Entity</th>
              <th className="p-3 text-[color:var(--text-tertiary)] font-medium">Dept</th>
              <th className="p-3 text-[color:var(--text-tertiary)] font-medium">Responsible (R)</th>
              <th className="p-3 text-[color:var(--text-tertiary)] font-medium">Accountable (A)</th>
              <th className="p-3 text-[color:var(--text-tertiary)] font-medium">Consulted (C)</th>
              <th className="p-3 text-[color:var(--text-tertiary)] font-medium">Informed (I)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border-subtle)]">
            {chains.map((chain, i) => {
              // Highlight conflict if any single person is both R and A
              const hasConflict = chain.responsible.some(r => chain.accountable.includes(r));
              
              return (
                <tr key={i} className="hover:bg-[color:var(--bg-card)] transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[color:var(--text-tertiary)]" />
                      <span className="font-medium text-[color:var(--text-primary)]">{chain.entityName}</span>
                    </div>
                  </td>
                  <td className="p-3 text-[color:var(--text-secondary)] text-xs uppercase tracking-wider">{chain.department || 'N/A'}</td>
                  
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {chain.responsible.length > 0 ? chain.responsible.map(p => (
                        <span key={p} className={`px-2 py-1 text-xs rounded-md ${hasConflict && chain.accountable.includes(p) ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-[color:var(--bg-brand)] text-[color:var(--text-brand)]'}`}>{p}</span>
                      )) : <span className="text-red-400/70 text-xs italic">Missing</span>}
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {chain.accountable.length > 0 ? chain.accountable.map(p => (
                        <span key={p} className={`px-2 py-1 text-xs rounded-md ${hasConflict && chain.responsible.includes(p) ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>{p}</span>
                      )) : <span className="text-red-400/70 text-xs italic">Missing</span>}
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {chain.consulted.map(p => (
                        <span key={p} className="px-2 py-1 text-xs rounded-md bg-[color:var(--text-tertiary)]/10 text-[color:var(--text-secondary)]">{p}</span>
                      ))}
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {chain.informed.map(p => (
                        <span key={p} className="px-2 py-1 text-xs rounded-md bg-[color:var(--text-tertiary)]/10 text-[color:var(--text-secondary)]">{p}</span>
                      ))}
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
