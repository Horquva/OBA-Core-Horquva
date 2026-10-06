'use client';

import * as React from 'react';
import type { AuditEntry } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchAuditLog } from '@/lib/api/settings';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface AuditLogViewProps {
  initialEntries?: AuditEntry[];
}

export function AuditLogView({ initialEntries }: AuditLogViewProps) {
  const [filterAction, setFilterAction] = React.useState('');

  const auditResource = useResource<AuditEntry[]>(
    `settings-audit-log-${filterAction}`,
    () => fetchAuditLog({ action: filterAction.trim() || undefined }),
  );

  const entries =
    auditResource.status === 'ready'
      ? auditResource.data
      : initialEntries || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/50 pb-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Immutable Audit Trail</h2>
          <p className="text-xs text-ink-3 mt-0.5">
            Append-only record of all system modifications, attestation events, and risk acceptances.
          </p>
        </div>

        {/* Filter Input */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            placeholder="Filter by action..."
            aria-label="Filter audit events by action"
            className="w-full rounded-control border border-rule bg-surface p-2 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
          />
        </div>
      </div>

      {/* Invariant Note */}
      <div className="rounded-control bg-surface-sunken p-3 text-xs text-ink-3 border border-rule/60">
        <strong className="text-ink">Tamper-Evident Invariant: </strong>
        Audit entries are append-only and cryptographically verified against temporal graph mutations.
      </div>

      {auditResource.status === 'loading' && !initialEntries ? (
        <div className="space-y-2">
          <Skeleton variant="card" className="h-14" />
          <Skeleton variant="card" className="h-14" />
          <Skeleton variant="card" className="h-14" />
        </div>
      ) : auditResource.status === 'error' && !initialEntries ? (
        <ErrorState
          onRetry={auditResource.reload}
          message="Could not load audit log entries."
        />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No audit events found"
          description="System events matching your filter will be listed here."
        />
      ) : (
        <div className="border border-rule rounded-card bg-surface overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-rule bg-surface-sunken/60 font-mono text-[11px] text-ink-3">
                  <th scope="col" className="p-3 font-semibold">Timestamp</th>
                  <th scope="col" className="p-3 font-semibold">Actor</th>
                  <th scope="col" className="p-3 font-semibold">Action</th>
                  <th scope="col" className="p-3 font-semibold">Resource</th>
                  <th scope="col" className="p-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule font-sans">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-sunken/30 transition-colors">
                    <td className="p-3 font-mono text-ink-3 whitespace-nowrap">
                      {formatDate(e.at)}
                    </td>
                    <td className="p-3 font-medium text-ink whitespace-nowrap">
                      {e.actor}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-badge bg-amber/15 text-amber-ink font-mono font-semibold text-[11px]">
                        {e.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-ink-2 whitespace-nowrap">
                      {e.resource}
                    </td>
                    <td className="p-3 text-ink-3 font-mono text-[11px] max-w-xs truncate">
                      {e.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
