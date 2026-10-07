'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ReviewerTasks } from '@/types/view';
import { Card } from '@/components/ui/Card';
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
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const reasonOf = (err: unknown) => (err instanceof Error ? err.message : 'Please retry.');

  const handleAccept = async (handoverId: string, assetName: string) => {
    setProcessingId(handoverId);
    setNotice(null);
    try {
      await acceptHandover(handoverId);
      setNotice({ kind: 'ok', text: `You now own ${assetName}. It's recorded as confirmed by you.` });
      tasksResource.reload();
    } catch (err) {
      setNotice({ kind: 'error', text: `Could not accept ${assetName}: ${reasonOf(err)}` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineSubmit = async (e: React.FormEvent, handoverId: string, assetName: string) => {
    e.preventDefault();
    if (!declineReason.trim()) return;

    setProcessingId(handoverId);
    setNotice(null);
    try {
      await declineHandover(handoverId, declineReason.trim());
      setNotice({ kind: 'ok', text: `Declined ${assetName}. HR will see your reason and pick someone else.` });
      setDecliningHandoverId(null);
      setDeclineReason('');
      tasksResource.reload();
    } catch (err) {
      setNotice({ kind: 'error', text: `Could not decline ${assetName}: ${reasonOf(err)}` });
    } finally {
      setProcessingId(null);
    }
  };

  const confirmations = tasksData?.confirmations || [];
  const handovers = tasksData?.handovers || [];
  const totalTasks = confirmations.length + handovers.reduce((n, h) => n + h.assets.length, 0);

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
          <h1 className="text-2xl sm:text-3xl text-ink font-semibold tracking-tight">
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

      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={cn(
            'rounded-control border p-3 text-xs',
            notice.kind === 'error' ? 'bg-st-fail/10 border-st-fail/30 text-ink' : 'bg-amber/10 border-amber/30 text-amber-ink'
          )}
        >
          {notice.text}
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
                      <h3 className="text-lg font-semibold text-ink">
                        {c.campaignName}
                      </h3>
                      <p className="text-xs text-ink-3 font-mono">
                        {c.assetCount} {c.assetCount === 1 ? 'automation' : 'automations'} to certify · Due {formatDate(c.dueDate)}
                      </p>
                    </div>

                    <Link
                      href={`/attest/${c.token}`}
                      className="rounded-control bg-amber text-on-amber px-4 py-2 text-xs font-semibold hover:bg-amber-hover transition-colors inline-flex items-center justify-center shrink-0 min-h-[44px]"
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
                  Successor Handover Requests ({handovers.reduce((n, h) => n + h.assets.length, 0)})
                </h2>
                <span className="text-xs text-ink-3 font-mono">
                  Requires acceptance or feedback
                </span>
              </div>

              <div className="space-y-6">
                {handovers.map((h) => (
                  <Card key={h.departureId} className="p-6 bg-surface border border-rule shadow-card space-y-5">
                    <div className="border-b border-rule/50 pb-3">
                      <h3 className="text-xl font-semibold text-ink">
                        {h.from.name} is handing over {h.assets.length} {h.assets.length === 1 ? 'system' : 'systems'} to you
                      </h3>
                      <p className="text-xs text-ink-3 mt-0.5">
                        Leaving {formatDate(h.leaveDate)}. Accepting records you as the confirmed owner. Answer each system
                        separately.
                      </p>
                    </div>

                    <ul className="divide-y divide-rule border border-rule rounded-card overflow-hidden">
                      {h.assets.map((item) => {
                        const isDeclining = decliningHandoverId === item.handoverId;
                        const isBusy = processingId === item.handoverId;
                        return (
                          <li key={item.handoverId} className="p-4 bg-surface text-xs space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-ink text-sm">{item.asset.name}</span>
                                <span className="text-[10px] font-mono uppercase text-ink-3">({item.asset.kind})</span>
                              </div>
                              <CriticalityDots level={item.criticality} />
                            </div>

                            <div className="flex flex-col gap-1.5 text-[11px] text-ink-3">
                              <div>
                                <span className="font-medium text-ink-2">Runbook: </span>
                                {item.runbookUrl ? (
                                  <a
                                    href={item.runbookUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-amber-ink hover:underline font-mono break-all"
                                  >
                                    {item.runbookUrl}
                                  </a>
                                ) : (
                                  <span className="italic">No runbook link on record</span>
                                )}
                              </div>
                              {item.credentialNote && (
                                <p className="text-amber-ink">
                                  <span aria-hidden="true">⚠ </span>
                                  {item.credentialNote}
                                </p>
                              )}
                            </div>

                            {!isDeclining ? (
                              <div className="flex items-center justify-end gap-3">
                                <button
                                  type="button"
                                  disabled={processingId !== null}
                                  onClick={() => {
                                    setDecliningHandoverId(item.handoverId);
                                    setDeclineReason('');
                                  }}
                                  aria-label={`I can't take ${item.asset.name}`}
                                  className="rounded-control border border-rule bg-surface px-4 py-2 text-xs font-medium text-ink-3 hover:text-ink hover:bg-surface-sunken transition-colors cursor-pointer min-h-[44px] disabled:opacity-50"
                                >
                                  I can&apos;t take this
                                </button>
                                <button
                                  type="button"
                                  disabled={processingId !== null}
                                  onClick={() => handleAccept(item.handoverId, item.asset.name)}
                                  aria-label={`Accept ${item.asset.name}`}
                                  className="rounded-control bg-amber text-on-amber px-5 py-2 text-xs font-semibold hover:bg-amber-hover transition-colors cursor-pointer min-h-[44px] shadow-xs disabled:opacity-50"
                                >
                                  {isBusy ? 'Accepting…' : 'Accept'}
                                </button>
                              </div>
                            ) : (
                              <form
                                onSubmit={(e) => handleDeclineSubmit(e, item.handoverId, item.asset.name)}
                                className="rounded-card border border-rule bg-surface-sunken/40 p-4 space-y-3"
                              >
                                <label htmlFor={`decline-reason-${item.handoverId}`} className="text-xs font-semibold text-ink block">
                                  Why can&apos;t you take over {item.asset.name}? HR uses this to pick someone else.
                                </label>
                                <textarea
                                  id={`decline-reason-${item.handoverId}`}
                                  required
                                  rows={3}
                                  value={declineReason}
                                  onChange={(e) => setDeclineReason(e.target.value)}
                                  placeholder="e.g. No access to the AWS account; moving teams next week."
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
                                    disabled={!declineReason.trim() || isBusy}
                                    className="rounded-control bg-st-fail text-paper px-4 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 min-h-[40px]"
                                  >
                                    {isBusy ? 'Declining…' : 'Confirm decline'}
                                  </button>
                                </div>
                              </form>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
