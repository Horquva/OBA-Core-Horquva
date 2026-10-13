'use client';

import * as React from 'react';
import Link from 'next/link';
import { MoreHorizontal, X } from 'lucide-react';
import type { ActionStatus, ActionType, ActionView, EntityRef } from '@/types/view';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { EntityKindIcon } from '@/components/ui/EntityKindIcon';
import { PersonPicker, type PersonItem } from '@/components/ui/PersonPicker';
import { ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchActions, assignBackup, acceptRisk } from '@/lib/api/actions';
import { fetchPeople } from '@/lib/api/entities';
import { useSession } from '@/lib/session';
import { canEdit, canManageSettings } from '@/lib/permissions';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { ConfirmationsTab } from './ConfirmationsTab';

export interface ActionsViewProps {
  initialActions?: ActionView[];
  defaultTab?: 'actions' | 'confirmations';
  /** From Overview links: ?id= scrolls to and highlights that action. */
  highlightId?: string | null;
  /** From ?status=. */
  initialStatus?: string | null;
}

type StatusFilter = ActionStatus | 'all';

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'accepted_risk', label: 'Risk accepted' },
];

export const ACTION_TYPE_LABEL: Record<ActionType, string> = {
  assign_backup: 'Assign a backup',
  confirm_facts: 'Confirm facts',
  name_successor: 'Name a successor',
  move_credential: 'Move a credential',
  document: 'Document it',
  add_fallback: 'Add a fallback',
};

/** Filter chips name the kind of work, so they never read like the row buttons. */
const TYPE_FILTER_LABEL: Record<ActionType, string> = {
  assign_backup: 'Backups',
  confirm_facts: 'Confirmations',
  name_successor: 'Successors',
  move_credential: 'Credentials',
  document: 'Documentation',
  add_fallback: 'Fallbacks',
};

const STATUS_LABEL: Record<ActionStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  accepted_risk: 'Risk accepted',
};

const STATUS_PILL: Record<ActionStatus, string> = {
  open: 'bg-[color-mix(in_srgb,var(--amber)_16%,transparent)] text-amber-ink',
  in_progress: 'bg-[color-mix(in_srgb,var(--ev-stated)_14%,transparent)] text-ev-stated',
  resolved: 'bg-[color-mix(in_srgb,var(--st-pass)_13%,transparent)] text-st-pass',
  accepted_risk: 'bg-surface-sunken text-ink-2',
};

const EXPIRY_CHOICES = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 180, label: '180 days' },
  { days: 365, label: '1 year' },
];

const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'type-meta inline-flex h-7 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 font-medium transition-colors',
        active ? 'bg-surface-sunken text-ink' : 'text-ink-3 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

