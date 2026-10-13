'use client';

import * as React from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, ArrowRight, ArrowRightLeft, CalendarDays, CircleCheck, Download, FileWarning, Hourglass, Info, KeyRound, PackageOpen, UserRoundPlus } from 'lucide-react';
import type {
  DepartureDetail as DepartureDetailType,
  SuccessorAssignment,
  SuccessionPlanResult,
  EntityRef,
  HandoverAsset,
} from '@/types/view';
import { DEPARTURE_STAGES, STAGE_LABEL } from '@/types/view';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EntityKindIcon } from '@/components/ui/EntityKindIcon';
import { CriticalityDots, EvidenceBadge, NoneValue, UnknownValue } from '@/components/ui/marks';
import { ErrorState } from '@/components/ui/states';
import { PersonPicker } from '@/components/ui/PersonPicker';
import { SuccessionPanel } from './SuccessionPanel';
import { StageStepper } from './StageStepper';
import { HandoverProgress } from './HandoverProgress';
import { ACCEPTANCE_LABEL, ACCEPTANCE_PILL, SOURCE_LABEL, STATUS_LABEL, STATUS_PILL, departureStatus, stepOf } from './departureStatus';
import {
  fetchDeparture,
  simulateSuccessionPlan,
  saveSuccessors,
  sendAcceptanceRequests,
  markAccountDisabled,
  verifyDeparture,
  reassignHandover,
} from '@/lib/api/departures';
import { fetchPeople } from '@/lib/api/entities';
import { downloadFile, toApiError } from '@/lib/api/client';
import { useResource } from '@/lib/useResource';
import { useSession } from '@/lib/session';
import { canInitiateDeparture } from '@/lib/permissions';
import { formatDate, formatRelative, formatRunsPerWeek } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export interface DepartureDetailProps {
  id: string;
  initialDetail?: DepartureDetailType;
}

