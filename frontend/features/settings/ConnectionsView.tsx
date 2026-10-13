'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ConnectionsOverview, ConnectionTestResult, ConnectionView, CsvImportResult } from '@/types/view';
import { ChevronDown, Plug, ScanSearch, Upload } from 'lucide-react';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchConnections, importCsv, syncConnection, testSavedConnection } from '@/lib/api/settings';
import { toApiError } from '@/lib/api/client';
import { useSession } from '@/lib/session';
import { canManageSettings } from '@/lib/permissions';
import { formatDate, formatNumber, formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';
import { TYPE_LABELS } from './ConnectionForm';
import { AddConnectionModal } from './AddConnectionModal';
import { SectionHeader } from './SectionHeader';

export interface ConnectionsViewProps {
  initialOverview?: ConnectionsOverview;
}

const SOURCE_LABELS: Record<string, string> = {
  entra: 'Microsoft Entra ID',
  google: 'Google Workspace',
  n8n: 'n8n',
  csv: 'CSV import',
  attestation: 'Confirmed by the people themselves',
  manual_assignment: 'Assigned in OBA',
};

const STATUS_STYLES: Record<ConnectionView['status'], string> = {
  connected: 'bg-[color-mix(in_srgb,var(--st-pass)_13%,transparent)] text-st-pass',
  syncing: 'bg-[color-mix(in_srgb,var(--amber)_16%,transparent)] text-amber-ink',
  error: 'bg-[color-mix(in_srgb,var(--st-fail)_12%,transparent)] text-st-fail',
  disconnected: 'bg-surface-sunken text-ink-3',
};

const POLL_MS = 2000;

/** The counts a person cares about from a sync run (the run also stores internal flags). */
export function summarizeRunStats(stats: Record<string, unknown>): string | null {
  const n = (k: string) => (typeof stats[k] === 'number' ? (stats[k] as number) : null);
  const parts: string[] = [];
  if (n('entitiesUpserted') !== null) parts.push(`${formatNumber(n('entitiesUpserted')!)} people & systems`);
  if (n('edgesCreated') !== null || n('edgesClosed') !== null) {
    parts.push(`+${formatNumber(n('edgesCreated') ?? 0)} / −${formatNumber(n('edgesClosed') ?? 0)} relationships`);
  }
  const factsIn = (n('factsCreated') ?? 0) + (n('factsVersioned') ?? 0);
  if (n('factsCreated') !== null) parts.push(`${formatNumber(factsIn)} facts updated`);
  if (n('orphansSkipped')) parts.push(`${formatNumber(n('orphansSkipped')!)} skipped (unknown people or systems)`);
  if (parts.length === 0) {
    const numeric = Object.entries(stats).filter(([, v]) => typeof v === 'number') as Array<[string, number]>;
    if (numeric.length === 0) return null;
    return numeric.map(([k, v]) => `${k.replace(/_/g, ' ')} ${formatNumber(v)}`).join(', ');
  }
  return parts.join(' · ');
}

function without<T>(map: Record<string, T>, key: string): Record<string, T> {
  const next = { ...map };
  delete next[key];
  return next;
}

function readFile(file: File | null | undefined): Promise<string | undefined> {
  return file ? file.text() : Promise.resolve(undefined);
}

export function ConnectionsView({ initialOverview }: ConnectionsViewProps) {
  const resource = useResource<ConnectionsOverview>('settings-connections', fetchConnections);
  const { session } = useSession();
  const isAdmin = canManageSettings(session);

  // Keep showing the last data while a background reload (polling) runs.
  const overview = resource.status === 'ready' ? resource.data : resource.lastData ?? initialOverview;

  const [addOpen, setAddOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<Record<string, 'sync' | 'test'>>({});
  const [notes, setNotes] = React.useState<Record<string, { tone: 'ok' | 'fail'; text: string }>>({});

  const anySyncing = overview?.connections.some((c) => c.status === 'syncing') ?? false;
  const { reload } = resource;
  React.useEffect(() => {
    if (!anySyncing) return;
    const t = setInterval(reload, POLL_MS);
    return () => clearInterval(t);
  }, [anySyncing, reload]);

  const note = (id: string, tone: 'ok' | 'fail', text: string) => setNotes((n) => ({ ...n, [id]: { tone, text } }));

  const runSync = async (c: ConnectionView) => {
    setBusy((b) => ({ ...b, [c.id]: 'sync' }));
    setNotes((n) => without(n, c.id));
    try {
      await syncConnection(c.id);
      reload();
    } catch (e) {
      note(c.id, 'fail', `Couldn't start the sync: ${toApiError(e).message}`);
    } finally {
      setBusy((b) => without(b, c.id));
    }
  };

  const runTest = async (c: ConnectionView) => {
    setBusy((b) => ({ ...b, [c.id]: 'test' }));
    try {
      const r: ConnectionTestResult = await testSavedConnection(c.id);
      note(c.id, r.ok ? 'ok' : 'fail', r.ok ? 'Connected. The saved credentials work.' : `Couldn't connect: ${r.error}`);
    } catch (e) {
      note(c.id, 'fail', `Couldn't test: ${toApiError(e).message}`);
    } finally {
      setBusy((b) => without(b, c.id));
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Connectors & Data Sources"
        description="Where OBA's data comes from: the services it syncs with, and what each source has contributed."
        action={
          isAdmin && overview?.store === 'database' ? (
            <Button size="sm" variant="primary" onClick={() => setAddOpen(true)} leftIcon={<Plug className="h-3.5 w-3.5" aria-hidden="true" />}>
              Add connection
            </Button>
          ) : undefined
        }
      />

      {/* The one-off n8n scan, mentioned once. */}
      <div className="type-meta flex flex-col gap-2 rounded-control border border-rule bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2.5 text-ink-2">
          <ScanSearch className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
          Check an n8n instance for single owners and personal credentials, without saving the key.
        </span>
        <Link href="/settings/connections/n8n-check" className="shrink-0 font-medium text-ink hover:text-amber-ink">
          Run n8n scan →
        </Link>
      </div>

      {!overview && resource.status === 'loading' ? (
        <span className="skeleton block h-40 rounded-panel" />
      ) : !overview ? (
        <Panel className="p-5">
          <ErrorState onRetry={resource.reload} message="We couldn't load connections." />
        </Panel>
      ) : (
        <>
          <Panel aria-labelledby="configured-connectors">
            <PanelHeader
              titleId="configured-connectors"
              title="Configured connectors"
              icon={<Plug />}
              count={overview.store === 'database' ? overview.connections.length : undefined}
              description={overview.store === 'database' ? 'Connected services sync automatically every hour.' : undefined}
            />
            {overview.store === 'unavailable' ? (
              <div className="px-5 py-6">
                <p className="type-heading text-ink">No connectors to show.</p>
                <p className="type-meta mt-1 text-ink-3">
                  Connector settings live in the database, and this backend can&apos;t reach it, so OBA is running on the data it was loaded with (below).
                </p>
              </div>
            ) : overview.connections.length === 0 ? (
              <p className="type-meta px-5 py-6 text-ink-3">No connectors have been set up yet.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {overview.connections.map((c) => {
                  const err = c.lastError || c.lastRun?.error;
                  const stats = c.lastRun?.status === 'completed' ? summarizeRunStats(c.lastRun.stats) : null;
                  return (
                    <li key={c.id} className="px-5 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <span aria-hidden="true" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-rule bg-surface-sunken text-ink-2">
                          <Plug className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-medium text-ink">{c.name}</h3>
                            <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium', STATUS_STYLES[c.status])}>
                              {c.status === 'syncing' ? 'syncing…' : c.status}
                            </span>
                          </div>
                          <p className="type-meta mt-0.5 text-ink-3">
                            {TYPE_LABELS[c.type] ?? c.type} ·{' '}
                            {c.lastSyncAt ? <span title={formatDate(c.lastSyncAt)}>Synced {formatRelative(c.lastSyncAt)}</span> : 'Never synced'}
                          </p>
                          {c.lastRun && (
                            <p className="type-meta mt-0.5 text-ink-3">
                              Last run {c.lastRun.status}
                              {stats && ` · ${stats}`}
                            </p>
                          )}
                        </div>
                        {isAdmin && c.type !== 'csv' && (
                          <div className="flex shrink-0 items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => runTest(c)} disabled={!!busy[c.id] || c.status === 'syncing'} isLoading={busy[c.id] === 'test'}>
                              Test
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => runSync(c)} disabled={!!busy[c.id] || c.status === 'syncing'} isLoading={busy[c.id] === 'sync' || c.status === 'syncing'}>
                              {c.status === 'syncing' ? 'Syncing…' : 'Sync now'}
                            </Button>
                          </div>
                        )}
                      </div>
                      {(notes[c.id] || err) && (
                        <div className="mt-2 space-y-1 sm:pl-12">
                          {notes[c.id] && (
                            <p role="status" className={cn('type-meta', notes[c.id].tone === 'ok' ? 'text-st-pass' : 'text-st-fail')}>
                              {notes[c.id].text}
                            </p>
                          )}
                          {err && <p className="type-meta text-st-fail">Error: {err}</p>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {isAdmin && overview.store === 'database' && <CsvImportCard onImported={reload} />}

          <Panel aria-labelledby="data-on-record">
            <PanelHeader titleId="data-on-record" title="Data on record, by source" description="What each source has contributed to the graph." />
            {overview.sources.length === 0 ? (
              <p className="type-meta px-5 py-6 text-ink-3">No data has been loaded yet.</p>
            ) : (
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Data on record by source">
                <table className="w-full text-left" aria-label="Data on record by source">
                  <thead>
                    <tr className="type-meta border-b border-rule text-ink-3">
                      <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Source</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Relationships</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Facts</th>
                      <th scope="col" className="py-2.5 pl-3 pr-5 font-medium">Most recent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {overview.sources.map((src) => (
                      <tr key={src.source} className="transition-colors hover:bg-surface-sunken/40">
                        <td className="py-2.5 pl-5 pr-3 text-sm font-medium text-ink">{SOURCE_LABELS[src.source] ?? src.source}</td>
                        <td className="type-meta px-3 py-2.5 text-right tabular-nums text-ink-2">{formatNumber(src.relationships)}</td>
                        <td className="type-meta px-3 py-2.5 text-right tabular-nums text-ink-2">{formatNumber(src.facts)}</td>
                        <td className="type-meta py-2.5 pl-3 pr-5 text-ink-3">{src.latestAt ? <span title={formatDate(src.latestAt)}>{formatRelative(src.latestAt)}</span> : 'Unknown'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      {addOpen && (
        <AddConnectionModal
          isOpen
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

/** One-off import for orgs without a directory or n8n API: people and/or automations as CSV. */
export function CsvImportCard({ onImported }: { onImported: () => void }) {
  const peopleRef = React.useRef<HTMLInputElement>(null);
  const autoRef = React.useRef<HTMLInputElement>(null);
  const [hasFile, setHasFile] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<{ tone: 'ok' | 'fail'; text: string } | null>(null);

  const refresh = () => setHasFile(!!(peopleRef.current?.files?.length || autoRef.current?.files?.length));

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const [peopleCsv, automationsCsv] = await Promise.all([readFile(peopleRef.current?.files?.[0]), readFile(autoRef.current?.files?.[0])]);
      const r: CsvImportResult = await importCsv({ peopleCsv, automationsCsv });
      if (r.ok) {
        setResult({ tone: 'ok', text: `Imported. ${summarizeRunStats(r.stats ?? {}) ?? ''}`.trim() });
        if (peopleRef.current) peopleRef.current.value = '';
        if (autoRef.current) autoRef.current.value = '';
        setHasFile(false);
        onImported();
      } else {
        setResult({ tone: 'fail', text: `The import failed: ${r.error}` });
      }
    } catch (e) {
      setResult({ tone: 'fail', text: `The import failed: ${toApiError(e).message}` });
    } finally {
      setBusy(false);
    }
  };

  const [showColumns, setShowColumns] = React.useState(false);
  const fileCls =
    'type-meta block w-full cursor-pointer rounded-control border border-dashed border-rule bg-surface-sunken/40 px-3 py-2.5 text-ink-2 file:mr-3 file:cursor-pointer file:rounded-control file:border-0 file:bg-surface file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-ink hover:border-ink-3';

  return (
    <Panel aria-labelledby="csv-import">
      <PanelHeader titleId="csv-import" title="Import from CSV" icon={<Upload />} description="For orgs without a directory or n8n API: upload people and/or automations." />
      <div className="space-y-4 px-5 py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="csv-people" className="type-meta block font-medium text-ink">People CSV</label>
            <input id="csv-people" ref={peopleRef} type="file" accept=".csv,text/csv" onChange={refresh} className={fileCls} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="csv-automations" className="type-meta block font-medium text-ink">Automations CSV</label>
            <input id="csv-automations" ref={autoRef} type="file" accept=".csv,text/csv" onChange={refresh} className={fileCls} />
          </div>
        </div>
        <div>
          <button type="button" onClick={() => setShowColumns((v) => !v)} aria-expanded={showColumns} className="type-meta inline-flex cursor-pointer items-center gap-1 font-medium text-ink-2 hover:text-ink">
            What columns?
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showColumns && 'rotate-180')} aria-hidden="true" />
          </button>
          {showColumns && (
            <dl className="type-meta mt-2 space-y-1.5 rounded-control bg-surface-sunken/50 px-3.5 py-3 text-ink-2">
              <div>
                <dt className="inline font-medium text-ink">People: </dt>
                <dd className="inline">email, name, department, job_title, manager_email, status</dd>
              </div>
              <div>
                <dt className="inline font-medium text-ink">Automations: </dt>
                <dd className="inline">id, name, owner_email, backup_owner_email, criticality, is_documented, doc_url, fallback_exists, weekly_runs</dd>
              </div>
              <p className="text-ink-3">A backup named in a spreadsheet counts as stated until that person confirms it.</p>
            </dl>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-rule bg-surface-sunken/40 px-5 py-3">
        <Button variant="secondary" size="sm" onClick={run} disabled={!hasFile || busy} isLoading={busy}>Import</Button>
        {result && (
          <span role="status" className={cn('type-meta', result.tone === 'ok' ? 'text-st-pass' : 'text-st-fail')}>{result.text}</span>
        )}
      </div>
    </Panel>
  );
}
