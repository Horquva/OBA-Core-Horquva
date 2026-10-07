'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ActionView, ActionStatus, EntityRef } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PersonPicker, type PersonItem } from '@/components/ui/PersonPicker';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchActions, assignBackup, acceptRisk } from '@/lib/api/actions';
import { fetchPeople } from '@/lib/api/entities';
import { useSession } from '@/lib/session';
import { canEdit, canManageSettings } from '@/lib/permissions';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationsTab } from './ConfirmationsTab';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface ActionsViewProps {
  initialActions?: ActionView[];
  defaultTab?: 'actions' | 'confirmations';
}

export function ActionsView({
  initialActions,
  defaultTab = 'actions',
}: ActionsViewProps) {
  const [activeTab, setActiveTab] = React.useState<'actions' | 'confirmations'>(defaultTab);
  const [statusFilter, setStatusFilter] = React.useState<ActionStatus | 'all'>('all');

  const actionsResource = useResource<ActionView[]>(
    'actions-list',
    () => fetchActions(),
  );

  const actionsData =
    actionsResource.status === 'ready'
      ? actionsResource.data
      : initialActions || [];

  // Filter & sort by rank
  const filteredActions = React.useMemo(() => {
    let list = [...actionsData];
    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter);
    }
    return list.sort((a, b) => a.rank - b.rank);
  }, [actionsData, statusFilter]);

  const { toast } = useToast();
  const { session } = useSession();
  // Same rules as the backend RBAC: admins/reviewers assign backups; only admins accept risk.
  const mayAssign = canEdit(session);
  const mayAcceptRisk = canManageSettings(session);
  const peopleResource = useResource(mayAssign ? 'people-picker' : null, fetchPeople);
  const peopleOptions: PersonItem[] = peopleResource.status === 'ready' ? peopleResource.data : [];

  // Modal / Inline State for Assign Backup
  const [assigningActionId, setAssigningActionId] = React.useState<string | null>(null);
  const [isAssigning, setIsAssigning] = React.useState(false);

  // Modal State for Accept Risk
  const [riskAction, setRiskAction] = React.useState<ActionView | null>(null);
  const [riskReason, setRiskReason] = React.useState('');
  const [riskExpiryDays, setRiskExpiryDays] = React.useState(90);
  const [isAcceptingRisk, setIsAcceptingRisk] = React.useState(false);

  // Execute assign backup
  const handleAssignBackup = async (actionId: string, person: EntityRef | null) => {
    if (!person) return;
    setIsAssigning(true);
    try {
      await assignBackup(actionId, person.id);
      setAssigningActionId(null);
      toast({
        title: 'Backup assigned',
        description: `${person.name} is recorded as backup (stated). It becomes confirmed when they confirm it themselves.`,
      });
      actionsResource.reload();
    } catch (err: any) {
      toast({ title: "Backup wasn't assigned", description: err?.message || 'The backend refused the assignment.', variant: 'error' });
    } finally {
      setIsAssigning(false);
    }
  };

  // Execute accept risk
  const handleAcceptRiskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riskAction || !riskReason.trim()) return;

    setIsAcceptingRisk(true);
    try {
      const expiresAt = new Date(Date.now() + riskExpiryDays * 24 * 60 * 60 * 1000).toISOString();
      await acceptRisk(riskAction.id, { reason: riskReason.trim(), expiresAt });
      setRiskAction(null);
      setRiskReason('');
      toast({ title: 'Risk accepted', description: `Until ${formatDate(expiresAt)}. It reopens automatically after that.` });
      actionsResource.reload();
    } catch (err: any) {
      toast({ title: "Risk wasn't accepted", description: err?.message || 'The backend refused it.', variant: 'error' });
    } finally {
      setIsAcceptingRisk(false);
    }
  };

  const openCount = actionsData.filter((a) => a.status === 'open').length;

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/50 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
              Remediation & Certifications
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl text-ink font-semibold tracking-tight">
            Actions & Confirmations
          </h1>
          <p className="text-sm text-ink-3 mt-1">
            Prioritized corrective tasks to eliminate continuity gaps and verify single points of failure.
          </p>
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-rule pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('actions')}
          className={cn(
            'px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2',
            activeTab === 'actions'
              ? 'border-amber text-amber-ink font-semibold'
              : 'border-transparent text-ink-3 hover:text-ink',
          )}
        >
          <span>Remediation Actions</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-badge text-[11px] font-mono',
              activeTab === 'actions'
                ? 'bg-amber/15 text-amber-ink'
                : 'bg-surface-sunken text-ink-3',
            )}
          >
            {openCount} open
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('confirmations')}
          className={cn(
            'px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2',
            activeTab === 'confirmations'
              ? 'border-amber text-amber-ink font-semibold'
              : 'border-transparent text-ink-3 hover:text-ink',
          )}
        >
          <span>Confirmation Campaigns</span>
        </button>
      </div>

      {activeTab === 'confirmations' ? (
        <ConfirmationsTab />
      ) : (
        <div className="space-y-6">
          {/* Status Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1 border border-rule rounded-control p-0.5 bg-surface text-xs">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'open', label: 'Open' },
                  { id: 'in_progress', label: 'In Progress' },
                  { id: 'resolved', label: 'Resolved' },
                  { id: 'accepted_risk', label: 'Accepted Risk' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-control transition-colors cursor-pointer',
                    statusFilter === tab.id
                      ? 'bg-amber text-on-amber font-semibold'
                      : 'text-ink-3 hover:text-ink',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-ink-3 font-mono">
              Ranked automatically by failure severity & downstream blast radius
            </p>
          </div>

          {/* Actions List */}
          {actionsResource.status === 'loading' && !initialActions ? (
            <div className="space-y-4">
              <Skeleton variant="card" className="h-32" />
              <Skeleton variant="card" className="h-32" />
              <Skeleton variant="card" className="h-32" />
            </div>
          ) : actionsResource.status === 'error' && !initialActions ? (
            <ErrorState
              onRetry={actionsResource.reload}
              message="Could not load prioritized remediation actions."
            />
          ) : filteredActions.length === 0 ? (
            <EmptyState
              title="No actions in this view"
              description="All identified continuity actions matching this status filter have been addressed."
            />
          ) : (
            <div className="space-y-4">
              {filteredActions.map((action) => {
                const isAssigningHere = assigningActionId === action.id;

                return (
                  <Card
                    key={action.id}
                    className="p-6 bg-surface border border-rule shadow-xs space-y-4 transition-colors hover:border-ink-3/40"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Rank & Problem Info */}
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-sunken font-mono text-xs font-bold text-ink shrink-0">
                          #{action.rank}
                        </span>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-ink-3 uppercase">
                              {action.checkId}
                            </span>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-badge text-[10px] font-mono uppercase font-semibold',
                                action.status === 'open' && 'bg-amber/15 text-amber-ink',
                                action.status === 'in_progress' && 'bg-ev-stated/15 text-ev-stated',
                                action.status === 'resolved' && 'bg-st-pass/15 text-st-pass',
                                action.status === 'accepted_risk' && 'bg-surface-sunken text-ink-2',
                              )}
                            >
                              {action.status.replace('_', ' ')}
                            </span>
                            <span className="px-2 py-0.5 rounded-badge bg-surface-sunken text-[10px] font-mono text-ink-3">
                              {action.criticalAssetsAffected} critical assets affected
                            </span>
                          </div>

                          <h2 className="text-lg font-semibold text-ink leading-snug">
                            {action.problem}
                          </h2>

                          <p className="text-xs text-ink-2">
                            Impacted asset:{' '}
                            <Link
                              href={`/assets/${action.asset.id}`}
                              className="font-medium text-ink hover:text-amber-ink underline decoration-rule hover:decoration-ink"
                            >
                              {action.asset.name}
                            </Link>{' '}
                            · <span className="text-ink-3">Fact: {action.failingFact}</span>
                          </p>
                        </div>
                      </div>

                      {/* Action Triggers */}
                      <div className="flex flex-wrap items-center gap-2 sm:self-center shrink-0">
                        {action.status === 'open' && (
                          <>
                            {action.primary.kind === 'assign_backup' ? (
                              mayAssign && (
                              <button
                                type="button"
                                onClick={() => setAssigningActionId(isAssigningHere ? null : action.id)}
                                className="rounded-control bg-amber text-on-amber px-3 py-1.5 text-xs font-semibold hover:bg-amber-hover transition-colors cursor-pointer"
                              >
                                {isAssigningHere ? 'Cancel' : 'Assign Backup'}
                              </button>
                              )
                            ) : (
                              <Link
                                href={action.primary.href}
                                className="rounded-control bg-amber text-on-amber px-3 py-1.5 text-xs font-semibold hover:bg-amber-hover transition-colors inline-block"
                              >
                                {action.primary.label}
                              </Link>
                            )}

                            {mayAcceptRisk && (
                            <button
                              type="button"
                              onClick={() => {
                                setRiskAction(action);
                                setRiskReason('');
                              }}
                              className="rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink-3 hover:text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                            >
                              Accept Risk
                            </button>
                            )}
                          </>
                        )}

                        {action.status === 'accepted_risk' && action.acceptedRisk && (
                          <div className="text-right text-xs">
                            <span className="text-[11px] font-mono text-ink-3 block">
                              Accepted by {action.acceptedRisk.acceptedBy}
                            </span>
                            <span className="text-[11px] font-mono text-ink-3 block">
                              Expires {formatDate(action.acceptedRisk.expiresAt)}
                            </span>
                          </div>
                        )}

                        {action.status === 'resolved' && action.resolvedAt && (
                          <span className="text-xs font-mono text-st-pass">
                            Resolved on {formatDate(action.resolvedAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Inline Person Picker for Backup Assignment */}
                    {isAssigningHere && (
                      <div className="rounded-card border border-amber/30 bg-amber/5 p-4 space-y-2">
                        <label className="text-xs font-semibold text-ink block">
                          Select Backup Nominee for {action.asset.name}:
                        </label>
                        <div className="w-full sm:w-80">
                          <PersonPicker
                            placeholder={peopleResource.status === 'error' ? "Couldn't load people" : 'Choose person...'}
                            options={peopleOptions}
                            disabled={isAssigning}
                            onChange={(p) => handleAssignBackup(action.id, p)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Accepted Risk Reason Callout */}
                    {action.status === 'accepted_risk' && action.acceptedRisk && (
                      <div className="rounded-control bg-surface-sunken/60 p-3 border border-rule/50 text-xs text-ink-3 space-y-1">
                        <p className="font-medium text-ink">Accepted Risk Rationale:</p>
                        <p className="italic">"{action.acceptedRisk.reason}"</p>
                        <p className="text-[11px] text-ink-3 font-mono pt-1">
                          Note: Under SIM-08, accepted risks remain fully counted in executive headline metrics.
                        </p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Accept Risk Dialog Modal */}
      {riskAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-ink-night/40 backdrop-blur-xs"
            onClick={() => setRiskAction(null)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="accept-risk-title"
            className="relative z-10 w-full max-w-md rounded-card border border-rule bg-surface p-6 shadow-2xl space-y-5"
          >
            <div className="space-y-1 border-b border-rule/50 pb-3">
              <h2 id="accept-risk-title" className="text-xl font-semibold text-ink">
                Accept Risk for #{riskAction.rank}
              </h2>
              <p className="text-xs text-ink-3">
                Asset: <strong className="text-ink">{riskAction.asset.name}</strong>
              </p>
            </div>

            <form onSubmit={handleAcceptRiskSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label htmlFor="risk-reason" className="font-semibold text-ink block">
                  Business Justification (Required)
                </label>
                <textarea
                  id="risk-reason"
                  required
                  rows={3}
                  value={riskReason}
                  onChange={(e) => setRiskReason(e.target.value)}
                  placeholder="e.g. System scheduled for sunset in Q4; manual failover verified."
                  className="w-full rounded-control border border-rule bg-surface p-2.5 text-xs text-ink placeholder:text-ink-3 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="risk-expiry" className="font-semibold text-ink block">
                  Risk Acceptance Expiration
                </label>
                <select
                  id="risk-expiry"
                  value={riskExpiryDays}
                  onChange={(e) => setRiskExpiryDays(Number(e.target.value))}
                  className="w-full rounded-control border border-rule bg-surface p-2 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
                >
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days (Recommended)</option>
                  <option value={180}>180 Days</option>
                  <option value={365}>1 Year</option>
                </select>
              </div>

              <div className="rounded-control bg-surface-sunken p-3 text-[11px] text-ink-3 border border-rule/60">
                <strong className="text-ink block mb-0.5">Integrity Invariant:</strong>
                Accepting risk documents organizational consent, but does <em>not</em> remove this asset from headline exposure counts.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-rule/50">
                <button
                  type="button"
                  onClick={() => setRiskAction(null)}
                  className="rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!riskReason.trim() || isAcceptingRisk}
                  className="rounded-control bg-amber text-on-amber px-4 py-1.5 text-xs font-semibold hover:bg-amber-hover transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isAcceptingRisk ? 'Submitting...' : 'Confirm Risk Acceptance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