export function DepartureDetail({ id, initialDetail }: DepartureDetailProps) {
  const { toast } = useToast();
  const { session } = useSession();
  // HR managers and admins run departures (backend RBAC enforces the same rule).
  const canManage = canInitiateDeparture(session);

  const departureResource = useResource<DepartureDetailType>(
    `departure-${id}`,
    () => fetchDeparture(id),
  );
  const peopleResource = useResource(canManage ? 'people-picker' : null, fetchPeople);

  const detail =
    departureResource.status === 'ready'
      ? departureResource.data
      : initialDetail;

  // Successor options: everyone except the leaver (the backend also rejects people who are leaving).
  const successorOptions = React.useMemo(
    () => (peopleResource.status === 'ready' && detail ? peopleResource.data.filter((p) => p.id !== detail.person.id) : []),
    [peopleResource, detail],
  );
  const isClosed = detail?.stage === 'account_disabled' || detail?.stage === 'verified';

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
  const [simError, setSimError] = React.useState(false);
  const [isSimulating, setIsSimulating] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [lifecycleBusy, setLifecycleBusy] = React.useState<'disable' | 'verify' | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  // Reassigning one locked row (after the account is disabled): HR/admin swaps the
  // successor and the new person is asked directly. Nobody accepts on their behalf.
  const [reassigning, setReassigning] = React.useState<HandoverAsset | null>(null);
  const [reassignTo, setReassignTo] = React.useState<EntityRef | null>(null);
  const [reassignReason, setReassignReason] = React.useState('');
  const [isReassigning, setIsReassigning] = React.useState(false);

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
          setSimError(false);
        }
      })
      .catch(() => {
        // Show the failure; don't leave a stale projection on screen as if it were current.
        if (active) {
          setSimResult(null);
          setSimError(true);
        }
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

  const discardChanges = () => {
    if (!detail) return;
    setAssignments(Object.fromEntries(detail.handover.map((h) => [h.asset.id, h.successor])));
    setHasChanges(false);
  };

  const handleSave = async () => {
    if (!detail) return;
    // Send only rows that changed: accepted handovers are locked server-side.
    const saved = new Map(detail.handover.map((h) => [h.asset.id, h.successor?.id ?? null]));
    const assignmentList: SuccessorAssignment[] = Object.entries(assignments)
      .filter(([assetId, succ]) => succ !== null && saved.get(assetId) !== succ.id)
      .map(([assetId, succ]) => ({ assetId, successorId: succ!.id }));
    if (assignmentList.length === 0) {
      setHasChanges(false);
      return;
    }

    setIsSaving(true);
    try {
      await saveSuccessors(detail.id, assignmentList);
      toast({
        title: 'Successors saved',
        description: `${assignmentList.length} successor ${assignmentList.length === 1 ? 'assignment' : 'assignments'} recorded.`,
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
      const requested = await sendAcceptanceRequests(detail.id);
      toast({
        title: 'Acceptance requested',
        // No email is sent yet: successors answer from their own OBA account.
        description: `${requested} ${requested === 1 ? 'successor was' : 'successors were'} asked to accept. They respond after signing in to OBA.`,
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

  const runLifecycle = async (step: 'disable' | 'verify') => {
    if (!detail) return;
    setLifecycleBusy(step);
    try {
      if (step === 'disable') await markAccountDisabled(detail.id);
      else await verifyDeparture(detail.id);
      toast({
        title: step === 'disable' ? 'Account disabled recorded' : 'Departure verified',
        description:
          step === 'disable'
            ? `${detail.person.name}'s account is recorded as disabled. Unaccepted handovers can still be reassigned one at a time.`
            : 'Every asset has an accepted successor. This departure is closed.',
      });
      departureResource.reload();
    } catch (err: any) {
      toast({ title: 'Not done', description: err?.message || 'The backend refused this step.', variant: 'error' });
    } finally {
      setLifecycleBusy(null);
    }
  };

  const openReassign = (item: HandoverAsset) => {
    setReassigning(item);
    setReassignTo(null);
    setReassignReason('');
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigning || !reassignTo || !reassignReason.trim()) return;
    setIsReassigning(true);
    try {
      await reassignHandover(reassigning.id, reassignTo.id, reassignReason.trim());
      toast({
        title: 'Successor reassigned',
        description: `${reassignTo.name} was asked to accept ${reassigning.asset.name}. They respond after signing in to OBA.`,
      });
      setReassigning(null);
      departureResource.reload();
    } catch (err: any) {
      toast({ title: 'Not reassigned', description: err?.message || 'The backend refused this reassignment.', variant: 'error' });
    } finally {
      setIsReassigning(false);
    }
  };

  if (departureResource.status === 'loading' && !detail) {
    return (
      <div className="space-y-6 pb-16" aria-label="Loading departure">
        <span className="skeleton block h-4 w-28" />
        <span className="skeleton block h-24 rounded-panel" />
        <span className="skeleton block h-32 rounded-panel" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <span className="skeleton block h-96 rounded-panel lg:col-span-8" />
          <span className="skeleton block h-72 rounded-panel lg:col-span-4" />
        </div>
      </div>
    );
  }

  if (departureResource.status === 'error' && !detail) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Panel className="p-5">
          <ErrorState onRetry={departureResource.reload} message="We couldn't load this departure." lastLoadedAt={departureResource.lastLoadedAt || undefined} />
        </Panel>
      </div>
    );
  }

  if (!detail) return null;

  const step = stepOf(detail.stage);
  const status = departureStatus(detail);
  const counts = {
    accepted: detail.handover.filter((h) => h.acceptance === 'accepted').length,
    requested: detail.handover.filter((h) => h.acceptance === 'requested').length,
    declined: detail.handover.filter((h) => h.acceptance === 'declined').length,
    notAsked: detail.handover.filter((h) => h.successor !== null && h.acceptance === 'none').length,
    unnamed: detail.handover.filter((h) => h.successor === null && h.acceptance !== 'accepted').length,
  };
  const stillNeeded = detail.assetsTotal - detail.assetsHandedOver;
  const canRequestAcceptance = !hasChanges && counts.notAsked > 0;
  const firstName = detail.person.name.split(' ')[0];
  const noHandover = detail.handover.length === 0;
  const preDisable = !isClosed;
  const recordDisabledButton = canManage && preDisable && (
    <Button variant="secondary" size="sm" onClick={() => runLifecycle('disable')} disabled={lifecycleBusy !== null}>
      {lifecycleBusy === 'disable' ? 'Recording…' : 'Record account disabled'}
    </Button>
  );
  const goToHandover = () => document.getElementById('handover-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // What to do next, with the button that does it.
  const next: { icon: React.ReactNode; title: string; body: string; tone?: 'fail' | 'pass'; action?: React.ReactNode } =
    detail.stage === 'verified'
      ? { icon: <CircleCheck />, tone: 'pass', title: 'Closed', body: 'Every asset has an accepted successor and the departure is verified.' }
      : detail.stage === 'account_disabled'
        ? stillNeeded > 0
          ? {
              icon: <Hourglass />,
              tone: 'fail',
              title: `${stillNeeded} of ${detail.assetsTotal} assets still need an accepted successor before verifying.`,
              body: 'Reassign anything stuck from the handover table. The new person accepts themselves.',
              action: canManage && (
                <Button variant="primary" size="sm" disabled>
                  Verify &amp; close departure
                </Button>
              ),
            }
          : {
              icon: <CircleCheck />,
              title: 'Ready to verify',
              body: 'Every asset has an accepted successor. Verify to close this departure.',
              action: canManage && (
                <Button variant="primary" size="sm" onClick={() => runLifecycle('verify')} disabled={lifecycleBusy !== null}>
                  {lifecycleBusy === 'verify' ? 'Verifying…' : 'Verify & close departure'}
                </Button>
              ),
            }
        : detail.handover.length === 0
          ? {
              icon: <PackageOpen />,
              title: 'Nothing to hand over',
              body: `${firstName} owns no tracked assets. Record the account as disabled once they have left.`,
              action: recordDisabledButton,
            }
          : counts.unnamed > 0
            ? {
                icon: <UserRoundPlus />,
                title: `Name a successor for ${counts.unnamed} ${counts.unnamed === 1 ? 'asset' : 'assets'}`,
                body: 'Pick who takes over each asset in the handover table, then ask them to accept.',
                action: (
                  <>
                    {recordDisabledButton}
                    <Button variant="primary" size="sm" onClick={goToHandover} rightIcon={<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}>
                      Go to handover
                    </Button>
                  </>
                ),
              }
            : counts.notAsked > 0
              ? {
                  icon: <UserRoundPlus />,
                  title: `Ask ${counts.notAsked} ${counts.notAsked === 1 ? 'successor' : 'successors'} to accept`,
                  body: hasChanges ? 'Save your successor changes first.' : 'They answer after signing in to OBA. Nobody accepts on their behalf.',
                  action: canManage && (
                    <>
                      {recordDisabledButton}
                      <Button variant="primary" size="sm" onClick={handleSendAcceptance} disabled={isSending || !canRequestAcceptance}>
                        {isSending ? 'Asking…' : 'Ask to accept'}
                      </Button>
                    </>
                  ),
                }
              : counts.requested > 0
                ? {
                    icon: <Hourglass />,
                    title: `Waiting for ${counts.requested} ${counts.requested === 1 ? 'successor' : 'successors'} to accept`,
                    body: 'They answer after signing in to OBA.',
                    action: recordDisabledButton,
                  }
                : {
                    icon: <CircleCheck />,
                    title: 'Handover accepted',
                    body: 'Record the account as disabled once they have left.',
                    action: recordDisabledButton,
                  };

  const downloadPack = async () => {
    setDownloading(true);
    try {
      await downloadFile(`/api/departures/${encodeURIComponent(detail.id)}/handover-pack/pdf`, 'handover-pack.pdf');
    } catch (e) {
      toast({ title: "We couldn't create the handover pack", description: toApiError(e).message, variant: 'error' });
    } finally {
      setDownloading(false);
    }
  };

  const daysLeft = Math.round((startOfDay(new Date(detail.leaveDate)) - startOfDay(new Date())) / 86_400_000);

  return (
    <div className="space-y-6 pb-28">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-2">
        <Link href="/departures" className="type-meta inline-flex items-center gap-1.5 font-medium text-ink-3 transition-colors hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Departures
        </Link>

        <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={detail.person.name} size={56} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="type-title text-ink">{detail.person.name}</h1>
                <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium', STATUS_PILL[status])}>{STATUS_LABEL[status]}</span>
              </div>
              <p className="mt-0.5 text-sm text-ink-2">{[detail.role, detail.team].filter(Boolean).join(' · ') || 'Team member'}</p>
              <div className="type-meta mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-3">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  Leaves {formatDate(detail.leaveDate)}
                </span>
                <span>{SOURCE_LABEL[detail.detectedFrom]}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {!isClosed && (
              <div className="text-right">
                <p className={cn('text-3xl font-semibold leading-none tracking-tight tabular-nums', daysLeft >= 0 && daysLeft <= 7 ? 'text-amber-ink' : 'text-ink')}>
                  {daysLeft === 0 ? 'Today' : Math.abs(daysLeft)}
                </p>
                <p className="type-meta mt-1 text-ink-3">
                  {daysLeft === 0 ? 'is their last day' : daysLeft > 0 ? `${daysLeft === 1 ? 'day' : 'days'} until they leave` : `${daysLeft === -1 ? 'day' : 'days'} since they left`}
                </p>
              </div>
            )}
            {!isClosed && <span className="hidden h-10 w-px bg-rule sm:block" aria-hidden="true" />}
            <Button variant="secondary" size="sm" onClick={downloadPack} disabled={downloading} leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}>
              {downloading ? 'Preparing…' : 'Download handover pack'}
            </Button>
          </div>
        </header>
      </div>

      {/* ── Lifecycle: stepper, what's next, handover progress ──────────── */}
      <Panel aria-labelledby="stage-heading">
        <div className="px-6 pb-6 pt-5">
          <h2 id="stage-heading" className="type-heading text-ink">
            Step {step} of {DEPARTURE_STAGES.length}: {STAGE_LABEL[detail.stage]}
          </h2>
          <div className="mt-5">
            <StageStepper stage={detail.stage} stageTimestamps={detail.stageTimestamps} nothingToHandOver={detail.handover.length === 0} />
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-rule bg-surface-sunken/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={cn(
                'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rule bg-surface [&>svg]:h-4 [&>svg]:w-4',
                next.tone === 'fail' ? 'text-st-fail' : next.tone === 'pass' ? 'text-st-pass' : 'text-amber-ink',
              )}
            >
              {next.icon}
            </span>
            <div>
              <p className={cn('text-sm font-medium', next.tone === 'fail' ? 'text-st-fail' : 'text-ink')}>{next.title}</p>
              <p className="type-meta mt-0.5 text-ink-3">{next.body}</p>
            </div>
          </div>
          {next.action && <div className="flex shrink-0 flex-wrap gap-2">{next.action}</div>}
        </div>

        {detail.handover.length > 0 && (
          <div className="border-t border-rule px-6 py-5">
            <HandoverProgress
              handover={detail.handover}
              firstName={firstName}
              personalCredentials={detail.personalCredentialAutomations.length}
              undocumented={detail.undocumented.length}
            />
          </div>
        )}
      </Panel>

      {/* ── Handover + succession check ─────────────────────────────────── */}
      <div className={cn('grid grid-cols-1 gap-6 lg:grid-cols-12', noHandover ? 'items-stretch' : 'items-start')}>
        <div className={cn('lg:col-span-8', noHandover ? 'flex flex-col gap-6' : 'space-y-6')}>
          <Panel aria-labelledby="handover-heading" className={cn('scroll-mt-6', noHandover && 'flex flex-1 flex-col')}>
            <PanelHeader
              titleId="handover-heading"
              title="Handover"
              icon={<ArrowRightLeft />}
              count={detail.handover.length}
              description={
                detail.handover.length === 0
                  ? undefined
                  : canManage && !isClosed
                    ? 'Name a successor for each asset, then ask them to accept.'
                    : 'Who takes over each asset.'
              }
            />
            {detail.handover.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                <span aria-hidden="true" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-rule bg-surface-sunken text-ink-3">
                  <PackageOpen className="h-5 w-5" />
                </span>
                <p className="type-heading mt-4 text-ink">{firstName} owns no tracked assets</p>
                <p className="type-meta mt-1 max-w-sm text-ink-3">
                  Nothing needs a successor. If they own something OBA doesn&apos;t know about yet, record the owner on that asset and it will appear here.
                </p>
                <Link href="/assets" className="type-meta mt-4 inline-flex items-center gap-1 font-medium text-ink-2 hover:text-ink">
                  Go to assets <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            ) : (
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Handover table">
              <table className="w-full text-left">
                <thead>
                  <tr className="type-meta border-b border-rule text-ink-3">
                    <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Asset</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Current backup</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Successor</th>
                    <th scope="col" className="py-2.5 pl-3 pr-5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {detail.handover.map((item) => {
                    const assigned = assignments[item.asset.id] ?? item.successor;
                    const showSuggestion =
                      item.suggestion && canManage && !isClosed && item.acceptance !== 'accepted' && assigned?.id !== item.suggestion.person.id;
                    return (
                      <tr key={item.asset.id} className="align-top transition-colors hover:bg-surface-sunken/40">
                        <td className="py-3 pl-5 pr-3">
                          <div className="flex items-start gap-3">
                            <span aria-hidden="true" className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-rule bg-surface-sunken text-ink-2">
                              <EntityKindIcon kind={item.asset.kind} />
                            </span>
                            <div className="min-w-0">
                              <Link href={`/assets/${item.asset.id}`} className="text-sm font-medium text-ink transition-colors hover:text-amber-ink">
                                {item.asset.name}
                              </Link>
                              <div className="mt-1">
                                <CriticalityDots level={item.criticality} />
                              </div>
                              {showSuggestion && (
                                <div className="type-meta mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-full border border-rule bg-surface px-2 py-0.5 text-ink-2">
                                  <span className="text-ink-3">Suggested</span>
                                  <span className="font-medium text-ink">{item.suggestion!.person.name}</span>
                                  <span className="text-ink-3">· {item.suggestion!.reason}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleAssignSuccessor(item.asset.id, item.suggestion!.person)}
                                    className="ml-0.5 cursor-pointer font-medium text-amber-ink hover:underline"
                                  >
                                    Use
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="type-meta flex items-center gap-1.5 pt-1">
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

                        <td className="min-w-[200px] px-3 py-3">
                          {canManage ? (
                            <PersonPicker
                              value={assigned}
                              onChange={(p) => handleAssignSuccessor(item.asset.id, p)}
                              options={successorOptions}
                              disabled={isClosed || item.acceptance === 'accepted'}
                              placeholder={peopleResource.status === 'error' ? "Couldn't load people" : 'Choose a successor…'}
                            />
                          ) : (
                            <span className="type-meta inline-flex pt-1 text-ink-2">{assigned?.name ?? <NoneValue />}</span>
                          )}
                        </td>

                        <td className="py-3 pl-3 pr-5">
                          <span className={cn('inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium', ACCEPTANCE_PILL[item.acceptance])}>
                            {ACCEPTANCE_LABEL[item.acceptance]}
                          </span>
                          {item.acceptance === 'declined' && item.declineReason && (
                            <p className="type-meta mt-1.5 max-w-[16rem] whitespace-normal text-ink-2">&ldquo;{item.declineReason}&rdquo;</p>
                          )}
                          {canManage && detail.stage === 'account_disabled' && item.acceptance !== 'accepted' && (
                            <button
                              type="button"
                              onClick={() => openReassign(item)}
                              className="type-meta mt-1.5 block cursor-pointer font-medium text-amber-ink hover:underline"
                              aria-label={`Reassign ${item.asset.name}`}
                            >
                              Reassign
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}

            {reassigning && (
              <div className="border-t border-rule px-5 py-4">
                <h3 className="type-heading text-ink">Reassign {reassigning.asset.name}</h3>
                <p className="type-meta mt-1 text-ink-3">
                  {reassigning.successor ? `${reassigning.successor.name} hasn't accepted. ` : 'Nobody was named for this asset. '}
                  The person you choose is asked to accept and must accept themselves. The reason is kept in the audit trail.
                </p>
                <form onSubmit={handleReassign} className="mt-4 grid gap-4 sm:grid-cols-2">
                  <PersonPicker
                    label="New successor"
                    value={reassignTo}
                    onChange={setReassignTo}
                    options={successorOptions.filter((p) => p.id !== reassigning.successor?.id)}
                    placeholder={peopleResource.status === 'error' ? "Couldn't load people" : 'Choose the new successor…'}
                  />
                  <div className="space-y-1">
                    <label htmlFor="reassign-reason" className="type-meta block font-medium text-ink">
                      Reason (required)
                    </label>
                    <textarea
                      id="reassign-reason"
                      required
                      rows={2}
                      value={reassignReason}
                      onChange={(e) => setReassignReason(e.target.value)}
                      placeholder="e.g. The original successor is on extended leave."
                      className="type-meta w-full rounded-control border border-rule bg-surface p-2.5 text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="submit" variant="primary" size="sm" disabled={!reassignTo || !reassignReason.trim() || isReassigning}>
                      {isReassigning ? 'Reassigning…' : 'Reassign and ask to accept'}
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setReassigning(null)} disabled={isReassigning}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </Panel>

          {/* ── Risks ─────────────────────────────────────────────────────── */}
          {(detail.personalCredentialAutomations.length > 0 || detail.undocumented.length > 0) && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {detail.personalCredentialAutomations.length > 0 && (
                <Panel aria-labelledby="credentials-heading" className={cn(detail.undocumented.length === 0 && 'md:col-span-2')}>
                  <PanelHeader
                    titleId="credentials-heading"
                    title="Runs on their credentials"
                    icon={<KeyRound />}
                    count={detail.personalCredentialAutomations.length}
                    description={`These stop when ${detail.person.name.split(' ')[0]}'s account is disabled, unless moved to a service account.`}
                  />
                  <ul className="divide-y divide-rule">
                    {detail.personalCredentialAutomations.map((item) => (
                      <li key={item.workflow.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <span className="type-meta font-medium text-ink">{item.workflow.name}</span>
                        <span className="type-meta shrink-0 text-ink-3 tabular-nums">{formatRunsPerWeek(item.weeklyRuns)}</span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
              {detail.undocumented.length > 0 && (
                <Panel aria-labelledby="undocumented-heading" className={cn(detail.personalCredentialAutomations.length === 0 && 'md:col-span-2')}>
                  <PanelHeader
                    titleId="undocumented-heading"
                    title="No runbook on record"
                    icon={<FileWarning />}
                    count={detail.undocumented.length}
                    description="Ask for handover notes before the leave date."
                  />
                  <ul className="flex flex-wrap gap-1.5 px-5 py-4">
                    {detail.undocumented.map((asset) => (
                      <li key={asset.id}>
                        <Link
                          href={`/assets/${asset.id}`}
                          className="type-meta inline-flex items-center gap-1.5 rounded-md border border-rule bg-surface px-2 py-1 font-medium text-ink transition-colors hover:border-ink-3"
                        >
                          <EntityKindIcon kind={asset.kind} className="h-3 w-3 text-ink-3" />
                          {asset.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </div>
          )}

          {/* ── 72-hour watch ─────────────────────────────────────────────── */}
          {detail.watchLog && detail.watchLog.length > 0 && (
            <Panel aria-labelledby="watch-heading">
              <PanelHeader
                titleId="watch-heading"
                title="72-hour watch"
                icon={<Activity />}
                count={detail.watchLog.length}
                description="What their automations did after the account was disabled."
              />
              <ol className="px-5 py-4">
                {detail.watchLog.map((entry, idx) => (
                  <li key={idx} className="relative flex gap-3 pb-4 last:pb-0">
                    {idx < detail.watchLog.length - 1 && <span className="absolute left-[3.5px] top-3 h-full w-px bg-rule" aria-hidden="true" />}
                    <span className={cn('relative mt-1.5 h-2 w-2 shrink-0 rounded-full', entry.severity === 'alert' ? 'bg-st-fail' : 'bg-st-pass')} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="type-meta font-medium text-ink">{entry.workflow.name}</span>
                        <time dateTime={entry.at} className="text-[11px] text-ink-3">
                          {formatDate(entry.at)}
                        </time>
                      </div>
                      <p className="type-meta mt-0.5 text-ink-2">
                        <span className="sr-only">{entry.severity === 'alert' ? 'Alert: ' : 'OK: '}</span>
                        {entry.message}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </div>

        <div className={cn('space-y-6 lg:col-span-4', !noHandover && 'lg:sticky lg:top-6')}>
          <SuccessionPanel result={simResult} isLoading={isSimulating} error={simError} handover={detail.handover} assignments={assignments} />

          <Panel aria-labelledby="details-heading">
            <PanelHeader titleId="details-heading" title="Details" icon={<Info />} />
            <dl className="divide-y divide-rule">
              {[
                { term: 'Team', value: detail.team },
                { term: 'Role', value: detail.role },
                { term: 'Leave date', value: formatDate(detail.leaveDate) },
                { term: 'Recorded', value: detail.stageTimestamps.initiated ? formatDate(detail.stageTimestamps.initiated) : null },
                { term: 'Source', value: SOURCE_LABEL[detail.detectedFrom] },
                { term: 'Account disabled', value: detail.stageTimestamps.account_disabled ? formatDate(detail.stageTimestamps.account_disabled) : 'Not yet' },
                { term: 'Verified', value: detail.stageTimestamps.verified ? formatDate(detail.stageTimestamps.verified) : 'Not yet' },
              ].map((row) => (
                <div key={row.term} className="flex items-baseline justify-between gap-4 px-5 py-2">
                  <dt className="type-meta text-ink-3">{row.term}</dt>
                  <dd className="type-meta text-right font-medium text-ink">{row.value ?? <span className="font-normal text-ink-3">Not recorded</span>}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>

      {/* ── Action bar: unsaved successor changes ───────────────────────── */}
      {canManage && !isClosed && hasChanges && (
        <div className="pointer-events-none sticky bottom-4 z-20 flex justify-center">
          <div className="pointer-events-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-panel border border-rule bg-surface px-4 py-3 shadow-panel">
            <p className="type-meta text-ink-2">You have unsaved successor changes. Save them before asking anyone to accept.</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={discardChanges} disabled={isSaving}>
                Discard
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save successors'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
