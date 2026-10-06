'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ConnectionsOverview, ConnectionType, ConnectionView } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Skeleton, ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchConnections } from '@/lib/api/settings';
import { formatDate, formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface ConnectionsViewProps {
  initialOverview?: ConnectionsOverview;
}

const TYPE_LABELS: Record<ConnectionType, string> = {
  n8n: 'n8n Workflow Automation',
  entra: 'Microsoft Entra ID',
  google: 'Google Workspace',
  openai: 'OpenAI Platform',
  anthropic: 'Anthropic Claude API',
  csv: 'CSV / Manual Import',
};

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

export function ConnectionsView({ initialOverview }: ConnectionsViewProps) {
  const resource = useResource<ConnectionsOverview>('settings-connections', fetchConnections);
  const overview = resource.status === 'ready' ? resource.data : initialOverview;

  return (
    <div className="space-y-6">
      {/* Header with n8n Scan CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/50 pb-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Connectors & Data Sources</h2>
          <p className="text-xs text-ink-3 mt-0.5">
            Where OBA's data comes from: configured connectors and what each source has contributed.
          </p>
        </div>

        <Link
          href="/settings/connections/n8n-check"
          className="rounded-control bg-amber text-paper px-3.5 py-2 text-xs font-semibold hover:bg-amber-hover transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
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
            <h3 className="font-serif text-lg font-normal text-ink">
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
            <h3 id="configured-connectors" className="text-sm font-semibold text-ink">Configured connectors</h3>
            {overview.store === 'unavailable' ? (
              <Card className="p-5 bg-surface border border-rule text-xs text-ink-3 space-y-1">
                <p className="text-ink font-medium">No connectors to show.</p>
                <p>
                  Connector settings live in the database, and this backend can't reach it, so OBA is running on the
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
                      <h4 className="font-serif text-lg font-normal text-ink">{c.name}</h4>
                      <span className={cn('px-2 py-0.5 rounded-badge text-[10px] font-mono uppercase font-semibold', STATUS_STYLES[c.status])}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-ink-3 font-mono">
                      {TYPE_LABELS[c.type] ?? c.type} · Last sync: {c.lastSyncAt ? formatDate(c.lastSyncAt) : 'never'}
                    </p>
                    {c.lastRun && (
                      <p className="text-xs text-ink-3 font-mono">
                        Last run {c.lastRun.status}
                        {Object.keys(c.lastRun.stats).length > 0 &&
                          ` · ${Object.entries(c.lastRun.stats).map(([k, v]) => `${k.replace(/_/g, ' ')} ${formatNumber(v)}`).join(', ')}`}
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
            <p className="text-[11px] text-ink-3">
              Syncing from the app isn't available yet; connectors are run by the backend.
            </p>
          </section>

          <section className="space-y-3" aria-labelledby="data-on-record">
            <h3 id="data-on-record" className="text-sm font-semibold text-ink">Data on record, by source</h3>
            {overview.sources.length === 0 ? (
              <Card className="p-5 bg-surface border border-rule text-xs text-ink-3">No data has been loaded yet.</Card>
            ) : (
              <div className="border border-rule rounded-card bg-surface overflow-x-auto">
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
    </div>
  );
}
