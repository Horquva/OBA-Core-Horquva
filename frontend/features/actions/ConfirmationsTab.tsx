'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown, ClipboardCheck, Plus } from 'lucide-react';
import type { CampaignSummary, CampaignDetail } from '@/types/view';
import { Panel } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchCampaigns, fetchCampaignDetail } from '@/lib/api/confirmations';
import { toApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface ConfirmationsTabProps {
  initialCampaigns?: CampaignSummary[];
}

const CAMPAIGN_PILL: Record<string, string> = {
  overdue: 'bg-[color-mix(in_srgb,var(--st-fail)_12%,transparent)] text-st-fail',
  completed: 'bg-[color-mix(in_srgb,var(--st-pass)_13%,transparent)] text-st-pass',
};
const campaignPill = (status: string) => CAMPAIGN_PILL[status] ?? 'bg-[color-mix(in_srgb,var(--amber)_16%,transparent)] text-amber-ink';

function dueText(c: CampaignSummary): { text: string; late: boolean } {
  if (c.status === 'completed') return { text: `Was due ${formatDate(c.dueDate)}`, late: false };
  const days = Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: `${-days} ${days === -1 ? 'day' : 'days'} overdue`, late: true };
  if (days === 0) return { text: 'Due today', late: false };
  return { text: `Due in ${days} ${days === 1 ? 'day' : 'days'}`, late: false };
}

const NewCampaignLink = () => (
  <Link
    href="/actions/confirmations/new"
    className="type-meta inline-flex h-8 items-center gap-1.5 rounded-control bg-ink px-3 font-medium text-surface transition-colors hover:bg-ink-2 dark:bg-amber dark:text-on-amber"
  >
    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
    New campaign
  </Link>
);

