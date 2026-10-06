'use client';

import * as React from 'react';
import type { AttestAnswers, AttestSession, EntityRef } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PersonPicker } from '@/components/ui/PersonPicker';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { CriticalityDots } from '@/components/ui/marks';
import { useResource } from '@/lib/useResource';
import { fetchAttestSession, saveAttestAnswers, loadAttestPeople } from '@/lib/api/attest';
import { toApiError } from '@/lib/api/client';
import { Brand } from '@/components/shell/Brand';
import { cn } from '@/lib/cn';

export interface AttestFormProps {
  token: string;
  initialSession?: AttestSession;
}

export function AttestForm({ token, initialSession }: AttestFormProps) {
  const sessionResource = useResource<AttestSession>(
    `attest-session-${token}`,
    () => fetchAttestSession(token),
  );

  const session =
    sessionResource.status === 'ready'
      ? sessionResource.data
      : initialSession;

  // Real directory people for the owner/backup pickers (they were given no options before D12).
  const peopleResource = useResource<EntityRef[]>(
    session ? `attest-people-${token}` : null,
    () => loadAttestPeople(session!),
  );
  const peopleOptions = React.useMemo(
    () => (peopleResource.status === 'ready' ? peopleResource.data : []),
    [peopleResource],
  );
  const reviewerEmail = session?.reviewer.email;
  const backupOptions = React.useMemo(
    // You can't be your own backup.
    () => peopleOptions.filter((p) => p.id !== `person:${reviewerEmail}`),
    [peopleOptions, reviewerEmail],
  );

  // Track active asset index
  const [activeAssetIndex, setActiveAssetIndex] = React.useState<number>(0);
  const [savedAssetIds, setSavedAssetIds] = React.useState<Record<string, boolean>>({});

  // Question 1: Ownership
  const [isOwner, setIsOwner] = React.useState<boolean>(true);
  const [newOwner, setNewOwner] = React.useState<EntityRef | null>(null);

  // Question 2: Secondary Backup
  const [backupOption, setBackupOption] = React.useState<'person' | 'none'>('person');
  const [backupPerson, setBackupPerson] = React.useState<EntityRef | null>(null);

  // Question 3: Criticality
  // No pre-selected answer: the owner has to choose (a default would be recorded as "confirmed").
  const [criticality, setCriticality] = React.useState<'critical' | 'high' | 'medium' | 'low' | null>(null);
  const [criticalityReason, setCriticalityReason] = React.useState('');

  // Question 4: Runbook
  const [hasRunbook, setHasRunbook] = React.useState<boolean>(true);
  const [runbookUrl, setRunbookUrl] = React.useState('');

  // Question 5: Fallback (Yes / No / Don't know)
  const [fallback, setFallback] = React.useState<'yes' | 'no' | 'unknown'>('unknown');

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [isDone, setIsDone] = React.useState(false);

  // Pre-populate saved assets from session
  React.useEffect(() => {
    if (session) {
      const initialSaved: Record<string, boolean> = {};
      let firstTodoIndex = -1;
      session.assets.forEach((a, idx) => {
        if (a.status === 'saved') {
          initialSaved[a.taskId] = true;
        } else if (firstTodoIndex === -1) {
          firstTodoIndex = idx;
        }
      });
      setSavedAssetIds((prev) => ({ ...initialSaved, ...prev }));
      if (firstTodoIndex !== -1) {
        setActiveAssetIndex(firstTodoIndex);
      } else if (session.assets.length > 0 && session.submitted) {
        setIsDone(true);
      }
    }
  }, [session]);

  const currentAsset = session?.assets[activeAssetIndex];
  const totalAssets = session?.assets.length || 0;
  const completedCount = Object.keys(savedAssetIds).length;

  const handleSaveAndNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !currentAsset) return;

    if (isOwner && backupOption === 'person' && !backupPerson) {
      setSaveError('Please select a secondary backup nominee, or choose "No backup".');
      return;
    }

    if (isOwner && !criticality) {
      setSaveError('Please choose how critical this system is.');
      return;
    }

    if (isOwner && !criticalityReason.trim()) {
      setSaveError('Please provide a brief justification for this criticality level.');
      return;
    }

    if (isOwner && hasRunbook && !runbookUrl.trim()) {
      setSaveError('Please provide a runbook URL, or mark it as "Not documented".');
      return;
    }

    setSaveError(null);
    setIsSaving(true);

    // Not the owner: only say who is (if known). Nothing gets confirmed from this.
    const answers: AttestAnswers = !isOwner
      ? { isOwner: false, ownerPersonId: newOwner?.id ?? null }
      : {
          isOwner: true,
          ownerPersonId: null,
          backup:
            backupOption === 'person' && backupPerson
              ? { kind: 'person', personId: backupPerson.id }
              : { kind: 'none' },
          criticality: criticality!,
          criticalityReason: criticalityReason.trim(),
          runbook:
            hasRunbook && runbookUrl.trim()
              ? { kind: 'url', url: runbookUrl.trim() }
              : { kind: 'not_documented' },
          fallback,
        };

    try {
      await saveAttestAnswers(session, currentAsset.taskId, answers);
      const updatedSaved = { ...savedAssetIds, [currentAsset.taskId]: true };
      setSavedAssetIds(updatedSaved);

      // Find next un-saved asset index
      const nextIndex = session.assets.findIndex(
        (a, idx) => idx > activeAssetIndex && !updatedSaved[a.taskId],
      );

      if (nextIndex !== -1) {
        setActiveAssetIndex(nextIndex);
        // Reset inputs for next asset
        setIsOwner(true);
        setNewOwner(null);
        setBackupOption('person');
        setBackupPerson(null);
        setCriticality(null);
        setCriticalityReason('');
        setHasRunbook(true);
        setRunbookUrl('');
        setFallback('unknown');
      } else {
        // Check if any prior asset is incomplete
        const priorIncomplete = session.assets.findIndex((a) => !updatedSaved[a.taskId]);
        if (priorIncomplete !== -1) {
          setActiveAssetIndex(priorIncomplete);
        } else {
          setIsDone(true);
        }
      }
    } catch (err) {
      setSaveError(`Could not save: ${toApiError(err).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (sessionResource.status === 'loading' && !session) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
        <header className="h-16 border-b border-rule bg-surface/90 px-4 sm:px-8 flex items-center justify-between">
          <Brand />
        </header>
        <main className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-6 space-y-6">
          <Skeleton variant="card" className="h-40" />
          <Skeleton variant="card" className="h-80" />
        </main>
      </div>
    );
  }

  // Error state
  if ((sessionResource.status === 'error' && !session) || !session) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
        <header className="h-16 border-b border-rule bg-surface/90 px-4 sm:px-8 flex items-center justify-between">
          <Brand />
        </header>
        <main className="flex-1 max-w-xl mx-auto w-full p-6">
          <ErrorState
            onRetry={sessionResource.reload}
            message={
              sessionResource.status === 'error' && sessionResource.error.status === 404
                ? 'This link is not valid. Please check the link in your email or ask your administrator.'
                : 'Could not load this confirmation. Please retry or contact your administrator.'
            }
          />
        </main>
      </div>
    );
  }

  // Expired state
  if (session.expired) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
        <header className="h-16 border-b border-rule bg-surface/90 px-4 sm:px-8 flex items-center justify-between">
          <Brand />
        </header>
        <main className="flex-1 max-w-md mx-auto w-full p-6 flex flex-col justify-center">
          <Card className="p-6 bg-surface shadow-card text-center space-y-4">
            <span className="text-3xl" aria-hidden="true">
              ⏳
            </span>
            <h1 className="font-serif text-2xl text-ink font-normal">
              Attestation Link Expired
            </h1>
            <p className="text-xs text-ink-3 leading-relaxed">
              This verification link has expired. Please contact{' '}
              <strong className="text-ink">{session.requestedBy || 'your system administrator'}</strong>{' '}
              to request a new attestation link.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  // Finished / Already submitted state
  if (isDone || (session.submitted && completedCount >= totalAssets)) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
        <header className="h-16 border-b border-rule bg-surface/90 px-4 sm:px-8 flex items-center justify-between">
          <Brand />
          <span className="text-xs font-mono text-st-pass font-semibold">
            ✓ Attestation Completed
          </span>
        </header>

        <main className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-8 flex flex-col justify-center">
          <Card className="p-8 bg-surface shadow-card text-center space-y-6">
            <div className="h-12 w-12 rounded-full bg-st-pass/15 text-st-pass flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>

            <div className="space-y-2">
              <h1 className="font-serif text-2xl sm:text-3xl text-ink font-normal">
                Thanks — answers saved for {totalAssets} of {totalAssets}.
              </h1>
              <p className="text-xs text-ink-3 max-w-sm mx-auto leading-relaxed">
                What you confirmed about systems you own is now recorded as confirmed by you. Anyone you
                named as a backup will be asked to confirm it themselves. If you said a system isn't
                yours, an admin will follow up. You can close this tab.
              </p>
            </div>

            <div className="rounded-card border border-rule bg-surface-sunken/40 p-4 text-xs font-mono text-left space-y-2">
              <div className="flex justify-between border-b border-rule/40 pb-2">
                <span className="text-ink-3">Reviewer:</span>
                <span className="font-semibold text-ink">{session.reviewer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Systems answered:</span>
                <span className="font-semibold text-ink">{totalAssets}</span>
              </div>
            </div>
          </Card>
        </main>

        <footer className="py-4 text-center text-xs font-mono text-ink-3 border-t border-rule/50">
          Powered by OBA · Horquva
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
      {/* Branded Header */}
      <header className="border-b border-rule bg-surface/95 px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {session.company?.logoUrl ? (
            <img
              src={session.company.logoUrl}
              alt={session.company.name}
              className="h-8 max-w-[120px] object-contain"
            />
          ) : (
            <span className="font-serif text-lg font-bold text-ink">
              {session.company?.name || 'Horquva'}
            </span>
          )}
          <span className="h-4 w-px bg-rule hidden sm:inline" aria-hidden="true" />
          <span className="text-xs font-mono text-ink-3 hidden sm:inline">
            Ownership check requested by {session.requestedBy || 'Security & Continuity Admin'}
          </span>
        </div>

        <span className="text-xs font-mono font-semibold text-amber-ink bg-amber/15 px-2.5 py-1 rounded-badge">
          {completedCount} of {totalAssets} saved
        </span>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Progress & Stepper Carousel */}
        <div className="rounded-card border border-rule bg-surface p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-lg text-ink font-normal">
              Confirm {totalAssets} automations · about 1 min each
            </h1>
            <span className="text-xs font-mono text-ink-3">
              Asset {activeAssetIndex + 1} of {totalAssets}
            </span>
          </div>

          {/* Stepper Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {session.assets.map((a, idx) => {
              const isCurrent = idx === activeAssetIndex;
              const isSaved = Boolean(savedAssetIds[a.taskId]);

              return (
                <button
                  key={a.taskId}
                  type="button"
                  onClick={() => setActiveAssetIndex(idx)}
                  className={cn(
                    'h-7 px-3 rounded-full text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 min-h-[32px]',
                    isCurrent
                      ? 'bg-amber text-paper font-bold ring-2 ring-amber/30'
                      : isSaved
                        ? 'bg-st-pass/15 text-st-pass font-semibold'
                        : 'bg-surface-sunken text-ink-3 hover:text-ink',
                  )}
                  aria-label={`Jump to asset ${idx + 1}: ${a.asset.name}`}
                >
                  <span>{idx + 1}</span>
                  {isSaved && <span aria-hidden="true">✓</span>}
                  <span className="max-w-[100px] truncate hidden sm:inline">{a.asset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5-Question Scrollable Asset Card */}
        {currentAsset && (
          <Card className="p-6 bg-surface shadow-card space-y-6 border border-rule">
            <div className="border-b border-rule/50 pb-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-3 block mb-1">
                Targeted Automation
              </span>
              <h2 className="font-serif text-2xl text-ink font-normal leading-snug">
                {currentAsset.asset.name}
              </h2>
            </div>

            <form onSubmit={handleSaveAndNext} className="space-y-6">
              {/* Question 1: Ownership */}
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-ink">
                  1. Do you still own this system?
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOwner(true);
                      setNewOwner(null);
                    }}
                    className={cn(
                      'p-3 rounded-control border text-xs font-semibold transition-colors cursor-pointer min-h-[44px]',
                      isOwner
                        ? 'border-amber bg-amber/10 text-amber-ink'
                        : 'border-rule bg-surface text-ink-3 hover:text-ink',
                    )}
                  >
                    Yes, I own it
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOwner(false)}
                    className={cn(
                      'p-3 rounded-control border text-xs font-semibold transition-colors cursor-pointer min-h-[44px]',
                      !isOwner
                        ? 'border-amber bg-amber/10 text-amber-ink'
                        : 'border-rule bg-surface text-ink-3 hover:text-ink',
                    )}
                  >
                    No, someone else owns it
                  </button>
                </div>

                {!isOwner && (
                  <div className="pt-2 space-y-1">
                    <label className="text-[11px] font-mono text-ink-3 block">
                      Who owns it now? (if you know)
                    </label>
                    <PersonPicker
                      placeholder={peopleResource.status === 'error' ? 'Could not load people' : 'Select new owner...'}
                      options={peopleOptions}
                      value={newOwner}
                      onChange={(p) => setNewOwner(p)}
                    />
                    <p className="text-[11px] text-ink-3">
                      Optional. Nothing about this system will be confirmed from your answer; an admin will follow up.
                    </p>
                  </div>
                )}
              </fieldset>

              {isOwner && (
                <>
              {/* Question 2: Secondary Backup */}
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-ink">
                  2. Who is your designated secondary backup?
                </legend>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBackupOption('person')}
                      className={cn(
                        'p-3 rounded-control border text-xs font-semibold transition-colors cursor-pointer min-h-[44px]',
                        backupOption === 'person'
                          ? 'border-amber bg-amber/10 text-amber-ink'
                          : 'border-rule bg-surface text-ink-3 hover:text-ink',
                      )}
                    >
                      Assign Person
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBackupOption('none');
                        setBackupPerson(null);
                      }}
                      className={cn(
                        'p-3 rounded-control border text-xs font-semibold transition-colors cursor-pointer min-h-[44px]',
                        backupOption === 'none'
                          ? 'border-st-fail bg-st-fail/10 text-st-fail font-bold'
                          : 'border-rule bg-surface text-ink-3 hover:text-ink',
                      )}
                    >
                      No Backup (Critical Gap)
                    </button>
                  </div>

                  {backupOption === 'person' && (
                    <div className="pt-1">
                      <PersonPicker
                        placeholder={peopleResource.status === 'error' ? 'Could not load people' : 'Search backup nominee...'}
                        options={backupOptions}
                        value={backupPerson}
                        onChange={(p) => setBackupPerson(p)}
                      />
                      <p className="text-[11px] text-ink-3 pt-1">They'll be asked to confirm this themselves.</p>
                    </div>
                  )}
                </div>
              </fieldset>

              {/* Question 3: Criticality */}
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-ink">
                  3. How critical is this system to business continuity?
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['critical', 'high', 'medium', 'low'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setCriticality(lvl)}
                      aria-pressed={criticality === lvl}
                      className={cn(
                        'p-2.5 rounded-control border text-xs uppercase font-mono font-semibold transition-colors cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5',
                        criticality === lvl
                          ? 'border-amber bg-amber/10 text-amber-ink'
                          : 'border-rule bg-surface text-ink-3 hover:text-ink',
                      )}
                    >
                      <CriticalityDots level={lvl} />
                    </button>
                  ))}
                </div>

                <div className="pt-1 space-y-1">
                  <label htmlFor="crit-reason" className="text-[11px] font-mono text-ink-3 block">
                    One-line operational justification:
                  </label>
                  <input
                    id="crit-reason"
                    type="text"
                    required
                    value={criticalityReason}
                    onChange={(e) => setCriticalityReason(e.target.value)}
                    placeholder="e.g. Failure interrupts customer billing cycles immediately"
                    className="w-full rounded-control border border-rule bg-surface p-2 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber min-h-[44px]"
                  />
                </div>
              </fieldset>

              {/* Question 4: Runbook */}
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-ink">
                  4. Where is the operational runbook or recovery documentation?
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setHasRunbook(true)}
                    className={cn(
                      'p-3 rounded-control border text-xs font-semibold transition-colors cursor-pointer min-h-[44px]',
                      hasRunbook
                        ? 'border-amber bg-amber/10 text-amber-ink'
                        : 'border-rule bg-surface text-ink-3 hover:text-ink',
                    )}
                  >
                    Documented URL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHasRunbook(false);
                      setRunbookUrl('');
                    }}
                    className={cn(
                      'p-3 rounded-control border text-xs font-semibold transition-colors cursor-pointer min-h-[44px]',
                      !hasRunbook
                        ? 'border-amber bg-amber/10 text-amber-ink'
                        : 'border-rule bg-surface text-ink-3 hover:text-ink',
                    )}
                  >
                    Not Documented
                  </button>
                </div>

                {hasRunbook && (
                  <div className="pt-1">
                    <input
                      type="url"
                      value={runbookUrl}
                      onChange={(e) => setRunbookUrl(e.target.value)}
                      placeholder="https://wiki.internal/runbooks/billing-pipeline"
                      className="w-full rounded-control border border-rule bg-surface p-2 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber font-mono min-h-[44px]"
                    />
                  </div>
                )}
              </fieldset>

              {/* Question 5: Fallback */}
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-ink">
                  5. Is there a verified manual or automated fallback if this stops?
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFallback('yes')}
                    className={cn(
                      'p-2.5 rounded-control border text-xs font-semibold transition-colors cursor-pointer min-h-[44px]',
                      fallback === 'yes'
                        ? 'border-st-pass bg-st-pass/10 text-st-pass font-bold'
                        : 'border-rule bg-surface text-ink-3 hover:text-ink',
                    )}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFallback('no')}
                    className={cn(
                      'p-2.5 rounded-control border text-xs font-semibold transition-colors cursor-pointer min-h-[44px]',
                      fallback === 'no'
                        ? 'border-st-fail bg-st-fail/10 text-st-fail font-bold'
                        : 'border-rule bg-surface text-ink-3 hover:text-ink',
                    )}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setFallback('unknown')}
                    className={cn(
                      'p-2.5 rounded-control border text-xs font-semibold transition-colors cursor-pointer min-h-[44px]',
                      fallback === 'unknown'
                        ? 'border-amber bg-amber/10 text-amber-ink font-bold'
                        : 'border-rule bg-surface text-ink-3 hover:text-ink',
                    )}
                  >
                    Don't know
                  </button>
                </div>
                <p className="text-[11px] text-ink-3 font-mono">
                  Honest invariant: selecting "Don't know" preserves Unknown state rather than inventing answers.
                </p>
              </fieldset>
                </>
              )}

              {saveError && (
                <div className="rounded-control bg-st-fail/10 border border-st-fail/30 p-3 text-xs text-st-fail font-mono">
                  {saveError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-rule/50">
                <button
                  type="button"
                  disabled={activeAssetIndex === 0}
                  onClick={() => setActiveAssetIndex((prev) => Math.max(0, prev - 1))}
                  className="rounded-control border border-rule bg-surface px-4 py-2.5 text-xs font-medium text-ink hover:bg-surface-sunken disabled:opacity-40 min-h-[44px] cursor-pointer"
                >
                  ← Previous
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-control bg-amber text-paper px-6 py-2.5 text-xs font-semibold hover:bg-amber-hover transition-colors cursor-pointer disabled:opacity-50 min-h-[44px] shadow-xs"
                >
                  {isSaving
                    ? 'Saving fact...'
                    : activeAssetIndex + 1 === totalAssets
                      ? 'Save & Finish Confirmation'
                      : 'Save & Next Asset →'}
                </button>
              </div>
            </form>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs font-mono text-ink-3 border-t border-rule/50">
        Powered by OBA · Horquva
      </footer>
    </div>
  );
}
