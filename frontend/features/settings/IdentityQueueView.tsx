'use client';

import * as React from 'react';
import type { IdentityQueueItemView, IdentityResolution, EntityRef } from '@/types/view';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { PersonPicker } from '@/components/ui/PersonPicker';
import { ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchIdentityQueue, resolveIdentity } from '@/lib/api/settings';
import { fetchPeople } from '@/lib/api/entities';
import { toApiError } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { SectionHeader, Notice } from './SectionHeader';

export interface IdentityQueueViewProps {
  initialItems?: IdentityQueueItemView[];
}

export function IdentityQueueView({ initialItems }: IdentityQueueViewProps) {
  const queueResource = useResource<IdentityQueueItemView[]>(
    'settings-identity-queue',
    fetchIdentityQueue,
  );

  const items =
    queueResource.status === 'ready'
      ? queueResource.data
      : initialItems || [];

  // Real directory people for "Pick person…" (it was given no options before D11).
  const peopleResource = useResource('identity-queue-people', fetchPeople);
  const peopleOptions = React.useMemo(
    () => (peopleResource.status === 'ready' ? peopleResource.data : []),
    [peopleResource],
  );

  const [resolvingId, setResolvingId] = React.useState<string | null>(null);
  const [linkingPersonId, setLinkingPersonId] = React.useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = React.useState<EntityRef | null>(null);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);

  const handleResolve = async (id: string, resolution: IdentityResolution) => {
    setResolvingId(id);
    setNotice(null);
    try {
      await resolveIdentity(id, resolution);
      setNotice({ ok: true, text: 'Identity resolved. The decision is in the audit log.' });
      setLinkingPersonId(null);
      setSelectedPerson(null);
      queueResource.reload();
    } catch (e) {
      setNotice({ ok: false, text: `Could not resolve this account: ${toApiError(e).message}` });
    } finally {
      setResolvingId(null);
    }
  };

  const SOURCE_NAME: Record<string, string> = { n8n: 'n8n', entra: 'Microsoft Entra ID', google: 'Google Workspace', csv: 'CSV import' };
  const quiet = 'type-meta h-8 cursor-pointer rounded-control px-2.5 font-medium text-ink-3 transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-50';

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Identity Resolution Queue"
        description="Accounts we've seen that aren't matched to a person yet. Until they are, their systems show as Unknown owner, never as no owner."
      />

      {notice && <Notice ok={notice.ok}>{notice.text}</Notice>}

      <Panel>
        {queueResource.status === 'loading' && !initialItems ? (
          <div className="space-y-2 p-5" aria-label="Loading">
            <span className="skeleton block h-14 w-full" />
            <span className="skeleton block h-14 w-full" />
          </div>
        ) : queueResource.status === 'error' ? (
          <div className="p-5">
            <ErrorState onRetry={queueResource.reload} message="We couldn't load the identity queue." />
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="type-heading text-ink">Nothing waiting for review</p>
            <p className="type-meta mt-1 text-ink-3">Every account seen so far has been matched to a person or resolved.</p>
          </div>
        ) : (
          <ul className="divide-y divide-rule">
            {items.map((item) => {
              const isResolving = resolvingId === item.id;
              const isPicking = linkingPersonId === item.id;
              const label = item.displayName || item.emailCandidate || 'Unknown account';
              return (
                <li key={item.id} className={cn('px-5 py-4', isPicking && 'bg-surface-sunken/40')}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span aria-hidden="true" className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-ink-3 text-[11px] font-semibold text-ink-3">
                        ?
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{label}</p>
                        <p className="type-meta text-ink-3">
                          {item.emailCandidate && item.emailCandidate !== label ? `${item.emailCandidate} · ` : ''}
                          Seen in {SOURCE_NAME[item.source] ?? item.source}
                        </p>
                        {item.suggestion && (
                          <p className="type-meta mt-1.5 inline-flex flex-wrap items-center gap-1.5 text-ink-2">
                            <span className="text-ink-3">Suggested match:</span>
                            <Avatar name={item.suggestion.person.name} size={28} className="!h-5 !w-5 !text-[9px]" />
                            <span className="font-medium text-ink">{item.suggestion.person.name}</span>
                            <span className="text-ink-3">· {item.suggestion.reason}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                      {item.suggestion && !isPicking && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isResolving}
                          onClick={() => handleResolve(item.id, { action: 'link', personId: item.suggestion!.person.id })}
                          aria-label={`Accept Match (${item.suggestion.person.name})`}
                        >
                          Match
                        </Button>
                      )}
                      <Button variant="secondary" size="sm" disabled={isResolving} onClick={() => setLinkingPersonId(isPicking ? null : item.id)}>
                        {isPicking ? 'Cancel' : 'Pick Person...'}
                      </Button>
                      <span className="mx-0.5 hidden h-4 w-px bg-rule sm:block" aria-hidden="true" />
                      <button type="button" disabled={isResolving} onClick={() => handleResolve(item.id, { action: 'service_account' })} className={quiet}>
                        Service account
                      </button>
                      <button type="button" disabled={isResolving} onClick={() => handleResolve(item.id, { action: 'departed' })} className={quiet}>
                        Former employee
                      </button>
                      <button type="button" disabled={isResolving} onClick={() => handleResolve(item.id, { action: 'ignore' })} className={quiet}>
                        Ignore
                      </button>
                    </div>
                  </div>

                  {isPicking && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:pl-11">
                      <div className="w-full sm:w-80">
                        <label htmlFor={`identity-${item.id}`} className="type-meta mb-1.5 block font-medium text-ink">
                          Who is {label}?
                        </label>
                        <PersonPicker
                          id={`identity-${item.id}`}
                          placeholder={peopleResource.status === 'error' ? 'Could not load people' : 'Select employee...'}
                          options={peopleOptions}
                          value={selectedPerson}
                          onChange={(p) => setSelectedPerson(p)}
                        />
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!selectedPerson || isResolving}
                        onClick={() => selectedPerson && handleResolve(item.id, { action: 'link', personId: selectedPerson.id })}
                      >
                        Confirm Link
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
