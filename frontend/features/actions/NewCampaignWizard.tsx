'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CampaignScope, CampaignPreview, CreateCampaignInput, EntityRef } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { PersonPicker } from '@/components/ui/PersonPicker';
import { CampaignEmailPreview } from './CampaignEmailPreview';
import { previewCampaign, createCampaign } from '@/lib/api/confirmations';
import { fetchPeople } from '@/lib/api/entities';
import { fetchTeams } from '@/lib/api/people';
import { useResource } from '@/lib/useResource';
import { toApiError } from '@/lib/api/client';
import { cn } from '@/lib/cn';

export interface NewCampaignWizardProps {
  initialPreview?: CampaignPreview;
}

type WizardStep = 1 | 2 | 3 | 4;

export function NewCampaignWizard({ initialPreview }: NewCampaignWizardProps) {
  const router = useRouter();
  const [step, setStep] = React.useState<WizardStep>(1);

  // Step 1: Scope
  const [scopeKind, setScopeKind] = React.useState<CampaignScope['kind']>('all_unknown_critical');
  // A real directory team (by id), not free text with an invented default.
  const [department, setDepartment] = React.useState('');
  const teamsResource = useResource('campaign-teams', fetchTeams);
  const peopleResource = useResource('campaign-people', fetchPeople);
  const peopleOptions = React.useMemo(
    () => (peopleResource.status === 'ready' ? peopleResource.data : []),
    [peopleResource],
  );
  const [leaverPerson, setLeaverPerson] = React.useState<EntityRef | null>(null);

  // Step 2 & 3: Preview Data
  const [preview, setPreview] = React.useState<CampaignPreview | null>(initialPreview || null);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
  const [subject, setSubject] = React.useState('');
  const [bodyText, setBodyText] = React.useState('');

  // Step 4: Schedule
  const [campaignName, setCampaignName] = React.useState('Q4 Critical Systems Certification');
  const [dueDate, setDueDate] = React.useState(
    () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [introLine, setIntroLine] = React.useState('Please verify your ownership and backup assignments.');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<import('@/types/view').CampaignCreated | null>(null);

  const emailInput = React.useMemo(
    () => ({
      dueDate: new Date(dueDate).toISOString(),
      introLine: introLine.trim() || null,
      email: subject.trim() && bodyText.trim() ? { subject: subject.trim(), bodyText: bodyText.trim() } : null,
      tasks: preview?.tasks ?? [],
    }),
    [dueDate, introLine, subject, bodyText, preview],
  );

  const getScope = (): CampaignScope => {
    if (scopeKind === 'department') return { kind: 'department', department };
    if (scopeKind === 'leaver' && leaverPerson) return { kind: 'leaver', personId: leaverPerson.id };
    return { kind: 'all_unknown_critical' };
  };

  const handleNextFromScope = async () => {
    setIsLoadingPreview(true);
    setError(null);
    try {
      const scope = getScope();
      const p = await previewCampaign(scope);
      setPreview(p);
      setSubject(p.email.subject);
      setBodyText(p.email.bodyText);
      setStep(2);
    } catch (err) {
      setError(`Could not preview this campaign: ${toApiError(err).message}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!preview) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const input: CreateCampaignInput = { ...emailInput, name: campaignName.trim(), sendAt: null /* immediate */ };
      // Show what actually happened (emailed, or only logged) before leaving.
      setCreated(await createCampaign(input));
    } catch (err) {
      setError(`Could not create the campaign: ${toApiError(err).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Header & Back Link */}
      <div className="space-y-4">
        <Link
          href="/actions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-ink transition-colors"
        >
          <span aria-hidden="true">←</span>
          <span>Back to Actions & Confirmations</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/50 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
                Attestation Campaign Creator
              </span>
            </div>
            <h1 className="text-3xl text-ink font-semibold tracking-tight">
              New Confirmation Campaign
            </h1>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {[1, 2, 3, 4].map((s) => (
              <span
                key={s}
                className={cn(
                  'h-6 w-6 rounded-full flex items-center justify-center font-bold transition-colors',
                  step === s
                    ? 'bg-amber text-paper'
                    : step > s
                    ? 'bg-st-pass text-paper'
                    : 'bg-surface-sunken text-ink-3',
                )}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-card border border-st-fail/30 bg-st-fail/10 text-xs text-st-fail">
          {error}
        </div>
      )}

      {/* Step 1: Scope */}
      {step === 1 && (
        <Card className="p-6 bg-surface shadow-card space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-ink">Step 1: Choose Campaign Scope</h2>
            <p className="text-xs text-ink-3">
              Define which unknown facts and unverified assets to target for attestation.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-start gap-3 p-3.5 rounded-card border border-rule hover:border-amber cursor-pointer transition-colors">
              <input
                type="radio"
                name="scope"
                checked={scopeKind === 'all_unknown_critical'}
                onChange={() => setScopeKind('all_unknown_critical')}
                className="mt-0.5 text-amber focus:ring-amber"
              />
              <div>
                <span className="font-semibold text-ink block">All Unknown Critical Facts</span>
                <span className="text-ink-3 block mt-0.5">
                  Targets every critical asset with unconfirmed ownership, missing backups, or undocumented runbooks.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-card border border-rule hover:border-amber cursor-pointer transition-colors">
              <input
                type="radio"
                name="scope"
                checked={scopeKind === 'department'}
                onChange={() => setScopeKind('department')}
                className="mt-0.5 text-amber focus:ring-amber"
              />
              <div className="w-full">
                <span className="font-semibold text-ink block">Specific Department</span>
                <span className="text-ink-3 block mt-0.5">
                  Scope verification to teams and systems owned by a specific department.
                </span>
                {scopeKind === 'department' && (
                  <select
                    aria-label="Team"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="mt-2 w-full max-w-sm rounded-control border border-rule bg-surface p-2 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
                  >
                    <option value="">
                      {teamsResource.status === 'error' ? 'Could not load teams' : 'Choose a team…'}
                    </option>
                    {(teamsResource.status === 'ready' ? teamsResource.data.teams : []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-card border border-rule hover:border-amber cursor-pointer transition-colors">
              <input
                type="radio"
                name="scope"
                checked={scopeKind === 'leaver'}
                onChange={() => setScopeKind('leaver')}
                className="mt-0.5 text-amber focus:ring-amber"
              />
              <div className="w-full">
                <span className="font-semibold text-ink block">Departing Person Handover</span>
                <span className="text-ink-3 block mt-0.5">
                  Target assets previously owned or maintained by an upcoming leaver.
                </span>
                {scopeKind === 'leaver' && (
                  <div className="mt-2 max-w-sm">
                    <PersonPicker
                      placeholder={peopleResource.status === 'error' ? 'Could not load people' : 'Select leaver...'}
                      options={peopleOptions}
                      value={leaverPerson}
                      onChange={(p) => setLeaverPerson(p)}
                    />
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-rule/50">
            <button
              type="button"
              onClick={handleNextFromScope}
              disabled={isLoadingPreview || (scopeKind === 'leaver' && !leaverPerson) || (scopeKind === 'department' && !department)}
              className="rounded-control bg-amber text-paper px-4 py-2 text-xs font-semibold hover:bg-amber-hover transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoadingPreview ? 'Analyzing Scope...' : 'Continue to Review →'}
            </button>
          </div>
        </Card>
      )}

      {/* Step 2: Review Preview */}
      {step === 2 && preview && (
        <Card className="p-6 bg-surface shadow-card space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-ink">Step 2: Review Attestation Scope</h2>
            <p className="text-xs text-ink-3">
              Inspect the questions and recipients before dispatching questionnaires.
            </p>
          </div>
          {preview.unassignedAssets.length > 0 && (
            <p className="rounded-control border border-amber/30 bg-amber/10 p-3 text-xs text-amber-ink">
              {preview.unassignedAssets.length} system{preview.unassignedAssets.length === 1 ? ' has' : 's have'} no current
              owner on record, so nobody can be asked: {preview.unassignedAssets.map((a) => a.name).join(', ')}.
            </p>
          )}

          {/* Metric Summary */}
          <div className="grid grid-cols-3 gap-4 text-xs font-mono text-center">
            <div className="rounded-card bg-surface-sunken p-3">
              <span className="text-xl font-bold text-ink block">{preview.reviewers.length}</span>
              <span className="text-ink-3">Reviewers</span>
            </div>
            <div className="rounded-card bg-surface-sunken p-3">
              <span className="text-xl font-bold text-ink block">{preview.questionCount}</span>
              <span className="text-ink-3">Questions</span>
            </div>
            <div className="rounded-card bg-surface-sunken p-3">
              <span className="text-xl font-bold text-ink block">{preview.emailCount}</span>
              <span className="text-ink-3">Emails to Dispatch</span>
            </div>
          </div>

          {/* Reviewers List */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
              Targeted Reviewers ({preview.reviewers.length})
            </h3>
            <div className="divide-y divide-rule border border-rule rounded-card bg-surface max-h-60 overflow-y-auto">
              {preview.reviewers.map((r) => (
                <div key={r.person.id} className="p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-medium text-ink">{r.person.name}</span>
                    <span className="text-ink-3 font-mono text-[11px] block">{r.email}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-badge bg-surface-sunken text-ink text-[11px] font-mono">
                    {r.assetCount} assets to certify
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-rule/50">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken cursor-pointer"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={preview.tasks.length === 0}
              title={preview.tasks.length === 0 ? 'Nobody to ask in this scope' : undefined}
              className="rounded-control bg-amber text-paper px-4 py-2 text-xs font-semibold hover:bg-amber-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Configure Message →
            </button>
          </div>
        </Card>
      )}

      {/* Step 3: Message Preview */}
      {step === 3 && (
        <Card className="p-6 bg-surface shadow-card space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-ink">Step 3: Email Notification Preview</h2>
            <p className="text-xs text-ink-3">
              Edit the wording; the preview below is the actual email, rendered by the server that sends it.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label htmlFor="subject-input" className="font-semibold text-ink block">
                Email Subject
              </label>
              <input
                id="subject-input"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-control border border-rule bg-surface p-2 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber font-mono"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="body-input" className="font-semibold text-ink block">
                Email Body Text
              </label>
              <textarea
                id="body-input"
                rows={6}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full rounded-control border border-rule bg-surface p-2 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber font-mono"
              />
            </div>
          </div>

          <CampaignEmailPreview input={emailInput} />

          <div className="flex items-center justify-between pt-4 border-t border-rule/50">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken cursor-pointer"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="rounded-control bg-amber text-paper px-4 py-2 text-xs font-semibold hover:bg-amber-hover transition-colors cursor-pointer"
            >
              Schedule & Launch →
            </button>
          </div>
        </Card>
      )}

      {created && (
        <div role="status" className="rounded-card border border-rule bg-surface p-5 space-y-3 text-sm">
          <p className="font-semibold text-ink">Campaign created for {created.reviewers} reviewer{created.reviewers === 1 ? '' : 's'}.</p>
          {created.emailDelivery === 'logged' ? (
            <p className="text-xs text-amber-ink">
              Email isn&apos;t configured on this server, so nothing was emailed. Each reviewer&apos;s link was written to the
              server log; share it with them directly.
            </p>
          ) : (
            <p className="text-xs text-ink-3">
              {created.emailsSent} of {created.reviewers} emails sent
              {created.emailsSent < created.reviewers ? '; the rest failed — check the server log.' : '.'}
            </p>
          )}
          <button
            type="button"
            onClick={() => router.push('/actions')}
            className="rounded-control bg-amber text-paper px-3 py-1.5 text-xs font-semibold"
          >
            Back to Actions
          </button>
        </div>
      )}

      {/* Step 4: Schedule & Launch */}
      {step === 4 && !created && (
        <Card className="p-6 bg-surface shadow-card space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-ink">Step 4: Campaign Schedule & Name</h2>
            <p className="text-xs text-ink-3">
              Set deadlines and finalize creation.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label htmlFor="name-input" className="font-semibold text-ink block">
                Campaign Name
              </label>
              <input
                id="name-input"
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full rounded-control border border-rule bg-surface p-2 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="due-date-input" className="font-semibold text-ink block">
                Certification Due Date
              </label>
              <input
                id="due-date-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full max-w-xs rounded-control border border-rule bg-surface p-2 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="intro-input" className="font-semibold text-ink block">
                Introductory note (first line of the email and the form)
              </label>
              <input
                id="intro-input"
                type="text"
                value={introLine}
                onChange={(e) => setIntroLine(e.target.value)}
                className="w-full rounded-control border border-rule bg-surface p-2 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
              />
            </div>
          </div>

          <CampaignEmailPreview input={emailInput} />

          <div className="rounded-control bg-surface-sunken p-3 text-xs text-ink-3 border border-rule/60">
            <p className="font-semibold text-ink mb-0.5">Reminders</p>
            <p>
              Reminder emails aren&apos;t sent automatically yet. Check progress on the Confirmations tab and follow up
              with anyone who hasn&apos;t answered.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-rule/50">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken cursor-pointer"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleLaunchCampaign}
              disabled={isSubmitting || !campaignName.trim()}
              className="rounded-control bg-amber text-paper px-5 py-2 text-xs font-semibold hover:bg-amber-hover transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Launching...' : '🚀 Launch Campaign'}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
