'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CampaignScope, CampaignPreview, CreateCampaignInput, EntityRef } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PersonPicker } from '@/components/ui/PersonPicker';
import { previewCampaign, createCampaign } from '@/lib/api/confirmations';
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
  const [department, setDepartment] = React.useState('Engineering');
  const [leaverPerson, setLeaverPerson] = React.useState<EntityRef | null>(null);

  // Step 2 & 3: Preview Data
  const [preview, setPreview] = React.useState<CampaignPreview | null>(initialPreview || null);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
  const [subject, setSubject] = React.useState('');
  const [bodyText, setBodyText] = React.useState('');

  // Step 4: Schedule
  const [campaignName, setCampaignName] = React.useState('Q4 Critical Systems Certification');
  const [dueDate, setDueDate] = React.useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [introLine, setIntroLine] = React.useState('Please verify your ownership and backup assignments.');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
    } catch (err: any) {
      setError(err?.message || 'Failed to generate campaign preview.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!preview) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const input: CreateCampaignInput = {
        name: campaignName.trim(),
        dueDate: new Date(dueDate).toISOString(),
        sendAt: null, // immediate
        introLine: introLine.trim() || null,
        tasks: preview.tasks,
      };
      await createCampaign(input);
      router.push('/actions');
    } catch (err: any) {
      setError(err?.message || 'Failed to create and dispatch campaign.');
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
            <h1 className="font-serif text-3xl text-ink font-normal tracking-tight">
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
        <div className="p-4 rounded-card border border-st-fail/30 bg-st-fail/10 text-xs text-st-fail">
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
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Infrastructure, Billing, Finance"
                    className="mt-2 w-full max-w-sm rounded-control border border-rule bg-surface p-2 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
                  />
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
                      placeholder="Select leaver..."
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
              disabled={isLoadingPreview || (scopeKind === 'leaver' && !leaverPerson)}
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
              className="rounded-control bg-amber text-paper px-4 py-2 text-xs font-semibold hover:bg-amber-hover transition-colors cursor-pointer"
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
              Review and customize the email notification sent to reviewers with their secure single-use attestation link.
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

      {/* Step 4: Schedule & Launch */}
      {step === 4 && (
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
                Introductory Note (Displayed on Attestation Form)
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

          <div className="rounded-control bg-surface-sunken p-3 text-xs text-ink-3 border border-rule/60">
            <p className="font-semibold text-ink mb-0.5">Automated Reminders</p>
            <p>
              Reviewers will automatically receive gentle reminder emails 48 hours and 24 hours prior to the due date.
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
