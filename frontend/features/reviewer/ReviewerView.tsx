'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ReviewerTasks } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CriticalityDots } from '@/components/ui/marks';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import {
  fetchReviewerTasks,
  acceptHandover,
  declineHandover,
} from '@/lib/api/reviewer';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface ReviewerViewProps {
  initialTasks?: ReviewerTasks;
}

export function ReviewerView({ initialTasks }: ReviewerViewProps) {
  const tasksResource = useResource<ReviewerTasks>(
    'reviewer-my-tasks',
    fetchReviewerTasks,
  );

  const tasksData =
    tasksResource.status === 'ready'
      ? tasksResource.data
      : initialTasks;

  const [decliningHandoverId, setDecliningHandoverId] = React.useState<string | null>(null);
  const [declineReason, setDeclineReason] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [statusNotice, setStatusNotice] = React.useState<string | null>(null);

  const handleAccept = async (handoverId: string) => {
    setIsProcessing(true);
    setStatusNotice(null);
    try {
      await acceptHandover(handoverId);
      setStatusNotice('Handover successfully accepted.');
      tasksResource.reload();
    } catch {
      setStatusNotice('Failed to accept handover. Please retry.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineSubmit = async (e: React.FormEvent, handoverId: string) => {
    e.preventDefault();
    if (!declineReason.trim()) return;

    setIsProcessing(true);
    setStatusNotice(null);
    try {
      await declineHandover(handoverId, declineReason.trim());
      setStatusNotice('Handover declined with feedback.');
      setDecliningHandoverId(null);
      setDeclineReason('');
      tasksResource.reload();
    } catch {
      setStatusNotice('Failed to decline handover. Please retry.');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmations = tasksData?.confirmations || [];
  const handovers = tasksData?.handovers || [];
  const totalTasks = confirmations.length + handovers.length;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Page Header */}
      <div className="border-b border-rule/50 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
              Reviewer Portal
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink font-normal tracking-tight">
            My Review Tasks
          </h1>
          <p className="text-sm text-ink-3 mt-1">
            Ownership certifications and successor asset handovers assigned to you.
          </p>
        </div>

        {totalTasks > 0 && (
          <span className="px-3 py-1 rounded-badge bg-amber/15 text-amber-ink font-mono text-xs font-semibold self-start sm:self-center">
            {totalTasks} pending {totalTasks === 1 ? 'task' : 'tasks'}
          </span>
        )}
      </div>

      {statusNotice && (
        <div className="rounded-control bg-amber/10 border border-amber/30 p-3 text-xs text-amber-ink font-mono">
          {statusNotice}
        </div>
      )}

      {/* Loading state */}
      {tasksResource.status === 'loading' && !initialTasks ? (
        <div className="space-y-4">
          <Skeleton variant="card" className="h-32" />
          <Skeleton variant="card" className="h-48" />
        </div>
      ) : tasksResource.status === 'error' && !initialTasks ? (
        <ErrorState
          onRetry={tasksResource.reload}
          message="Could not load reviewer tasks."
        />
      ) : totalTasks === 0 ? (
        <EmptyState
          title="All caught up"
          description="You have no pending system certifications or asset handovers to review."
        />
      ) : (
        <div className="space-y-8">
          {/* Section 1: Attestation Confirmations */}
          {confirmations.length > 0 && (
            <section aria-labelledby="confirmations-heading" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 id="confirmations-heading" className="text-sm font-semibold uppercase tracking-wider text-ink font-mono">
                  Pending System Attestations ({confirmations.length})
                </h2>
                <span className="text-xs text-ink-3 font-mono">
                  Self-service questionnaires
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {confirmations.map((c) => (
                  <Card
                    key={c.token}
                    className="p-5 bg-surface border border-rule shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <h3 className="font-serif text-lg font-normal text-ink">
                        {c.campaignName}
                      </h3>
                      <p className="text-xs text-ink-3 font-mono">
                        {c.assetCount} {c.assetCount === 1 ? 'automation' : 'automations'} to certify · Due {formatDate(c.dueDate)}
                      </p>
                    </div>

                    <Link
                      href={`/attest/${c.token}`}
                      className="rounded-control bg-amber text-paper px-4 py-2 text-xs font-semibold hover:bg-amber-hover transition-colors inline-flex items-center justify-center shrink-0 min-h-[44px]"
                    >
                      Start Confirmation →
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Section 2: Successor Handover Requests */}
          {handovers.length > 0 && (
            <section aria-labelledby="handovers-heading" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 id="handovers-heading" className="text-sm font-semibold uppercase tracking-wider text-ink font-mono">
                  Successor Handover Requests ({handovers.length})
                </h2>
                <span className="text-xs text-ink-3 font-mono">
                  Requires acceptance or feedback
                </span>
              </div>

              <div className="space-y-6">
                {handovers.map((h) => {
                  const isDeclining = decliningHandoverId === h.id;

                  return (
                    <Card
                      key={h.id}
                      className="p-6 bg-surface border border-rule shadow-card space-y-5"
                    >
                      <div className="border-b border-rule/50 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="font-serif text-xl font-normal text-ink">
                            {h.from.name} is handing over {h.assets.length} {h.assets.length === 1 ? 'system' : 'systems'}
                          </h3>
                          <p className="text-xs text-ink-3 mt-0.5">
                            You have been designated as primary successor for these operational assets.
                          </p>
                        </div>

                        <span className="px-2 py-0.5 rounded-badge bg-surface-sunken text-xs font-mono text-ink-2 self-start sm:self-auto">
                          Action required
                        </span>
                      </div>

                      {/* Assets Table */}
                      <div className="divide-y divide-rule border border-rule rounded-card overflow-hidden">
                        {h.assets.map((item) => (
                          <div
                            key={item.asset.id}
                            className="p-4 bg-surface text-xs space-y-2 hover:bg-surface-sunken/30 transition-colors"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-ink">{item.asset.name}</span>
                                <span className="text-[10px] font-mono uppercase text-ink-3">
                                  ({item.asset.kind})
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <CriticalityDots level={item.criticality} />
                                <span className="font-mono text-[11px] uppercase text-ink-3">
                                  {item.criticality} criticality
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-ink-3">
                              <div>
                                <span className="font-medium text-ink-2">Runbook: </span>
                                {item.runbookUrl ? (
                                  <a
                                    href={item.runbookUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-amber-ink hover:underline font-mono"
                                  >
                                    {item.runbookUrl}
                                  </a>
                                ) : (
                                  <span className="italic text-ink-3">Not documented</span>
                                )}
                              </div>

                              {item.credentialNote && (
                                <div className="text-amber-ink font-mono">
                                  ⚠️ {item.credentialNote}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Acceptance Actions */}
                      {!isDeclining ? (
                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDecliningHandoverId(h.id);
                              setDeclineReason('');
                            }}
                            className="rounded-control border border-rule bg-surface px-4 py-2 text-xs font-medium text-ink-3 hover:text-ink hover:bg-surface-sunken transition-colors cursor-pointer min-h-[44px]"
                          >
                            I can't take this
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleAccept(h.id)}
                            className="rounded-control bg-amber text-paper px-5 py-2 text-xs font-semibold hover:bg-amber-hover transition-colors cursor-pointer min-h-[44px] shadow-xs"
                          >
                            Accept Handover
                          </button>
                        </div>
                      ) : (
                        <form
                          onSubmit={(e) => handleDeclineSubmit(e, h.id)}
                          className="rounded-card border border-rule bg-surface-sunken/40 p-4 space-y-3"
                        >
                          <label htmlFor={`decline-reason-${h.id}`} className="text-xs font-semibold text-ink block">
                            Reason you cannot take over these assets (Required for team re-routing):
                          </label>
                          <textarea
                            id={`decline-reason-${h.id}`}
                            required
                            rows={3}
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                            placeholder="e.g. Lacking permissions on AWS account; moving to Core Platform next week."
                            className="w-full rounded-control border border-rule bg-surface p-2.5 text-xs text-ink placeholder:text-ink-3 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
                          />
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setDecliningHandoverId(null);
                                setDeclineReason('');
                              }}
                              className="rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken cursor-pointer min-h-[40px]"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={!declineReason.trim() || isProcessing}
                              className="rounded-control bg-st-fail text-paper px-4 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 min-h-[40px]"
                            >
                              Confirm Decline
                            </button>
                          </div>
                        </form>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
