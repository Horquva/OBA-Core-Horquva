'use client';

import * as React from 'react';
import type { ConnectionsOverview, SyncableConnectionType } from '@/types/view';
import { FullPageWizard, type WizardStep } from '@/components/ui/FullPageWizard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createConnection, fetchConnections, fetchOrganization, saveOrganization, syncConnection } from '@/lib/api/settings';
import { useResource } from '@/lib/useResource';
import { toApiError } from '@/lib/api/client';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import { ConnectionFields, TestConnectionButton, TYPE_LABELS, cleanConfig, isConfigComplete } from '@/features/settings/ConnectionForm';
import { CsvImportCard, summarizeRunStats } from '@/features/settings/ConnectionsView';

const STEPS: WizardStep[] = [
  { id: 'organization', title: 'Your organization', description: 'The name people see on confirmation emails and reports.' },
  { id: 'directory', title: 'Connect your directory', description: 'Who works here, their teams and managers. Read-only access is enough.' },
  { id: 'automations', title: 'Connect your automations', description: 'Where the workflows people own live: n8n, or a CSV if there is no API to read.' },
  { id: 'baseline', title: 'Run the first sync', description: 'Pulls everything in once, so the dashboard shows your organization instead of an empty state.' },
];

const DIRECTORY_TYPES: SyncableConnectionType[] = ['entra', 'google'];
/** Same list the backend uses to decide the organization step is not done (routes/onboarding.ts). */
const PLACEHOLDER_NAMES = new Set(['Your organization', 'Acme Corporation']);
const POLL_MS = 2000;

const inputClass =
  'w-full rounded-control border border-rule bg-surface p-2.5 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber';

export interface OnboardingWizardModalProps {
  onClose: () => void;
  /** Called when the wizard finishes or something was saved, so the banner can refresh. */
  onChanged: () => void;
}

