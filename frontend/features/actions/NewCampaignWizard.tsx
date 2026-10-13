'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CampaignScope, CampaignPreview, CreateCampaignInput, EntityRef } from '@/types/view';
import { ArrowLeft, Check, Send } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
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

  const STEPS = ['Who to ask', 'Review', 'Message', 'Schedule'] as const;
  const inputCls =
    'type-meta h-10 w-full rounded-control border border-rule bg-surface px-3 text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none';
  const scopeOption = (kind: CampaignScope['kind'], title: string, body: string, extra?: React.ReactNode) => (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-control border px-4 py-3.5 transition-colors',
        scopeKind === kind ? 'border-ink-3 bg-surface-sunken/50' : 'border-rule hover:border-ink-3',
      )}
    >
      <input type="radio" name="scope" checked={scopeKind === kind} onChange={() => setScopeKind(kind)} className="mt-1 accent-[var(--amber)]" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="type-meta mt-0.5 block text-ink-3">{body}</span>
        {scopeKind === kind && extra}
      </span>
    </label>
  );
  const footer = (back: (() => void) | null, next: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3 border-t border-rule bg-surface-sunken/40 px-6 py-3.5">
      {back ? (
        <Button variant="secondary" size="sm" onClick={back}>
          Back
        </Button>
      ) : (
        <span />
      )}
      {next}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div className="space-y-4 pt-2">
        <Link href="/actions?tab=confirmations" className="type-meta inline-flex items-center gap-1.5 font-medium text-ink-3 transition-colors hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Confirmations
        </Link>
        <header>
          <h1 className="type-title text-ink">New confirmation campaign</h1>
          <p className="mt-1 text-sm text-ink-2">Ask owners to confirm who owns and backs up their systems.</p>
        </header>
        {/* Stepper */}
        <ol className="grid grid-cols-4 gap-2" aria-label="Campaign steps">
          {STEPS.map((label, i) => {
            const n = (i + 1) as WizardStep;
            const done = step > n || !!created;
            const current = step === n && !created;
            return (
              <li key={label} aria-current={current ? 'step' : undefined} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                    done && 'bg-st-pass text-paper',
                    current && 'bg-amber text-on-amber ring-4 ring-amber/20',
                    !done && !current && 'border border-rule text-ink-3',
                  )}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : n}
                </span>
                <span className={cn('type-meta truncate font-medium', done || current ? 'text-ink' : 'text-ink-3')}>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {error && (
        <div role="alert" className="type-meta rounded-control border border-st-fail/30 bg-[color-mix(in_srgb,var(--st-fail)_8%,transparent)] px-4 py-3 text-st-fail">
          {error}
        </div>
      )}

      {/* Step 1: Scope */}
      {step === 1 && (
        <Panel aria-labelledby="step-1-heading">
          <div className="px-6 pb-2 pt-5">
            <h2 id="step-1-heading" className="type-heading text-ink">
              Who should we ask?
            </h2>
            <p className="type-meta mt-0.5 text-ink-3">Pick the systems to confirm; we&apos;ll ask whoever owns each one.</p>
          </div>
          <div className="space-y-2.5 px-6 py-4">
            {scopeOption('all_unknown_critical', 'Every critical system with something unknown', 'Unconfirmed owners, missing backups or no runbook.')}
            {scopeOption(
              'department',
              'One team',
              "Systems owned by a team's members.",
              <select
                aria-label="Team"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className={cn(inputCls, 'mt-2.5 max-w-sm')}
              >
                <option value="">{teamsResource.status === 'error' ? 'Could not load teams' : 'Choose a team…'}</option>
                {(teamsResource.status === 'ready' ? teamsResource.data.teams : []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>,
            )}
            {scopeOption(
              'leaver',
              "Someone who's leaving",
              'Systems they own or look after, before they go.',
              <div className="mt-2.5 max-w-sm">
                <PersonPicker
                  placeholder={peopleResource.status === 'error' ? 'Could not load people' : 'Choose a person…'}
                  options={peopleOptions}
                  value={leaverPerson}
                  onChange={(p) => setLeaverPerson(p)}
                />
              </div>,
            )}
          </div>
          {footer(
            null,
            <Button
              variant="primary"
              size="sm"
              onClick={handleNextFromScope}
              disabled={isLoadingPreview || (scopeKind === 'leaver' && !leaverPerson) || (scopeKind === 'department' && !department)}
            >
              {isLoadingPreview ? 'Working it out…' : 'Continue'}
            </Button>,
          )}
        </Panel>
      )}

      {/* Step 2: Review */}
      {step === 2 && preview && (
        <Panel aria-labelledby="step-2-heading">
          <div className="px-6 pb-4 pt-5">
            <h2 id="step-2-heading" className="type-heading text-ink">
              Review who gets asked
            </h2>
            <p className="type-meta mt-0.5 text-ink-3">Check the people and questions before anything is sent.</p>
          </div>
          {preview.unassignedAssets.length > 0 && (
            <p className="type-meta mx-6 mb-4 rounded-control border border-amber/40 bg-[color-mix(in_srgb,var(--amber)_8%,transparent)] px-3.5 py-2.5 text-ink">
              {preview.unassignedAssets.length} system{preview.unassignedAssets.length === 1 ? ' has' : 's have'} no current owner on record, so nobody can be
              asked: {preview.unassignedAssets.map((a) => a.name).join(', ')}.
            </p>
          )}
          <div className="grid grid-cols-3 gap-px border-y border-rule bg-rule">
            {[
              { label: 'Reviewers', value: preview.reviewers.length },
              { label: 'Questions', value: preview.questionCount },
              { label: 'Emails', value: preview.emailCount },
            ].map((t) => (
              <div key={t.label} className="bg-surface px-6 py-3.5">
                <p className="type-meta text-ink-3">{t.label}</p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums text-ink">{t.value}</p>
              </div>
            ))}
          </div>
          <div>
            <h3 className="type-meta px-6 pb-1 pt-4 font-medium text-ink">Targeted Reviewers ({preview.reviewers.length})</h3>
            <ul className="max-h-72 divide-y divide-rule overflow-y-auto">
              {preview.reviewers.map((r) => (
                <li key={r.person.id} className="flex items-center gap-3 px-6 py-2.5">
                  <Avatar name={r.person.name} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="type-meta block truncate font-medium text-ink">{r.person.name}</span>
                    <span className="block truncate text-[11px] text-ink-3">
                      {r.email}
                      {r.viaManager && ' · via their manager'}
                    </span>
                  </span>
                  <span className="type-meta shrink-0 text-ink-2">
                    {r.assetCount} {r.assetCount === 1 ? 'system' : 'systems'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {footer(
            () => setStep(1),
            <Button variant="primary" size="sm" onClick={() => setStep(3)} disabled={preview.tasks.length === 0} title={preview.tasks.length === 0 ? 'Nobody to ask in this scope' : undefined}>
              Continue
            </Button>,
          )}
        </Panel>
      )}

      {/* Step 3: Message */}
      {step === 3 && (
        <Panel aria-labelledby="step-3-heading">
          <div className="px-6 pb-2 pt-5">
            <h2 id="step-3-heading" className="type-heading text-ink">
              The email they&apos;ll get
            </h2>
            <p className="type-meta mt-0.5 text-ink-3">Edit the wording; the preview is the real email, rendered by the server that sends it.</p>
          </div>
          <div className="space-y-4 px-6 py-4">
            <div className="space-y-1.5">
              <label htmlFor="subject-input" className="type-meta block font-medium text-ink">
                Subject
              </label>
              <input id="subject-input" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="body-input" className="type-meta block font-medium text-ink">
                Message
              </label>
              <textarea
                id="body-input"
                rows={6}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="type-meta w-full rounded-control border border-rule bg-surface p-3 text-ink focus:border-ink-3 focus:outline-none"
              />
            </div>
            <CampaignEmailPreview input={emailInput} />
          </div>
          {footer(
            () => setStep(2),
            <Button variant="primary" size="sm" onClick={() => setStep(4)}>
              Continue
            </Button>,
          )}
        </Panel>
      )}

      {created && (
        <Panel role="status" className="px-6 py-5">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--st-pass)_14%,transparent)] text-st-pass">
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">
                Campaign created for {created.reviewers} reviewer{created.reviewers === 1 ? '' : 's'}.
              </p>
              {created.emailDelivery === 'logged' ? (
                <p className="type-meta mt-1 text-amber-ink">
                  Email isn&apos;t configured on this server, so nothing was emailed. Each reviewer&apos;s link was written to the server log; share it with
                  them directly.
                </p>
              ) : (
                <p className="type-meta mt-1 text-ink-3">
                  {created.emailsSent} of {created.reviewers} emails sent
                  {created.emailsSent < created.reviewers ? '; the rest failed, check the server log.' : '.'}
                </p>
              )}
              <div className="mt-4">
                <Button variant="primary" size="sm" onClick={() => router.push('/actions?tab=confirmations')}>
                  Back to Actions
                </Button>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Step 4: Schedule */}
      {step === 4 && !created && (
        <Panel aria-labelledby="step-4-heading">
          <div className="px-6 pb-2 pt-5">
            <h2 id="step-4-heading" className="type-heading text-ink">
              Name it and set a deadline
            </h2>
            <p className="type-meta mt-0.5 text-ink-3">It&apos;s sent as soon as you launch.</p>
          </div>
          <div className="grid gap-4 px-6 py-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="name-input" className="type-meta block font-medium text-ink">
                Campaign name
              </label>
              <input id="name-input" type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="due-date-input" className="type-meta block font-medium text-ink">
                Due date
              </label>
              <input id="due-date-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="intro-input" className="type-meta block font-medium text-ink">
                Opening line (first line of the email and the form)
              </label>
              <input id="intro-input" type="text" value={introLine} onChange={(e) => setIntroLine(e.target.value)} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <CampaignEmailPreview input={emailInput} />
            </div>
            <p className="type-meta text-ink-3 sm:col-span-2">
              Reminder emails aren&apos;t sent automatically yet. Check progress on the Confirmations tab and follow up with anyone who hasn&apos;t answered.
            </p>
          </div>
          {footer(
            () => setStep(3),
            <Button variant="primary" size="sm" onClick={handleLaunchCampaign} disabled={isSubmitting || !campaignName.trim()} leftIcon={!isSubmitting ? <Send className="h-3.5 w-3.5" aria-hidden="true" /> : undefined}>
              {isSubmitting ? 'Launching…' : 'Launch campaign'}
            </Button>,
          )}
        </Panel>
      )}
    </div>
  );
}
