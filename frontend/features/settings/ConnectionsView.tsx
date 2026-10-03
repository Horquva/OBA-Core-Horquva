'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ConnectionView, ConnectionType } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchConnections, syncConnection } from '@/lib/api/settings';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface ConnectionsViewProps {
  initialConnections?: ConnectionView[];
}

const TYPE_LABELS: Record<ConnectionType, { label: string; icon: string }> = {
  n8n: { label: 'n8n Workflow Automation', icon: '⚡' },
  entra: { label: 'Microsoft Entra ID (Azure AD)', icon: '🏢' },
  google: { label: 'Google Workspace', icon: '🌐' },
  openai: { label: 'OpenAI Platform', icon: '🤖' },
  anthropic: { label: 'Anthropic Claude API', icon: '🧠' },
  csv: { label: 'CSV / Manual Import', icon: '📄' },
};

export function ConnectionsView({ initialConnections }: ConnectionsViewProps) {
  const connectionsResource = useResource<ConnectionView[]>(
    'settings-connections',
    fetchConnections,
  );

  const connections =
    connectionsResource.status === 'ready'
      ? connectionsResource.data
      : initialConnections || [];

  const [syncingId, setSyncingId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const handleSync = async (id: string) => {
    setSyncingId(id);
    setNotice(null);
    try {
      await syncConnection(id);
      setNotice(`Sync triggered for connection.`);
      connectionsResource.reload();
    } catch {
      setNotice(`Sync failed to initiate. Please retry.`);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with n8n Scan CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/50 pb-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Connectors & Data Sources</h2>
          <p className="text-xs text-ink-3 mt-0.5">
            Configure n8n, Entra ID, Google Workspace, and AI API integrations.
          </p>
        </div>

        <Link
          href="/settings/connections/n8n-check"
          className="rounded-control bg-amber text-paper px-3.5 py-2 text-xs font-semibold hover:bg-amber-hover transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
        >
          <span>Run n8n Ownership Scan →</span>
        </Link>
      </div>

      {notice && (
        <div className="rounded-control bg-amber/10 border border-amber/30 p-3 text-xs text-amber-ink font-mono">
          {notice}
        </div>
      )}

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

      {/* Connectors List */}
      {connectionsResource.status === 'loading' && !initialConnections ? (
        <div className="space-y-4">
          <Skeleton variant="card" className="h-28" />
          <Skeleton variant="card" className="h-28" />
        </div>
      ) : connectionsResource.status === 'error' && !initialConnections ? (
        <ErrorState
          onRetry={connectionsResource.reload}
          message="Could not load system connectors."
        />
      ) : connections.length === 0 ? (
        <EmptyState
          title="No connectors configured"
          description="Connect your identity providers and workflow engines to begin automated continuity mapping."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {connections.map((c) => {
            const meta = TYPE_LABELS[c.type] || { label: c.name, icon: '🔌' };
            const isSyncing = syncingId === c.id || c.status === 'syncing';

            return (
              <Card
                key={c.id}
                className="p-5 bg-surface border border-rule shadow-card space-y-4 hover:border-ink-3/40 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl" aria-hidden="true">
                      {meta.icon}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-lg font-normal text-ink">
                          {c.name}
                        </h3>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-badge text-[10px] font-mono uppercase font-semibold',
                            c.status === 'healthy' && 'bg-st-pass/15 text-st-pass',
                            c.status === 'failed' && 'bg-st-fail/15 text-st-fail',
                            c.status === 'syncing' && 'bg-amber/15 text-amber-ink',
                            c.status === 'never' && 'bg-surface-sunken text-ink-3',
                          )}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-ink-3 font-mono">
                        Type: {meta.label} · Last Sync:{' '}
                        {c.lastSyncAt ? formatDate(c.lastSyncAt) : 'Never'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => handleSync(c.id)}
                      className="rounded-control bg-amber text-paper px-3 py-1.5 text-xs font-semibold hover:bg-amber-hover transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button
                      type="button"
                      className="rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                    >
                      Configure
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono pt-2 border-t border-rule/50">
                  <div>
                    <span className="text-ink-3">Items Synced: </span>
                    <span className="font-semibold text-ink">
                      {c.itemsSynced !== null ? `${c.itemsSynced} records` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-3">Security Credential: </span>
                    <span className="font-semibold text-ink">
                      {c.secretHint || 'Not configured'}
                    </span>
                  </div>
                </div>

                {c.lastError && (
                  <div className="rounded-control bg-st-fail/10 border border-st-fail/20 p-3 text-xs font-mono text-st-fail">
                    Error: {c.lastError}
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