export function ConfirmationsTab({ initialCampaigns }: ConfirmationsTabProps) {
  const campaignsResource = useResource<CampaignSummary[]>('confirmations-campaigns-list', fetchCampaigns);
  const campaigns = campaignsResource.status === 'ready' ? campaignsResource.data : initialCampaigns || [];

  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [details, setDetails] = React.useState<Record<string, CampaignDetail>>({});
  const [loadingDetails, setLoadingDetails] = React.useState<Record<string, boolean>>({});
  const [detailErrors, setDetailErrors] = React.useState<Record<string, string>>({});

  const loadDetail = async (id: string) => {
    setLoadingDetails((prev) => ({ ...prev, [id]: true }));
    setDetailErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      const d = await fetchCampaignDetail(id);
      setDetails((prev) => ({ ...prev, [id]: d }));
    } catch (err) {
      setDetailErrors((prev) => ({ ...prev, [id]: toApiError(err).message }));
    } finally {
      setLoadingDetails((prev) => ({ ...prev, [id]: false }));
    }
  };

  const toggle = (id: string) => {
    if (expandedId === id) return setExpandedId(null);
    setExpandedId(id);
    if (!details[id]) loadDetail(id);
  };

  return (
    <Panel aria-labelledby="campaigns-heading">
      <div className="flex flex-col gap-3 border-b border-rule px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
          <div>
            <h2 id="campaigns-heading" className="type-heading text-ink">
              Confirmation campaigns
            </h2>
            <p className="type-meta mt-0.5 text-ink-3">Ask owners to confirm who owns and backs up their systems.</p>
          </div>
        </div>
        <NewCampaignLink />
      </div>

      {campaignsResource.status === 'loading' && !initialCampaigns ? (
        <div className="space-y-2 p-5" aria-label="Loading campaigns">
          <span className="skeleton block h-14 w-full" />
          <span className="skeleton block h-14 w-full" />
        </div>
      ) : campaignsResource.status === 'error' && !initialCampaigns ? (
        <div className="p-5">
          <ErrorState onRetry={campaignsResource.reload} message="We couldn't load confirmation campaigns." />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <p className="type-heading text-ink">No campaigns yet</p>
          <p className="type-meta mx-auto mt-1 max-w-sm text-ink-3">Start one to ask owners to confirm ownership and backups for their critical systems.</p>
          <div className="mt-4 flex justify-center">
            <NewCampaignLink />
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="type-meta border-b border-rule text-ink-3">
                <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Campaign</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">Due</th>
                <th scope="col" className="w-56 px-3 py-2.5 font-medium">Answered</th>
                <th scope="col" className="w-12 py-2.5 pr-4">
                  <span className="sr-only">Reviewers</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {campaigns.map((c) => {
                const open = expandedId === c.id;
                const detail = details[c.id];
                const fill = c.totalTasks > 0 ? (c.completedTasks / c.totalTasks) * 100 : 0;
                const due = dueText(c);
                return (
                  <React.Fragment key={c.id}>
                    <tr className={cn('transition-colors hover:bg-surface-sunken/50', open && 'bg-surface-sunken/40')}>
                      <td className="py-3.5 pl-5 pr-3">
                        <p className="text-sm font-medium text-ink">{c.name}</p>
                        <p className="text-[11px] text-ink-3">Started {formatDate(c.createdAt)}</p>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium', campaignPill(c.status))}>{c.status}</span>
                      </td>
                      <td className={cn('type-meta hidden px-3 py-3.5 md:table-cell', due.late ? 'font-medium text-st-fail' : 'text-ink-2')}>
                        <span title={formatDate(c.dueDate)}>{due.text}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="type-meta text-ink-2">
                          <span className="font-medium text-ink">
                            {c.completedTasks} of {c.totalTasks} {c.totalTasks === 1 ? 'system' : 'systems'}
                          </span>
                        </p>
                        {/* Bar width only; numbers stay counts, never percentages. */}
                        <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
                          <span className={cn('block h-full rounded-full', fill >= 100 ? 'bg-st-pass' : 'bg-amber')} style={{ width: `${fill}%` }} />
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggle(c.id)}
                          aria-expanded={open}
                          aria-label={`${open ? 'Hide' : 'View'} reviewer breakdown for ${c.name}`}
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-control text-ink-3 transition-colors hover:bg-surface hover:text-ink"
                        >
                          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={5} className="bg-surface-sunken/40 px-5 pb-4 pt-1">
                          {loadingDetails[c.id] ? (
                            <div className="space-y-2 py-2">
                              <span className="skeleton block h-4 w-1/2" />
                              <span className="skeleton block h-4 w-2/5" />
                            </div>
                          ) : detailErrors[c.id] ? (
                            <div role="alert" className="type-meta py-2 text-ink">
                              Could not load reviewers: {detailErrors[c.id]}{' '}
                              <button type="button" onClick={() => loadDetail(c.id)} className="cursor-pointer font-medium text-amber-ink hover:underline">
                                Retry
                              </button>
                            </div>
                          ) : detail && detail.reviewers.length > 0 ? (
                            <div className="space-y-2">
                              {(detail.reminderAt || detail.escalationAt) && (
                                <p className="type-meta text-ink-3">
                                  {detail.reminderAt && <span>Reminder: {formatDate(detail.reminderAt)}</span>}
                                  {detail.reminderAt && detail.escalationAt && ' · '}
                                  {detail.escalationAt && <span>Escalation: {formatDate(detail.escalationAt)}</span>}
                                </p>
                              )}
                              <ul className="divide-y divide-rule rounded-control border border-rule bg-surface">
                                {detail.reviewers.map((r) => {
                                  const done = r.completed === r.total;
                                  return (
                                    <li key={r.person.id} className="flex items-center gap-3 px-3.5 py-2.5">
                                      <Avatar name={r.person.name} size={28} />
                                      <span className="min-w-0 flex-1">
                                        <span className="type-meta block truncate font-medium text-ink">{r.person.name}</span>
                                        <span className="block text-[11px] text-ink-3">
                                          ({r.completed} of {r.total} {r.total === 1 ? 'system' : 'systems'} answered)
                                        </span>
                                      </span>
                                      <span
                                        className={cn(
                                          'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium',
                                          done ? 'bg-[color-mix(in_srgb,var(--st-pass)_13%,transparent)] text-st-pass' : 'bg-[color-mix(in_srgb,var(--amber)_16%,transparent)] text-amber-ink',
                                        )}
                                      >
                                        {done ? 'Done' : 'Waiting'}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ) : (
                            <p className="type-meta py-2 text-ink-3">No reviewers assigned or questions pending.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