export function OnboardingWizardModal({ onClose, onChanged }: OnboardingWizardModalProps) {
  const [step, setStep] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const connectionsResource = useResource<ConnectionsOverview>('setup-connections', fetchConnections);
  const connections = connectionsResource.status === 'ready' ? connectionsResource.data : connectionsResource.lastData ?? null;
  const loadConnections = connectionsResource.reload;

  const org = useResource('setup-organization', fetchOrganization);
  const [typedName, setCompanyName] = React.useState<string | null>(null);
  const savedName = org.status === 'ready' && !PLACEHOLDER_NAMES.has(org.data.companyName.trim()) ? org.data.companyName : '';
  const companyName = typedName ?? savedName;
  const [dirType, setDirType] = React.useState<SyncableConnectionType>('entra');
  const [dirConfig, setDirConfig] = React.useState<Record<string, string>>({});
  const [n8nConfig, setN8nConfig] = React.useState<Record<string, string>>({});

  const existing = (types: string[]) => connections?.connections.filter((c) => types.includes(c.type)) ?? [];
  const directories = existing(DIRECTORY_TYPES);
  const automations = existing(['n8n', 'csv']);
  const syncable = existing(['n8n', 'entra', 'google', 'ai_admin']);

  // ── Step actions ──────────────────────────────────────────────────────────
  const saveStep = async (): Promise<boolean> => {
    setError(null);
    setBusy(true);
    try {
      if (step === 0) {
        const org = await fetchOrganization();
        await saveOrganization({ ...org, companyName: companyName.trim() });
      } else if (step === 1 && directories.length === 0 && isConfigComplete(dirType, dirConfig)) {
        await createConnection({ type: dirType, name: TYPE_LABELS[dirType], config: cleanConfig(dirType, dirConfig) });
        setDirConfig({});
        loadConnections();
      } else if (step === 2 && !automations.some((c) => c.type === 'n8n') && isConfigComplete('n8n', n8nConfig)) {
        await createConnection({ type: 'n8n', name: 'n8n', config: cleanConfig('n8n', n8nConfig) });
        setN8nConfig({});
        loadConnections();
      }
      onChanged();
      return true;
    } catch (e) {
      setError(toApiError(e).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const goTo = async (next: number) => {
    if (next > step && !(await saveStep())) return;
    setStep(next);
  };

  // ── Baseline sync ─────────────────────────────────────────────────────────
  const [syncStarted, setSyncStarted] = React.useState(false);
  const syncing = syncable.some((c) => c.status === 'syncing');

  React.useEffect(() => {
    if (!syncing) return;
    const t = setInterval(loadConnections, POLL_MS);
    return () => clearInterval(t);
  }, [syncing, loadConnections]);

  React.useEffect(() => {
    if (syncStarted && !syncing) onChanged();
  }, [syncStarted, syncing, onChanged]);

  const runFirstSync = async () => {
    setError(null);
    setSyncStarted(true);
    const failures: string[] = [];
    for (const c of syncable.filter((x) => x.status !== 'syncing')) {
      await syncConnection(c.id).catch((e) => failures.push(`${c.name}: ${toApiError(e).message}`));
    }
    if (failures.length) setError(failures.join(' · '));
    loadConnections();
  };

  const canProceed =
    !busy &&
    (step !== 0 || companyName.trim() !== '') &&
    (step !== 3 || (syncStarted && !syncing));

  const nextLabel =
    step === 1 ? (directories.length || isConfigComplete(dirType, dirConfig) ? 'Save & continue' : 'Skip for now')
      : step === 2 ? (automations.length || isConfigComplete('n8n', n8nConfig) ? 'Save & continue' : 'Skip for now')
        : step === 3 ? 'Finish'
          : undefined;

  return (
    <FullPageWizard
      title="Set up Horquva"
      steps={STEPS}
      currentStepIndex={step}
      onStepChange={(i) => void goTo(i)}
      onCancel={onClose}
      onComplete={() => {
        onChanged();
        onClose();
      }}
      isSubmitting={busy}
      canProceed={canProceed}
      nextLabel={nextLabel}
    >
      {step === 0 && (
        <div className="space-y-1.5 text-xs">
          <label htmlFor="setup-company" className="font-semibold text-ink block">Organization name</label>
          <input id="setup-company" className={inputClass} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Northwind University" />
        </div>
      )}

      {step === 1 &&
        (directories.length > 0 ? (
          <AlreadyConnected names={directories.map((c) => `${c.name} (${TYPE_LABELS[c.type]})`)} />
        ) : (
          <div className="space-y-5 text-xs">
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">Directory</legend>
              {DIRECTORY_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 rounded-control border border-rule p-2.5 cursor-pointer has-[:checked]:border-amber has-[:checked]:bg-amber/10">
                  <input type="radio" name="setup-directory" checked={dirType === t} onChange={() => { setDirType(t); setDirConfig({}); }} />
                  <span className="text-ink">{TYPE_LABELS[t]}</span>
                </label>
              ))}
            </fieldset>
            <ConnectionFields type={dirType} config={dirConfig} onChange={setDirConfig} idPrefix="setup-directory" />
            <TestConnectionButton type={dirType} config={dirConfig} />
          </div>
        ))}

      {step === 2 && (
        <div className="space-y-6">
          {automations.length > 0 && <AlreadyConnected names={automations.map((c) => `${c.name} (${TYPE_LABELS[c.type]})`)} />}
          {!automations.some((c) => c.type === 'n8n') && (
            <Card className="p-5 bg-surface border border-rule space-y-4">
              <h3 className="text-sm font-semibold text-ink">n8n</h3>
              <ConnectionFields type="n8n" config={n8nConfig} onChange={setN8nConfig} idPrefix="setup-n8n" />
              <TestConnectionButton type="n8n" config={n8nConfig} />
            </Card>
          )}
          <CsvImportCard onImported={() => { loadConnections(); onChanged(); }} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 text-xs">
          {syncable.length === 0 ? (
            <Card className="p-5 bg-surface border border-rule text-ink-3">
              No service to sync yet{automations.length ? ' (CSV imports are already loaded)' : ''}. You can connect one later in Settings → Connections.
            </Card>
          ) : (
            <>
              <ul className="space-y-2">
                {syncable.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-rule bg-surface p-3">
                    <span className="font-medium text-ink">{c.name}</span>
                    <span className={cn('font-mono', c.status === 'error' ? 'text-st-fail' : c.status === 'syncing' ? 'text-amber-ink' : 'text-ink-3')}>
                      {c.status === 'syncing'
                        ? 'syncing…'
                        : c.status === 'error'
                          ? `failed: ${c.lastError ?? 'unknown error'}`
                          : c.lastRun?.status === 'completed'
                            ? summarizeRunStats(c.lastRun.stats) ?? 'synced'
                            : 'not synced yet'}
                    </span>
                  </li>
                ))}
              </ul>
              {!syncStarted && <Button variant="primary" onClick={runFirstSync}>Run first sync</Button>}
              {syncStarted && !syncing && (
                <p role="status" className="text-ink-2">
                  {syncable.some((c) => c.status === 'connected')
                    ? `Done. ${formatNumber(connections?.sources.reduce((n, s) => n + s.relationships, 0) ?? 0)} relationships on record.${syncable.some((c) => c.status === 'error') ? ' Some services failed; retry them from Settings → Connections.' : ''}`
                    : 'Nothing was synced. Fix the settings in Settings → Connections and use Sync now.'}
                </p>
              )}
            </>
          )}
          {syncable.length === 0 && !syncStarted && (
            <Button variant="secondary" onClick={() => setSyncStarted(true)}>Skip</Button>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-control bg-st-fail/10 border border-st-fail/20 p-3 text-xs text-st-fail">
          {error}
        </div>
      )}
    </FullPageWizard>
  );
}

function AlreadyConnected({ names }: { names: string[] }) {
  return (
    <Card className="p-5 bg-surface border border-rule text-xs space-y-1">
      <p className="font-semibold text-st-pass">Already connected</p>
      <ul className="text-ink-2 list-disc pl-4">
        {names.map((n) => <li key={n}>{n}</li>)}
      </ul>
    </Card>
  );
}
