'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ConnectionsOverview, ConnectionTestResult, ConnectionView, CsvImportResult } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton, ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchConnections, importCsv, syncConnection, testSavedConnection } from '@/lib/api/settings';
import { toApiError } from '@/lib/api/client';
import { useSession } from '@/lib/session';
import { canManageSettings } from '@/lib/permissions';
import { formatDate, formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import { TYPE_LABELS } from './ConnectionForm';
import { AddConnectionModal } from './AddConnectionModal';

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
  connected: 'bg-st-pass/15 text-st-pass',
  syncing: 'bg-amber/15 text-amber-ink',
  error: 'bg-st-fail/15 text-st-fail',
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
    <div className="space-y-6">
      {/* Header with n8n Scan CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/50 pb-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Connectors & Data Sources</h2>
          <p className="text-xs text-ink-3 mt-0.5">
            Where OBA&apos;s data comes from: configured connectors and what each source has contributed.
          </p>
        </div>

        <Link
          href="/settings/connections/n8n-check"
          className="rounded-control bg-amber text-on-amber px-3.5 py-2 text-xs font-semibold hover:bg-amber-hover transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
        >
          <span>Run n8n Ownership Scan →</span>
        </Link>
      </div>

      {/* Prominent Stateless n8n Callout */}
      <Card className="p-5 bg-surface-sunken/40 border border-rule space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-ink font-semibold">
              Stateless Security Scan
            </span>
            <h3 className="text-lg font-semibold text-ink">
              Audit your n8n workflows without storing credentials
            </h3>
            <p className="text-xs text-ink-3 leading-relaxed max-w-2xl">
              Perform an in-memory scan of your self-hosted or cloud n8n workflows to immediately detect
              single-owner risks, personal API credentials, and failing automated pipelines.
            </p>
          </div>
          <Link
            href="/settings/connections/n8n-check"
            className="rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken transition-colors shrink-0"
          >
            Launch Scan
          </Link>
        </div>
      </Card>


      {!overview && resource.status === 'loading' ? (
        <div className="space-y-4">
          <Skeleton variant="card" className="h-28" />
          <Skeleton variant="card" className="h-28" />
        </div>
      ) : !overview ? (
        <ErrorState onRetry={resource.reload} message="Could not load connections." />
      ) : (
        <>
          <section className="space-y-3" aria-labelledby="configured-connectors">
            <div className="flex items-center justify-between gap-3">
              <h3 id="configured-connectors" className="text-sm font-semibold text-ink">Configured connectors</h3>
              {isAdmin && overview.store === 'database' && (
                <Button size="sm" variant="primary" onClick={() => setAddOpen(true)}>
                  Add connection
                </Button>
              )}
            </div>
            {overview.store === 'unavailable' ? (
              <Card className="p-5 bg-surface border border-rule text-xs text-ink-3 space-y-1">
                <p className="text-ink font-medium">No connectors to show.</p>
                <p>
                  Connector settings live in the database, and this backend can&apos;t reach it, so OBA is running on the
                  data it was loaded with (below).
                </p>
              </Card>
            ) : overview.connections.length === 0 ? (
              <Card className="p-5 bg-surface border border-rule text-xs text-ink-3">
                No connectors have been set up yet.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {overview.connections.map((c) => (
                  <Card key={c.id} className="p-5 bg-surface border border-rule shadow-card space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-ink">{c.name}</h4>
                      <span className={cn('px-2 py-0.5 rounded-badge text-[10px] font-mono uppercase font-semibold', STATUS_STYLES[c.status])}>
                        {c.status === 'syncing' ? 'syncing…' : c.status}
                      </span>
                      {isAdmin && c.type !== 'csv' && (
                        <div className="ml-auto flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => runTest(c)} disabled={!!busy[c.id] || c.status === 'syncing'} isLoading={busy[c.id] === 'test'}>
                            Test
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => runSync(c)} disabled={!!busy[c.id] || c.status === 'syncing'} isLoading={busy[c.id] === 'sync' || c.status === 'syncing'}>
                            {c.status === 'syncing' ? 'Syncing…' : 'Sync now'}
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-ink-3 font-mono">
                      {TYPE_LABELS[c.type] ?? c.type} · Last sync: {c.lastSyncAt ? formatDate(c.lastSyncAt) : 'never'}
                    </p>
                    {c.lastRun && (
                      <p className="text-xs text-ink-3 font-mono">
                        Last run {c.lastRun.status}
                        {c.lastRun.status === 'completed' && summarizeRunStats(c.lastRun.stats) && ` · ${summarizeRunStats(c.lastRun.stats)}`}
                      </p>
                    )}
                    {notes[c.id] && (
                      <p role="status" className={cn('text-xs', notes[c.id].tone === 'ok' ? 'text-st-pass' : 'text-st-fail')}>
                        {notes[c.id].text}
                      </p>
                    )}
                    {(c.lastError || c.lastRun?.error) && (
                      <div className="rounded-control bg-st-fail/10 border border-st-fail/20 p-3 text-xs font-mono text-st-fail">
                        Error: {c.lastError || c.lastRun?.error}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
            {overview.store === 'database' && (
              <p className="text-[11px] text-ink-3">Connected services sync automatically every hour.</p>
            )}
          </section>

          {isAdmin && overview.store === 'database' && <CsvImportCard onImported={reload} />}

          <section className="space-y-3" aria-labelledby="data-on-record">
            <h3 id="data-on-record" className="text-sm font-semibold text-ink">Data on record, by source</h3>
            {overview.sources.length === 0 ? (
              <Card className="p-5 bg-surface border border-rule text-xs text-ink-3">No data has been loaded yet.</Card>
            ) : (
              <div className="border border-rule rounded-card bg-surface overflow-x-auto" tabIndex={0} role="region" aria-label="Data on record by source">
                <table className="w-full text-left text-xs" aria-label="Data on record by source">
                  <thead className="border-b border-rule bg-surface-sunken/60 font-mono text-[11px] text-ink-3">
                    <tr>
                      <th scope="col" className="p-3 font-semibold">Source</th>
                      <th scope="col" className="p-3 font-semibold text-right">Relationships</th>
                      <th scope="col" className="p-3 font-semibold text-right">Facts</th>
                      <th scope="col" className="p-3 font-semibold">Most recent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {overview.sources.map((src) => (
                      <tr key={src.source}>
                        <td className="p-3 text-ink font-medium">{SOURCE_LABELS[src.source] ?? src.source}</td>
                        <td className="p-3 text-right font-mono tabular-nums">{formatNumber(src.relationships)}</td>
                        <td className="p-3 text-right font-mono tabular-nums">{formatNumber(src.facts)}</td>
                        <td className="p-3 font-mono text-ink-3">{src.latestAt ? formatDate(src.latestAt) : 'Unknown'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
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

  return (
    <section className="space-y-3" aria-labelledby="csv-import">
      <h3 id="csv-import" className="text-sm font-semibold text-ink">Import from CSV</h3>
      <Card className="p-5 bg-surface border border-rule space-y-4 text-xs">
        <p className="text-ink-3 leading-relaxed">
          People: <span className="font-mono">email, name, department, job_title, manager_email, status</span>.
          Automations: <span className="font-mono">id, name, owner_email, backup_owner_email, criticality, is_documented, doc_url, fallback_exists, weekly_runs</span>.
          A backup named in a spreadsheet counts as <em>stated</em> until that person confirms it.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="csv-people" className="font-semibold text-ink block">People CSV</label>
            <input id="csv-people" ref={peopleRef} type="file" accept=".csv,text/csv" onChange={refresh} className="text-xs text-ink-2" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="csv-automations" className="font-semibold text-ink block">Automations CSV</label>
            <input id="csv-automations" ref={autoRef} type="file" accept=".csv,text/csv" onChange={refresh} className="text-xs text-ink-2" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={run} disabled={!hasFile || busy} isLoading={busy}>Import</Button>
          {result && (
            <span role="status" className={result.tone === 'ok' ? 'text-st-pass' : 'text-st-fail'}>{result.text}</span>
          )}
        </div>
      </Card>
    </section>
  );
}
