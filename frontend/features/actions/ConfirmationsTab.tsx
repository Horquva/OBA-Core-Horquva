'use client';

import * as React from 'react';
import Link from 'next/link';
import type { CampaignSummary, CampaignDetail } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchCampaigns, fetchCampaignDetail } from '@/lib/api/confirmations';
import { toApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface ConfirmationsTabProps {
  initialCampaigns?: CampaignSummary[];
}

export function ConfirmationsTab({ initialCampaigns }: ConfirmationsTabProps) {
  const campaignsResource = useResource<CampaignSummary[]>(
    'confirmations-campaigns-list',
    fetchCampaigns,
  );

  const campaigns =
    campaignsResource.status === 'ready'
      ? campaignsResource.data
      : initialCampaigns || [];

  const [expandedCampaignId, setExpandedCampaignId] = React.useState<string | null>(null);
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

  const toggleExpand = (id: string) => {
    if (expandedCampaignId === id) {
      setExpandedCampaignId(null);
      return;
    }
    setExpandedCampaignId(id);
    if (!details[id]) loadDetail(id);
  };

  return (
    <div className="space-y-6">
      {/* Header & New Campaign Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Attestation & Confirmation Campaigns
          </h2>
          <p className="text-xs text-ink-3 mt-0.5">
            Periodic certification campaigns verifying backup assignments and undocumented assets.
          </p>
        </div>

        <Link
          href="/actions/confirmations/new"
          className="inline-flex items-center justify-center rounded-control bg-amber text-paper px-4 py-2 text-xs font-semibold hover:bg-amber-hover transition-colors shadow-xs"
        >
          <span>+ New Campaign</span>
        </Link>
      </div>

      {/* Campaigns List */}
      {campaignsResource.status === 'loading' && !initialCampaigns ? (
        <div className="space-y-4">
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-24" />
        </div>
      ) : campaignsResource.status === 'error' && !initialCampaigns ? (
        <ErrorState
          onRetry={campaignsResource.reload}
          message="Could not load confirmation campaigns."
        />
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="No confirmation campaigns yet"
          description="Create your first attestation campaign to send fact verification questionnaires to reviewers."
          actionLabel="Create Campaign"
          onAction={() => {
            window.location.href = '/actions/confirmations/new';
          }}
        />
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => {
            const isExpanded = expandedCampaignId === c.id;
            const detail = details[c.id];
            const isLoadingDetail = loadingDetails[c.id];
            const detailError = detailErrors[c.id];
            // Bar width only; numbers are shown as counts, never percentages.
            const fill = c.totalTasks > 0 ? (c.completedTasks / c.totalTasks) * 100 : 0;

            return (
              <Card
                key={c.id}
                className="p-5 bg-surface border border-rule transition-colors hover:border-ink-3/40 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-ink">
                        {c.name}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-badge text-[10px] font-mono uppercase font-semibold',
                          c.status === 'overdue'
                            ? 'bg-st-fail/10 text-st-fail'
                            : c.status === 'completed'
                              ? 'bg-st-pass/15 text-st-pass'
                              : 'bg-amber/15 text-amber-ink',
                        )}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-ink-3 font-mono">
                      Due: {formatDate(c.dueDate)} · Launched: {formatDate(c.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Progress Bar */}
                    <div className="w-40 space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-ink-3">Answered</span>
                        <span className="font-semibold text-ink">
                          {c.completedTasks} of {c.totalTasks} {c.totalTasks === 1 ? 'system' : 'systems'}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
                        <div className="h-full bg-amber transition-all duration-300" style={{ width: `${fill}%` }} />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpand(c.id)}
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? 'Hide' : 'View'} reviewer breakdown for ${c.name}`}
                      className="text-xs font-semibold text-ink-3 hover:text-ink cursor-pointer underline decoration-rule hover:decoration-ink"
                    >
                      {isExpanded ? 'Hide Reviewers' : 'Reviewers'}
                    </button>
                  </div>
                </div>

                {/* Expanded Reviewer Breakdown */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-rule/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
                        Reviewer Completion Breakdown
                      </h3>
                      {detail && (
                        <div className="flex items-center gap-4 text-[11px] font-mono text-ink-3">
                          {detail.reminderAt && (
                            <span>Reminder: {formatDate(detail.reminderAt)}</span>
                          )}
                          {detail.escalationAt && (
                            <span>Escalation: {formatDate(detail.escalationAt)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {isLoadingDetail ? (
                      <div className="space-y-2 py-2">
                        <Skeleton variant="text" className="w-1/2 h-4" />
                        <Skeleton variant="text" className="w-2/3 h-4" />
                      </div>
                    ) : detailError ? (
                      <div role="alert" className="text-xs text-ink">
                        Could not load reviewers: {detailError}{' '}
                        <button type="button" onClick={() => loadDetail(c.id)} className="font-semibold underline cursor-pointer">
                          Retry
                        </button>
                      </div>
                    ) : detail && detail.reviewers.length > 0 ? (
                      <div className="divide-y divide-rule border border-rule rounded-card bg-surface overflow-hidden">
                        {detail.reviewers.map((r) => {
                          return (
                            <div
                              key={r.person.id}
                              className="p-3 text-xs flex items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-ink">{r.person.name}</span>
                                <span className="text-ink-3 font-mono text-[11px]">
                                  ({r.completed} of {r.total} {r.total === 1 ? 'system' : 'systems'} answered)
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded-badge text-[10px] font-mono font-semibold',
                                    r.completed === r.total
                                      ? 'bg-st-pass/15 text-st-pass'
                                      : 'bg-amber/15 text-amber-ink',
                                  )}
                                >
                                  {r.completed === r.total ? 'Done' : 'Waiting'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-ink-3 italic">
                        No reviewers assigned or questions pending.
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
