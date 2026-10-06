'use client';

import * as React from 'react';
import Link from 'next/link';
import type {
  DepartureDetail as DepartureDetailType,
  SuccessorAssignment,
  SuccessionPlanResult,
  EntityRef,
} from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StageStepper } from '@/components/ui/StageStepper';
import { CriticalityDots, EvidenceBadge, NoneValue, UnknownValue } from '@/components/ui/marks';
import { Skeleton, ErrorState } from '@/components/ui/states';
import { PersonPicker } from '@/components/ui/PersonPicker';
import { SuccessionPanel } from './SuccessionPanel';
import {
  fetchDeparture,
  simulateSuccessionPlan,
  saveSuccessors,
  sendAcceptanceRequests,
} from '@/lib/api/departures';
import { useResource } from '@/lib/useResource';
import { formatDate, formatRelative, formatRunsPerWeek } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

export interface DepartureDetailProps {
  id: string;
  initialDetail?: DepartureDetailType;
}

export function DepartureDetail({ id, initialDetail }: DepartureDetailProps) {
  const { toast } = useToast();

  const departureResource = useResource<DepartureDetailType>(
    `departure-${id}`,
    () => fetchDeparture(id),
  );

  const detail =
    departureResource.status === 'ready'
      ? departureResource.data
      : initialDetail;

  // Local successor assignment state: assetId -> successor EntityRef
  const [assignments, setAssignments] = React.useState<Record<string, EntityRef | null>>({});
  const [hasChanges, setHasChanges] = React.useState(false);

  // Initialize assignments from detail when loaded
  React.useEffect(() => {
    if (detail?.handover) {
      const initial: Record<string, EntityRef | null> = {};
      for (const item of detail.handover) {
        initial[item.asset.id] = item.successor;
      }
      setAssignments(initial);
      setHasChanges(false);
    }
  }, [detail]);

  // Simulation results state
  const [simResult, setSimResult] = React.useState<SuccessionPlanResult | null>(null);
  const [isSimulating, setIsSimulating] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  // Trigger succession simulation when assignments change
  React.useEffect(() => {
    if (!detail) return;

    const assignmentList: SuccessorAssignment[] = Object.entries(assignments)
      .filter(([_, succ]) => succ !== null)
      .map(([assetId, succ]) => ({ assetId, successorId: succ!.id }));

    let active = true;
    setIsSimulating(true);

    simulateSuccessionPlan(detail.id, assignmentList)
      .then((res) => {
        if (active) {
          setSimResult(res);
        }
      })
      .catch((err) => {
        console.warn('Succession simulation fallback:', err);
      })
      .finally(() => {
        if (active) setIsSimulating(false);
      });

    return () => {
      active = false;
    };
  }, [assignments, detail]);

  const handleAssignSuccessor = (assetId: string, successor: EntityRef | null) => {
    setAssignments((prev) => ({ ...prev, [assetId]: successor }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!detail) return;
    setIsSaving(true);
    try {
      const assignmentList: SuccessorAssignment[] = Object.entries(assignments)
        .filter(([_, succ]) => succ !== null)
        .map(([assetId, succ]) => ({ assetId, successorId: succ!.id }));

      await saveSuccessors(detail.id, assignmentList);
      toast({
        title: 'Successors saved',
        description: 'Successor assignments recorded for handover tracking.',
      });
      setHasChanges(false);
      departureResource.reload();
    } catch (err: any) {
      toast({
        title: 'Failed to save',
        description: err?.message || 'Could not record successors.',
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendAcceptance = async () => {
    if (!detail) return;
    setIsSending(true);
    try {
      await sendAcceptanceRequests(detail.id);
      toast({
        title: 'Acceptance requests dispatched',
        description: 'Confirmation emails dispatched to proposed successor operators.',
      });
      departureResource.reload();
    } catch (err: any) {
      toast({
        title: 'Failed to dispatch',
        description: err?.message || 'Could not send acceptance requests.',
        variant: 'error',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (departureResource.status === 'loading' && !detail) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-16">
        <Skeleton variant="text" className="w-1/4 h-5" />
        <Skeleton variant="card" className="h-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton variant="card" className="lg:col-span-2 h-96" />
          <Skeleton variant="card" className="h-96" />
        </div>
      </div>
    );
  }

  if (departureResource.status === 'error' && !detail) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <ErrorState
          onRetry={departureResource.reload}
          message="We couldn't load this departure handover record."
          lastLoadedAt={departureResource.lastLoadedAt || undefined}
        />
      </div>
    );
  }

  if (!detail) return null;

  const initials = detail.person.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header & Back Navigation */}
      <div className="space-y-4">
        <Link
          href="/departures"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-ink transition-colors"
        >
          <span aria-hidden="true">←</span>
          <span>Back to Departures</span>
        </Link>

        {/* Leaver Identity & Lifecycle Card */}
        <Card className="p-6 sm:p-8 bg-surface shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-rule/50">
            <div className="flex items-start gap-4">
              <span className="h-14 w-14 rounded-full bg-surface-sunken border border-rule font-serif text-2xl font-normal flex items-center justify-center text-ink shrink-0">
                {initials}
              </span>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-normal text-ink">
                    {detail.person.name}
                  </h1>

                  {detail.hasAlert && (
                    <span className="px-2 py-0.5 rounded-badge bg-amber text-paper text-xs font-semibold">
                      Discontinuity Alert
                    </span>
                  )}

                  <span className="text-xs px-2 py-0.5 rounded-badge bg-surface-sunken text-ink-3 font-mono">
                    Source: {detail.detectedFrom}
                  </span>
                </div>

                <p className="text-sm text-ink-3">
                  {detail.role || 'Member'} {detail.team ? `· ${detail.team}` : ''}
                </p>

                <p className="text-xs text-ink-2 font-mono">
                  Leave Date: {formatDate(detail.leaveDate)} ({formatRelative(detail.leaveDate)})
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <p className="text-xs uppercase font-mono text-ink-3">Handover Coverage</p>
              <p className="text-xl font-bold font-sans text-ink">
                <span className="tabular-nums">{detail.assetsHandedOver}</span> /{' '}
                <span className="tabular-nums">{detail.assetsTotal}</span> assets covered
              </p>
            </div>
          </div>

          {/* Departure Lifecycle Stepper */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
              Handover Lifecycle Stage
            </h2>
            <StageStepper currentStage={detail.stage} />
          </div>
        </Card>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Handover Table & Exposure Feeds (col-span-2) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Handover Assets Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">Handover Workbench</h2>
                <p className="text-xs text-ink-3">
                  Map each critical asset to a qualified secondary owner.
                </p>
              </div>
              <span className="text-xs text-ink-3 font-mono">
                {detail.handover.length} tracked assets
              </span>
            </div>

            <div className="overflow-x-auto rounded-card border border-rule bg-surface shadow-xs">
              <table className="w-full text-left text-xs text-ink">
                <thead className="border-b border-rule bg-surface-sunken/60 font-mono text-[11px] uppercase text-ink-3">
                  <tr>
                    <th scope="col" className="p-3.5">Asset</th>
                    <th scope="col" className="p-3.5">Criticality</th>
                    <th scope="col" className="p-3.5">Current Backup</th>
                    <th scope="col" className="p-3.5">Successor</th>
                    <th scope="col" className="p-3.5">Acceptance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule font-sans">
                  {detail.handover.map((item) => {
                    const assigned = assignments[item.asset.id] ?? item.successor;
                    return (
                      <tr key={item.asset.id} className="hover:bg-surface-sunken/30 transition-colors">
                        {/* Asset Name */}
                        <td className="p-3.5 font-medium">
                          <Link
                            href={`/assets/${item.asset.id}`}
                            className="text-ink hover:text-amber-ink font-semibold transition-colors"
                          >
                            {item.asset.name}
                          </Link>
                          {item.suggestion && (
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-3">
                              <span className="text-amber-ink font-semibold">Suggested:</span>
                              <span>{item.suggestion.person.name}</span>
                              <span className="italic text-ink-3/80">({item.suggestion.reason})</span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAssignSuccessor(item.asset.id, item.suggestion!.person)
                                }
                                className="text-amber-ink hover:underline font-semibold ml-1 cursor-pointer"
                              >
                                Accept
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Criticality */}
                        <td className="p-3.5 whitespace-nowrap">
                          <CriticalityDots level={item.criticality} />
                        </td>

                        {/* Current Backup */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <EvidenceBadge grade={item.currentBackup.grade} />
                            {item.currentBackup.state === 'none' ? (
                              <NoneValue />
                            ) : item.currentBackup.state === 'unknown' ? (
                              <UnknownValue />
                            ) : (
                              <span className="text-ink-2">{item.currentBackup.display || 'None'}</span>
                            )}
                          </div>
                        </td>

                        {/* Successor Assignment */}
                        <td className="p-3.5 min-w-[180px]">
                          <PersonPicker
                            value={assigned}
                            onChange={(p) => handleAssignSuccessor(item.asset.id, p)}
                            placeholder="Assign successor..."
                          />
                        </td>

                        {/* Acceptance Status */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-badge text-[11px] font-semibold',
                              item.acceptance === 'accepted' && 'bg-st-pass/10 text-st-pass',
                              item.acceptance === 'requested' && 'bg-amber/15 text-amber-ink',
                              item.acceptance === 'declined' && 'bg-st-fail/10 text-st-fail',
                              item.acceptance === 'none' && 'bg-surface-sunken text-ink-3',
                            )}
                          >
                            {item.acceptance.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Personal Credential Automations Warning */}
          {detail.personalCredentialAutomations.length > 0 && (
            <Card className="p-6 border-amber/50 bg-amber/5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-ink">
                  Personal Credential Risk ({detail.personalCredentialAutomations.length} automations)
                </h3>
              </div>
              <p className="text-xs text-ink-2 leading-relaxed">
                These critical workflows run using personal API tokens or OAuth grants owned by {detail.person.name}. When the Google/Entra account is disabled, these workflows will fail immediately unless credentials are rotated to a dedicated service account.
              </p>

              <ul className="divide-y divide-rule border-t border-rule/50 pt-2 text-xs">
                {detail.personalCredentialAutomations.map((item) => (
                  <li key={item.workflow.id} className="py-2 flex items-center justify-between">
                    <span className="font-medium text-ink">{item.workflow.name}</span>
                    <span className="font-mono text-ink-3">
                      {formatRunsPerWeek(item.weeklyRuns)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Undocumented Assets Warning */}
          {detail.undocumented.length > 0 && (
            <Card className="p-6 space-y-3 bg-surface">
              <h3 className="text-sm font-semibold text-ink">
                Missing Documentation ({detail.undocumented.length} assets)
              </h3>
              <p className="text-xs text-ink-3 leading-relaxed">
                The following assets owned by {detail.person.name} do not have verified runbook documentation. Request handover runbooks prior to the leave date.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {detail.undocumented.map((asset) => (
                  <span
                    key={asset.id}
                    className="px-2.5 py-1 rounded-badge bg-surface-sunken border border-rule text-xs text-ink font-medium"
                  >
                    {asset.name}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* 72-Hour Post-Departure Watch Log */}
          {detail.watchLog && detail.watchLog.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
                  72-Hour Post-Departure Watch Log
                </h3>
                <span className="text-xs text-ink-3 font-mono">
                  {detail.watchLog.length} events recorded
                </span>
              </div>

              <div className="rounded-card border border-rule bg-surface divide-y divide-rule text-xs">
                {detail.watchLog.map((entry, idx) => (
                  <div key={idx} className="p-3.5 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full shrink-0',
                            entry.severity === 'alert' ? 'bg-st-fail' : 'bg-st-pass',
                          )}
                          aria-hidden="true"
                        />
                        <span className="font-semibold text-ink">{entry.workflow.name}</span>
                      </div>
                      <p className="text-ink-2 pl-4">{entry.message}</p>
                    </div>

                    <span className="text-[11px] font-mono text-ink-3 shrink-0">
                      {formatDate(entry.at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Succession Simulation Panel */}
        <div className="lg:col-span-1 lg:sticky lg:top-20">
          <SuccessionPanel
            result={simResult}
            isLoading={isSimulating}
            onSave={handleSave}
            onSendAcceptance={handleSendAcceptance}
            isSaving={isSaving}
            isSending={isSending}
            hasUnsavedChanges={hasChanges}
          />
        </div>
      </div>
    </div>
  );
}
