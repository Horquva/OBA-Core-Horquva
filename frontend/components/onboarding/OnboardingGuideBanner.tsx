'use client';

import * as React from 'react';
import type { OnboardingStatus } from '@/types/view';
import { Button } from '@/components/ui/Button';
import { useResource } from '@/lib/useResource';
import { useSession } from '@/lib/session';
import { canManageSettings } from '@/lib/permissions';
import { fetchOnboardingStatus, dismissOnboarding } from '@/lib/api/onboarding';
import { toApiError } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { OnboardingWizardModal } from './OnboardingWizardModal';

const STEP_LABELS: Array<[keyof OnboardingStatus['steps'], string]> = [
  ['organization', 'Organization'],
  ['directory', 'Directory'],
  ['automations', 'Automations'],
  ['baseline', 'First sync'],
];

/**
 * Non-blocking setup guide at the top of the app (admins only). Steps come
 * from GET /api/onboarding/status, i.e. from what is really configured. Hidden
 * once everything is done or an admin dismisses it; also hidden when the
 * backend runs without a database, where there is nothing to set up.
 */
export function OnboardingGuideBanner() {
  const { session } = useSession();
  const isAdmin = canManageSettings(session);
  const status = useResource<OnboardingStatus>(isAdmin ? 'onboarding-status' : null, fetchOnboardingStatus);
  const [open, setOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // The wizard is opened from here but must survive the status reloads it triggers,
  // so it is rendered independently of whether the banner itself is showing.
  const wizard = open ? <OnboardingWizardModal onClose={() => setOpen(false)} onChanged={status.reload} /> : null;
  const s = status.status === 'ready' ? status.data : status.lastData;
  if (!isAdmin || hidden || !s || s.store !== 'database' || s.dismissedAt || s.completed) return wizard;

  const done = Object.values(s.steps).filter(Boolean).length;

  const dismiss = async () => {
    setError(null);
    try {
      await dismissOnboarding();
      setHidden(true);
    } catch (e) {
      setError(toApiError(e).message);
    }
  };

  return (
    <>
      <section aria-label="Setup guide" className="mb-6 rounded-card border border-amber/30 bg-amber/10 p-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-semibold text-ink">
            Setup guide: {done} of {STEP_LABELS.length} done
          </p>
          <div className="h-1.5 w-28 rounded-full bg-surface-sunken" role="progressbar" aria-label="Setup progress" aria-valuenow={done} aria-valuemin={0} aria-valuemax={STEP_LABELS.length}>
            <div className="h-1.5 rounded-full bg-amber" style={{ width: `${(done / STEP_LABELS.length) * 100}%` }} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
              {done === 0 ? 'Start setup' : 'Continue setup'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed} aria-controls="setup-guide-steps">
              {collapsed ? 'Show steps' : 'Hide steps'}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>Dismiss</Button>
          </div>
        </div>
        {!collapsed && (
          <ol id="setup-guide-steps" className="mt-3 flex flex-wrap gap-2">
            {STEP_LABELS.map(([key, label], i) => (
              <li
                key={key}
                className={cn(
                  'rounded-badge border px-2.5 py-1',
                  s.steps[key] ? 'border-st-pass/30 bg-st-pass/10 text-st-pass' : 'border-rule bg-surface text-ink-2',
                )}
              >
                <span className="sr-only">{s.steps[key] ? 'Done: ' : 'To do: '}</span>
                {i + 1}. {label}
              </li>
            ))}
          </ol>
        )}
        {error && <p role="alert" className="mt-2 text-st-fail">{`Couldn't dismiss: ${error}`}</p>}
      </section>
      {wizard}
    </>
  );
}
