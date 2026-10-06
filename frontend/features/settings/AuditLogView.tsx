'use client';

import * as React from 'react';
import type { AuditLogPage } from '@/types/view';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchAuditLog } from '@/lib/api/settings';
import { formatDateTime, formatNumber } from '@/lib/format';

export interface AuditLogViewProps {
  initialPage?: AuditLogPage;
}

const PAGE = 200;

export function AuditLogView({ initialPage }: AuditLogViewProps) {
  const [action, setAction] = React.useState('');
  const [hideReads, setHideReads] = React.useState(true);
  const [limit, setLimit] = React.useState(PAGE);

  const auditResource = useResource<AuditLogPage>(
    `settings-audit-log-${action}-${hideReads}-${limit}`,
    () => fetchAuditLog({ action: action || undefined, hideReads, limit }),
  );

  // Keep showing the previous page while a new filter loads.
  const lastPage = React.useRef<AuditLogPage | undefined>(initialPage);
  if (auditResource.status === 'ready') lastPage.current = auditResource.data;
  const page = lastPage.current;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-rule/50 pb-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Audit Trail</h2>
          <p className="text-xs text-ink-3 mt-0.5">
            Who did what, newest first: sign-ins, changes, access denials, and (optionally) page reads.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 text-xs">
          <label className="flex flex-col gap-1 text-ink-2">
            <span>Action</span>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setLimit(PAGE);
              }}
              className="rounded-control border border-rule bg-surface p-2 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
            >
              <option value="">All actions</option>
              {(page?.actions ?? []).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-ink-2 pb-2">
            <input
              type="checkbox"
              checked={hideReads}
              onChange={(e) => {
                setHideReads(e.target.checked);
                setLimit(PAGE);
              }}
            />
            <span>Hide page reads</span>
          </label>
        </div>
      </div>

      {page && (
        <p className="rounded-control bg-surface-sunken p-3 text-xs text-ink-3 border border-rule/60">
          Kept in server memory: the most recent {formatNumber(page.retention.capacity)} entries. Older entries are
          dropped and the log is lost when the server restarts, until it moves to the database.
        </p>
      )}

      {!page && auditResource.status === 'loading' ? (
        <div className="space-y-2">
          <Skeleton variant="card" className="h-14" />
          <Skeleton variant="card" className="h-14" />
          <Skeleton variant="card" className="h-14" />
        </div>
      ) : auditResource.status === 'error' ? (
        <ErrorState onRetry={auditResource.reload} message="Could not load audit log entries." />
      ) : !page || page.entries.length === 0 ? (
        <EmptyState title="No audit events found" description="Events matching your filter will be listed here." />
      ) : (
        <>
          <p className="text-xs text-ink-3" aria-live="polite">
            Showing {formatNumber(page.entries.length)} of {formatNumber(page.total)}
          </p>
          <div className="border border-rule rounded-card bg-surface overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-rule bg-surface-sunken/60 font-mono text-[11px] text-ink-3">
                    <th scope="col" className="p-3 font-semibold">When</th>
                    <th scope="col" className="p-3 font-semibold">Who</th>
                    <th scope="col" className="p-3 font-semibold">Action</th>
                    <th scope="col" className="p-3 font-semibold">Resource</th>
                    <th scope="col" className="p-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule font-sans">
                  {page.entries.map((e) => (
                    <tr key={e.id} className="hover:bg-surface-sunken/30 transition-colors">
                      <td className="p-3 font-mono text-ink-3 whitespace-nowrap">{formatDateTime(e.at)}</td>
                      <td className="p-3 font-medium text-ink whitespace-nowrap" title={e.actor}>
                        {e.actorName ?? e.actor}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-badge bg-amber/15 text-amber-ink font-mono font-semibold text-[11px]">
                          {e.action}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-ink-2 whitespace-nowrap">{e.resource}</td>
                      <td className="p-3 text-ink-3 font-mono text-[11px] max-w-xs truncate" title={e.details}>
                        {e.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {page.entries.length < page.total && (
            <button
              type="button"
              onClick={() => setLimit((l) => l + PAGE)}
              className="rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken"
            >
              Show {formatNumber(Math.min(PAGE, page.total - page.entries.length))} more
            </button>
          )}
        </>
      )}
    </div>
  );
}