export function ActionsView({ initialActions, defaultTab = 'actions', highlightId = null, initialStatus = null }: ActionsViewProps) {
  const [activeTab, setActiveTab] = React.useState<'actions' | 'confirmations'>(defaultTab);
  const validStatus = STATUS_FILTERS.some((f) => f.id === initialStatus) ? (initialStatus as StatusFilter) : 'all';
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>(validStatus);
  const [typeFilter, setTypeFilter] = React.useState<ActionType | 'all'>('all');

  const actionsResource = useResource<ActionView[]>('actions-list', () => fetchActions());
  const actions = actionsResource.status === 'ready' ? actionsResource.data : initialActions || [];

  const { toast } = useToast();
  const { session } = useSession();
  // Same rules as the backend RBAC: admins/reviewers assign backups; only admins accept risk.
  const mayAssign = canEdit(session);
  const mayAcceptRisk = canManageSettings(session);
  const peopleResource = useResource(mayAssign ? 'people-picker' : null, fetchPeople);
  const peopleOptions: PersonItem[] = peopleResource.status === 'ready' ? peopleResource.data : [];

  const [assigningId, setAssigningId] = React.useState<string | null>(null);
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [menuId, setMenuId] = React.useState<string | null>(null);

  const [riskAction, setRiskAction] = React.useState<ActionView | null>(null);
  const [riskReason, setRiskReason] = React.useState('');
  const [riskDays, setRiskDays] = React.useState(90);
  const [isAcceptingRisk, setIsAcceptingRisk] = React.useState(false);

  const [flashId, setFlashId] = React.useState<string | null>(null);

  // Ranked by asset severity (never by person).
  const visible = React.useMemo(
    () =>
      actions
        .filter((a) => (statusFilter === 'all' || a.status === statusFilter) && (typeFilter === 'all' || a.type === typeFilter))
        .sort((a, b) => a.rank - b.rank),
    [actions, statusFilter, typeFilter],
  );
  const openCount = actions.filter((a) => a.status === 'open').length;
  const typesPresent = (Object.keys(ACTION_TYPE_LABEL) as ActionType[]).filter((t) => actions.some((a) => a.type === t));

  // ?id=: scroll to the action and highlight it briefly. Make sure the filters don't hide it.
  React.useEffect(() => {
    if (!highlightId || !actions.some((a) => a.id === highlightId)) return;
    setActiveTab('actions');
    setStatusFilter((s) => (actions.find((a) => a.id === highlightId && (s === 'all' || a.status === s)) ? s : 'all'));
    setFlashId(highlightId);
    const t1 = window.setTimeout(() => document.getElementById(`action-${highlightId}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }), 50);
    const t2 = window.setTimeout(() => setFlashId(null), 2600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, actions.length]);

  // Close the row menu on outside click.
  React.useEffect(() => {
    if (!menuId) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-action-menu]')) setMenuId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuId]);

  const handleAssignBackup = async (actionId: string, person: EntityRef | null) => {
    if (!person) return;
    setIsAssigning(true);
    try {
      await assignBackup(actionId, person.id);
      setAssigningId(null);
      toast({ title: 'Backup assigned', description: `${person.name} is recorded as backup (stated). It becomes confirmed when they confirm it themselves.` });
      actionsResource.reload();
    } catch (err: any) {
      toast({ title: "Backup wasn't assigned", description: err?.message || 'The backend refused the assignment.', variant: 'error' });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAcceptRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riskAction || !riskReason.trim()) return;
    setIsAcceptingRisk(true);
    try {
      const expiresAt = new Date(Date.now() + riskDays * 86_400_000).toISOString();
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

  const reopensOn = formatDate(new Date(Date.now() + riskDays * 86_400_000).toISOString());

  return (
    <div className="space-y-6 pb-16">
      <header className="pt-2">
        <h1 className="type-title text-ink">Actions</h1>
        <p className="mt-1 text-sm text-ink-2">What to fix first so nothing breaks when someone leaves, and the confirmations you&apos;ve asked for.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-rule" role="tablist" aria-label="Actions sections">
        {(
          [
            { id: 'actions', label: 'To do', count: `${openCount} open` },
            { id: 'confirmations', label: 'Confirmations', count: null },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'type-meta -mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 px-3 py-3 font-medium transition-colors',
              activeTab === t.id ? 'border-amber text-ink' : 'border-transparent text-ink-3 hover:text-ink',
            )}
          >
            {t.label}
            {t.count && <span className="text-ink-3">{t.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'confirmations' ? (
        <ConfirmationsTab />
      ) : (
        <Panel aria-labelledby="todo-heading">
          <h2 id="todo-heading" className="sr-only">
            Actions to take
          </h2>
          {/* Filters */}
          <div className="flex flex-col gap-2 border-b border-rule px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Status">
              {STATUS_FILTERS.map((f) => (
                <Chip key={f.id} active={statusFilter === f.id} onClick={() => setStatusFilter(f.id)}>
                  {f.label}
                  <span className="tabular-nums text-ink-3">{f.id === 'all' ? actions.length : actions.filter((a) => a.status === f.id).length}</span>
                </Chip>
              ))}
            </div>
            {typesPresent.length > 1 && (
              <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Type">
                <Chip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>
                  Any type
                </Chip>
                {typesPresent.map((t) => (
                  <Chip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
                    {TYPE_FILTER_LABEL[t]}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          {actionsResource.status === 'loading' && !initialActions ? (
            <div className="space-y-2 p-5" aria-label="Loading actions">
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={i} className="skeleton block h-16 w-full" />
              ))}
            </div>
          ) : actionsResource.status === 'error' && !initialActions ? (
            <div className="p-5">
              <ErrorState onRetry={actionsResource.reload} message="We couldn't load actions." />
            </div>
          ) : visible.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="type-heading text-ink">No actions in this view</p>
              <p className="type-meta mt-1 text-ink-3">
                {actions.length === 0 ? 'Nothing needs fixing right now.' : 'Nothing matches these filters.'}
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-rule">
              {visible.map((a) => {
                const closed = a.status === 'resolved' || a.status === 'accepted_risk';
                const assigning = assigningId === a.id;
                const reopensIn = a.acceptedRisk ? daysUntil(a.acceptedRisk.expiresAt) : null;
                return (
                  <li
                    key={a.id}
                    id={`action-${a.id}`}
                    className={cn(
                      'scroll-mt-24 transition-colors duration-700',
                      flashId === a.id && 'bg-[color-mix(in_srgb,var(--amber)_12%,transparent)]',
                      assigning && 'bg-surface-sunken/40',
                    )}
                  >
                    <div className={cn('flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center', closed && 'opacity-75')}>
                      <span className="type-meta w-6 shrink-0 font-semibold tabular-nums text-ink-3">
                        <span aria-hidden="true">{a.rank}</span>
                        <span className="sr-only">Rank {a.rank}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm font-medium leading-snug', closed ? 'text-ink-2' : 'text-ink')}>{a.problem}</p>
                        <div className="type-meta mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-3">
                          <Link href={`/assets/${a.asset.id}`} className="inline-flex items-center gap-1.5 font-medium text-ink-2 hover:text-ink">
                            <EntityKindIcon kind={a.asset.kind} />
                            {a.asset.name}
                          </Link>
                          <span>
                            affects {a.criticalAssetsAffected} critical {a.criticalAssetsAffected === 1 ? 'asset' : 'assets'}
                          </span>
                          <span>{ACTION_TYPE_LABEL[a.type]}</span>
                        </div>
                        {a.status === 'accepted_risk' && a.acceptedRisk && (
                          <p className="type-meta mt-2 text-ink-3">
                            <span className="text-ink-2">&ldquo;{a.acceptedRisk.reason}&rdquo;</span> · accepted by {a.acceptedRisk.acceptedBy} ·{' '}
                            {reopensIn !== null && reopensIn > 0 ? `reopens in ${reopensIn} ${reopensIn === 1 ? 'day' : 'days'}` : 'reopens now'}
                          </p>
                        )}
                        {a.status === 'resolved' && a.resolvedAt && <p className="type-meta mt-2 text-st-pass">Resolved {formatDate(a.resolvedAt)}</p>}
                      </div>

                      <span className={cn('inline-flex h-6 w-fit shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium', STATUS_PILL[a.status])}>
                        {STATUS_LABEL[a.status]}
                      </span>

                      {a.status === 'open' && (
                        <div className="flex shrink-0 items-center gap-1.5">
                          {a.primary.kind === 'assign_backup' ? (
                            mayAssign && (
                              <Button variant={assigning ? 'secondary' : 'primary'} size="sm" onClick={() => setAssigningId(assigning ? null : a.id)}>
                                {assigning ? 'Cancel' : 'Assign a backup'}
                              </Button>
                            )
                          ) : (
                            <Link
                              href={a.primary.href}
                              className="type-meta inline-flex h-8 items-center rounded-control bg-ink px-3 font-medium text-surface transition-colors hover:bg-ink-2 dark:bg-amber dark:text-on-amber"
                            >
                              {a.primary.label}
                            </Link>
                          )}
                          {mayAcceptRisk && (
                            <div className="relative" data-action-menu>
                              <button
                                type="button"
                                aria-label={`More actions for ${a.asset.name}`}
                                aria-haspopup="menu"
                                aria-expanded={menuId === a.id}
                                onClick={() => setMenuId(menuId === a.id ? null : a.id)}
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-control border border-rule bg-surface text-ink-3 transition-colors hover:bg-surface-sunken hover:text-ink"
                              >
                                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                              </button>
                              {menuId === a.id && (
                                <div role="menu" className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-control border border-rule bg-surface py-1 shadow-panel">
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setMenuId(null);
                                      setRiskAction(a);
                                      setRiskReason('');
                                      setRiskDays(90);
                                    }}
                                    className="type-meta block w-full cursor-pointer px-3 py-2 text-left text-ink hover:bg-surface-sunken"
                                  >
                                    Accept risk
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {assigning && (
                      <div className="px-5 pb-4 sm:pl-14">
                        <label htmlFor={`backup-${a.id}`} className="type-meta block font-medium text-ink">
                          Who backs up {a.asset.name}?
                        </label>
                        <div className="mt-1.5 w-full sm:w-80">
                          <PersonPicker
                            id={`backup-${a.id}`}
                            placeholder={peopleResource.status === 'error' ? "Couldn't load people" : 'Choose a person…'}
                            options={peopleOptions}
                            disabled={isAssigning}
                            onChange={(p) => handleAssignBackup(a.id, p)}
                          />
                        </div>
                        <p className="type-meta mt-1.5 text-ink-3">Recorded as stated until they confirm it themselves.</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      )}

      {/* Accept risk */}
      {riskAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink-night/40 backdrop-blur-xs" onClick={() => setRiskAction(null)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="accept-risk-title" className="relative z-10 w-full max-w-md overflow-hidden rounded-panel border border-rule bg-surface shadow-panel">
            <div className="flex items-start justify-between gap-3 border-b border-rule px-5 py-4">
              <div>
                <h2 id="accept-risk-title" className="type-heading text-ink">
                  Accept the risk
                </h2>
                <p className="type-meta mt-0.5 text-ink-3">{riskAction.asset.name}</p>
              </div>
              <button type="button" onClick={() => setRiskAction(null)} aria-label="Close" className="cursor-pointer rounded-control p-1 text-ink-3 hover:bg-surface-sunken hover:text-ink">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleAcceptRisk} className="space-y-4 px-5 py-4">
              <div className="space-y-1.5">
                <label htmlFor="risk-reason" className="type-meta block font-medium text-ink">
                  Why is this acceptable?
                </label>
                <textarea
                  id="risk-reason"
                  required
                  rows={3}
                  value={riskReason}
                  onChange={(e) => setRiskReason(e.target.value)}
                  placeholder="e.g. Being retired next quarter; a manual fallback is tested."
                  className="type-meta w-full rounded-control border border-rule bg-surface p-2.5 text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none"
                />
              </div>
              <fieldset className="space-y-1.5">
                <legend className="type-meta font-medium text-ink">For how long?</legend>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {EXPIRY_CHOICES.map((c) => (
                    <button
                      key={c.days}
                      type="button"
                      aria-pressed={riskDays === c.days}
                      onClick={() => setRiskDays(c.days)}
                      className={cn(
                        'type-meta h-8 cursor-pointer rounded-full border px-3 font-medium transition-colors',
                        riskDays === c.days ? 'border-ink bg-surface-sunken text-ink' : 'border-rule text-ink-2 hover:text-ink',
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <p className="type-meta text-ink-3">It still counts as exposed on Overview, and reopens on {reopensOn}.</p>
              <div className="flex justify-end gap-2 border-t border-rule pt-4">
                <Button type="button" variant="secondary" size="sm" onClick={() => setRiskAction(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={!riskReason.trim() || isAcceptingRisk}>
                  {isAcceptingRisk ? 'Saving…' : 'Accept risk'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
