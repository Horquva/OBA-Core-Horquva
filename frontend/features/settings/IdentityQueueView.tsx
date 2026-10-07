'use client';

import * as React from 'react';
import type { IdentityQueueItemView, IdentityResolution, EntityRef } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PersonPicker } from '@/components/ui/PersonPicker';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchIdentityQueue, resolveIdentity } from '@/lib/api/settings';
import { fetchPeople } from '@/lib/api/entities';
import { toApiError } from '@/lib/api/client';
import { cn } from '@/lib/cn';

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

  return (
    <div className="space-y-6">
      <div className="border-b border-rule/50 pb-4">
        <h2 className="text-base font-semibold text-ink">Identity Resolution Queue</h2>
        <p className="text-xs text-ink-3 mt-0.5">
          Map unverified creator aliases and third-party logins to canonical employees or service accounts.
        </p>
      </div>

      {notice && (
        <div
          role={notice.ok ? 'status' : 'alert'}
          className={cn(
            'rounded-control border p-3 text-xs font-mono',
            notice.ok ? 'bg-amber/10 border-amber/30 text-amber-ink' : 'bg-st-fail/10 border-st-fail/30 text-st-fail',
          )}
        >
          {notice.text}
        </div>
      )}

      {/* Invariant Note */}
      <div className="rounded-card bg-surface-sunken/40 p-4 border border-rule text-xs text-ink-3 space-y-1">
        <strong className="text-ink block">Integrity Invariant:</strong>
        <p>
          Unmatched accounts are rendered across Horquva as <span className="font-semibold text-ink">Unknown owner</span>.
          They are never treated as "no owner" or omitted from risk calculations.
        </p>
      </div>

      {queueResource.status === 'loading' && !initialItems ? (
        <div className="space-y-4">
          <Skeleton variant="card" className="h-32" />
          <Skeleton variant="card" className="h-32" />
        </div>
      ) : queueResource.status === 'error' ? (
        <ErrorState
          onRetry={queueResource.reload}
          message="Could not load identity resolution queue."
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing waiting for review"
          description="Every account seen so far has been matched to a person or resolved."
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const isResolving = resolvingId === item.id;
            const isPickingPerson = linkingPersonId === item.id;

            return (
              <Card
                key={item.id}
                className="p-5 bg-surface border border-rule shadow-card space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-ink">
                        {item.displayName || item.emailCandidate || 'Unknown Alias'}
                      </span>
                      <span className="px-2 py-0.5 rounded-badge bg-surface-sunken text-[10px] font-mono text-ink-3 uppercase">
                        Source: {item.source}
                      </span>
                    </div>

                    <p className="text-xs text-ink-3 font-mono">
                      Email candidate: {item.emailCandidate || 'None recorded'}
                    </p>

                    {item.suggestion && (
                      <div className="pt-1 text-xs">
                        <span className="text-ink-3">Suggested match: </span>
                        <strong className="text-ink">{item.suggestion.person.name}</strong>{' '}
                        <span className="text-ink-3 font-mono">({item.suggestion.reason})</span>
                      </div>
                    )}
                  </div>

                  {/* Resolution Buttons */}
                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                    {item.suggestion && !isPickingPerson && (
                      <button
                        type="button"
                        disabled={isResolving}
                        onClick={() =>
                          handleResolve(item.id, {
                            action: 'link',
                            personId: item.suggestion!.person.id,
                          })
                        }
                        className="rounded-control bg-amber text-on-amber px-3 py-1.5 text-xs font-semibold hover:bg-amber-hover transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Accept Match ({item.suggestion.person.name})
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isResolving}
                      onClick={() => setLinkingPersonId(isPickingPerson ? null : item.id)}
                      className="rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                    >
                      {isPickingPerson ? 'Cancel' : 'Pick Person...'}
                    </button>

                    <button
                      type="button"
                      disabled={isResolving}
                      onClick={() => handleResolve(item.id, { action: 'service_account' })}
                      className="rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                    >
                      Mark Service Account
                    </button>

                    <button
                      type="button"
                      disabled={isResolving}
                      onClick={() => handleResolve(item.id, { action: 'departed' })}
                      className="rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                    >
                      Former Employee
                    </button>

                    <button
                      type="button"
                      disabled={isResolving}
                      onClick={() => handleResolve(item.id, { action: 'ignore' })}
                      className="rounded-control border border-rule bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-3 hover:text-ink transition-colors cursor-pointer"
                    >
                      Ignore
                    </button>
                  </div>
                </div>

                {/* Inline Person Picker Container */}
                {isPickingPerson && (
                  <div className="rounded-control bg-surface-sunken p-4 border border-rule space-y-3">
                    <label className="text-xs font-semibold text-ink block">
                      Choose canonical employee to associate with {item.displayName || item.emailCandidate}:
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="w-full sm:w-80">
                        <PersonPicker
                          placeholder={peopleResource.status === 'error' ? 'Could not load people' : 'Select employee...'}
                          options={peopleOptions}
                          value={selectedPerson}
                          onChange={(p) => setSelectedPerson(p)}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={!selectedPerson || isResolving}
                        onClick={() => {
                          if (selectedPerson) {
                            handleResolve(item.id, { action: 'link', personId: selectedPerson.id });
                          }
                        }}
                        className="rounded-control bg-amber text-on-amber px-4 py-2 text-xs font-semibold hover:bg-amber-hover transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Confirm Link
                      </button>
                    </div>
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
