'use client';

import * as React from 'react';
import type { AuditLogPage } from '@/types/view';
import { Panel } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchAuditLog } from '@/lib/api/settings';
import { formatDateTime, formatNumber, formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';
import { SectionHeader } from './SectionHeader';

export interface AuditLogViewProps {
  initialPage?: AuditLogPage;
}

const PAGE = 200;

/** ASSIGN_BACKUP → "Assign backup". */
export const actionLabel = (a: string) => {
  const words = a.toLowerCase().replace(/[_.:-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Denials and failures read red; reads are quiet; everything else is neutral. */
function actionTone(a: string) {
  const s = a.toUpperCase();
  if (/(DENIED|FORBIDDEN|FAIL|REJECT)/.test(s)) return 'bg-[color-mix(in_srgb,var(--st-fail)_12%,transparent)] text-st-fail';
  if (/(READ|VIEW|GET)/.test(s)) return 'bg-surface-sunken text-ink-3';
  return 'bg-[color-mix(in_srgb,var(--amber)_14%,transparent)] text-amber-ink';
}

export function AuditLogView({ initialPage }: AuditLogViewProps) {
  const [action, setAction] = React.useState('');
  const [hideReads, setHideReads] = React.useState(true);
  const [limit, setLimit] = React.useState(PAGE);

  const auditResource = useResource<AuditLogPage>(`settings-audit-log-${action}-${hideReads}-${limit}`, () =>
    fetchAuditLog({ action: action || undefined, hideReads, limit }),
  );

  // Keep showing the previous page while a new filter loads.
  const lastPage = React.useRef<AuditLogPage | undefined>(initialPage);
  if (auditResource.status === 'ready') lastPage.current = auditResource.data;
  const page = lastPage.current;

  return (
    <div className="space-y-5">
      <SectionHeader title="Audit Trail" description="Who did what, newest first: sign-ins, changes, access denials and, if you want, page reads." />

      <Panel>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-rule px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="audit-action" className="type-meta text-ink-3">
                Action
              </label>
              <select
                id="audit-action"
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setLimit(PAGE);
                }}
                className="type-meta h-8 cursor-pointer rounded-control border border-rule bg-surface px-2 text-ink focus:border-ink-3 focus:outline-none"
              >
                <option value="">All actions</option>
                {(page?.actions ?? []).map((a) => (
                  <option key={a} value={a}>
                    {actionLabel(a)}
                  </option>
                ))}
              </select>
            </div>
            <label className="type-meta flex cursor-pointer items-center gap-2 text-ink-2">
              <input
                type="checkbox"
                checked={hideReads}
                onChange={(e) => {
                  setHideReads(e.target.checked);
                  setLimit(PAGE);
                }}
                className="h-4 w-4 accent-[var(--amber)]"
              />
              Hide page reads
            </label>
          </div>
          {page && page.entries.length > 0 && (
            <p className="type-meta text-ink-3" aria-live="polite">
              Showing {formatNumber(page.entries.length)} of {formatNumber(page.total)}
            </p>
          )}
        </div>

        {!page && auditResource.status === 'loading' ? (
          <div className="space-y-2 p-5" aria-label="Loading audit log">
            <span className="skeleton block h-10 w-full" />
            <span className="skeleton block h-10 w-full" />
            <span className="skeleton block h-10 w-full" />
          </div>
        ) : auditResource.status === 'error' ? (
          <div className="p-5">
            <ErrorState onRetry={auditResource.reload} message="We couldn't load the audit log." />
          </div>
        ) : !page || page.entries.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="type-heading text-ink">No audit events found</p>
            <p className="type-meta mt-1 text-ink-3">Events matching your filter will be listed here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Audit log table">
              <table className="w-full text-left">
                <thead>
                  <tr className="type-meta border-b border-rule text-ink-3">
                    <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">When</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Who</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Action</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Resource</th>
                    <th scope="col" className="py-2.5 pl-3 pr-5 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {page.entries.map((e) => (
                    <tr key={e.id} className="transition-colors hover:bg-surface-sunken/40">
                      <td className="type-meta whitespace-nowrap py-2.5 pl-5 pr-3 text-ink-3">
                        <time dateTime={e.at} title={formatDateTime(e.at)}>
                          {formatRelative(e.at)}
                        </time>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5" title={e.actor}>
                        <span className="flex items-center gap-2">
                          {e.actorName ? (
                            <Avatar name={e.actorName} size={28} />
                          ) : (
                            <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-ink-3 text-[10px] text-ink-3">
                              ?
                            </span>
                          )}
                          <span className="type-meta font-medium text-ink">{e.actorName ?? e.actor}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium', actionTone(e.action))}>{actionLabel(e.action)}</span>
                      </td>
                      <td className="type-meta max-w-[14rem] truncate px-3 py-2.5 text-ink-2" title={e.resource}>
                        {e.resource}
                      </td>
                      <td className="type-meta max-w-xs truncate py-2.5 pl-3 pr-5 text-ink-3" title={e.details}>
                        {e.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {page.entries.length < page.total && (
              <div className="border-t border-rule px-5 py-2.5 text-center">
                <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="type-meta cursor-pointer font-medium text-ink-2 hover:text-ink">
                  Show {formatNumber(Math.min(PAGE, page.total - page.entries.length))} more
                </button>
              </div>
            )}
          </>
        )}
      </Panel>

      {page && (
        <p className="type-meta text-ink-3">
          Kept in server memory: the most recent {formatNumber(page.retention.capacity)} entries. Older entries are dropped and the log is lost when the server
          restarts, until it moves to the database.
        </p>
      )}
    </div>
  );
}
