'use client';

import * as React from 'react';
import Link from 'next/link';
import type { N8nCheckReport } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton, ErrorState } from '@/components/ui/states';
import { runN8nCheck } from '@/lib/api/settings';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface N8nCheckViewProps {
  initialReport?: N8nCheckReport;
}

export function N8nCheckView({ initialReport }: N8nCheckViewProps) {
  const [n8nUrl, setN8nUrl] = React.useState('https://n8n.internal:5678');
  const [n8nApiKey, setN8nApiKey] = React.useState('');
  const [report, setReport] = React.useState<N8nCheckReport | null>(initialReport || null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!n8nUrl.trim() || !n8nApiKey.trim()) return;

    setIsScanning(true);
    setError(null);

    try {
      const res = await runN8nCheck(n8nUrl.trim(), n8nApiKey.trim());
      setReport(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to scan n8n instance. Check your URL and API key.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Breadcrumb / Back Link */}
      <div className="space-y-2">
        <Link
          href="/settings/connections"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-ink transition-colors"
        >
          <span aria-hidden="true">←</span>
          <span>Back to Connectors</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/50 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
                Stateless Diagnostic
              </span>
            </div>
            <h2 className="font-serif text-3xl text-ink font-normal tracking-tight">
              n8n Ownership & Exposure Check
            </h2>
            <p className="text-xs text-ink-3 mt-1">
              In-memory evaluation of workflow owners, personal credential bindings, and failure rates.
            </p>
          </div>

          {report && (
            <button
              type="button"
              onClick={() => {
                setReport(null);
                setN8nApiKey('');
              }}
              className="rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken transition-colors cursor-pointer self-start sm:self-auto"
            >
              New Scan
            </button>
          )}
        </div>
      </div>

      {!report ? (
        /* Scan Form */
        <Card className="p-6 bg-surface shadow-card border border-rule space-y-6">
          <div className="space-y-1">
            <h3 className="font-serif text-xl font-normal text-ink">
              Connect to n8n Instance
            </h3>
            <p className="text-xs text-ink-3">
              Enter your n8n base URL and a valid API key with read permissions.
            </p>
          </div>

          <form onSubmit={handleScanSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label htmlFor="n8n-url" className="font-semibold text-ink block">
                n8n Instance URL
              </label>
              <input
                id="n8n-url"
                type="url"
                required
                value={n8nUrl}
                onChange={(e) => setN8nUrl(e.target.value)}
                placeholder="https://n8n.yourcompany.com"
                className="w-full rounded-control border border-rule bg-surface p-2.5 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber font-mono"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="n8n-key" className="font-semibold text-ink block">
                n8n API Key
              </label>
              <input
                id="n8n-key"
                type="password"
                required
                value={n8nApiKey}
                onChange={(e) => setN8nApiKey(e.target.value)}
                placeholder="n8n_api_..."
                className="w-full rounded-control border border-rule bg-surface p-2.5 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber font-mono"
              />
            </div>

            <div className="rounded-control bg-surface-sunken p-3 text-[11px] text-ink-3 border border-rule/60 space-y-1">
              <strong className="text-ink block">Stateless Security Guarantee:</strong>
              <p>
                API keys and payload definitions are parsed in ephemeral memory only. Credentials are
                never written to persistent storage, database, or server logs.
              </p>
            </div>

            {error && (
              <div className="rounded-control bg-st-fail/10 border border-st-fail/20 p-3 text-xs text-st-fail font-mono">
                {error}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-rule/50">
              <button
                type="submit"
                disabled={isScanning || !n8nUrl.trim() || !n8nApiKey.trim()}
                className="rounded-control bg-amber text-paper px-6 py-2.5 text-xs font-semibold hover:bg-amber-hover transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isScanning ? 'Running In-Memory Audit...' : 'Run Continuity Scan'}
              </button>
            </div>
          </form>
        </Card>
      ) : (
        /* Report Results */
        <div className="space-y-6">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <Card className="p-4 bg-surface border border-rule text-center space-y-1">
              <span className="text-2xl font-bold text-ink block">
                {report.summary.totalWorkflows}
              </span>
              <span className="text-ink-3">Total Workflows</span>
            </Card>
            <Card className="p-4 bg-surface border border-rule text-center space-y-1">
              <span className="text-2xl font-bold text-ink block">
                {report.summary.totalUsers}
              </span>
              <span className="text-ink-3">n8n Users</span>
            </Card>
            <Card className="p-4 bg-surface border border-rule text-center space-y-1">
              <span className="text-2xl font-bold text-ink block">
                {report.summary.totalCredentials}
              </span>
              <span className="text-ink-3">Total Credentials</span>
            </Card>
            <Card className="p-4 bg-surface border border-rule text-center space-y-1">
              <span className="text-2xl font-bold text-ink block">
                {report.summary.aiIntegrationsCount}
              </span>
              <span className="text-ink-3">AI Model Nodes</span>
            </Card>
          </div>

          <div className="text-xs text-ink-3 font-mono">
            Scanned on {formatDate(report.scannedAt)}
          </div>

          {/* 4 Categorized Finding Panels */}
          <div className="space-y-4">
            {/* 1. Single Owner Workflows */}
            <Card className="p-5 bg-surface border border-rule shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-rule/50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-st-fail" aria-hidden="true" />
                  <h3 className="font-serif text-lg font-normal text-ink">
                    Single Owner Workflows
                  </h3>
                </div>
                <span className="text-xs font-mono text-ink-3">
                  {report.singleOwner ? `${report.singleOwner.length} items` : 'Not produced yet'}
                </span>
              </div>
              <p className="text-xs text-ink-3">
                Automations configured with exactly one editor and no active backup.
              </p>

              {report.singleOwner && report.singleOwner.length > 0 ? (
                <div className="divide-y divide-rule border border-rule rounded-card text-xs">
                  {report.singleOwner.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between">
                      <span className="font-semibold text-ink">{item.name}</span>
                      <span className="text-ink-3 font-mono">{item.detail || 'Single owner'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-st-pass">
                  ✓ No single-owner workflow bottlenecks identified.
                </p>
              )}
            </Card>

            {/* 2. Personal Credential Workflows */}
            <Card className="p-5 bg-surface border border-rule shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-rule/50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
                  <h3 className="font-serif text-lg font-normal text-ink">
                    Personal Credential Workflows
                  </h3>
                </div>
                <span className="text-xs font-mono text-ink-3">
                  {report.personalCredential ? `${report.personalCredential.length} items` : 'Not produced yet'}
                </span>
              </div>
              <p className="text-xs text-ink-3">
                Workflows executing via individual personal OAuth/API credentials rather than service accounts.
              </p>

              {report.personalCredential && report.personalCredential.length > 0 ? (
                <div className="divide-y divide-rule border border-rule rounded-card text-xs">
                  {report.personalCredential.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between">
                      <span className="font-semibold text-ink">{item.name}</span>
                      <span className="text-amber-ink font-mono">{item.detail || 'Personal OAuth'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-st-pass">
                  ✓ Zero workflows using personal credentials.
                </p>
              )}
            </Card>

            {/* 3. Failing Workflows */}
            <Card className="p-5 bg-surface border border-rule shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-rule/50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-st-fail" aria-hidden="true" />
                  <h3 className="font-serif text-lg font-normal text-ink">
                    Failing Executions
                  </h3>
                </div>
                <span className="text-xs font-mono text-ink-3">
                  {report.failing ? `${report.failing.length} items` : 'Not produced yet'}
                </span>
              </div>
              <p className="text-xs text-ink-3">
                Pipelines with consecutive failed executions during the scan window.
              </p>

              {report.failing && report.failing.length > 0 ? (
                <div className="divide-y divide-rule border border-rule rounded-card text-xs">
                  {report.failing.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between">
                      <span className="font-semibold text-ink">{item.name}</span>
                      <span className="text-st-fail font-mono">{item.detail || 'Error execution'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-st-pass">
                  ✓ No failing executions detected.
                </p>
              )}
            </Card>

            {/* 4. Abandoned Workflows */}
            <Card className="p-5 bg-surface border border-rule shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-rule/50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-surface-sunken" aria-hidden="true" />
                  <h3 className="font-serif text-lg font-normal text-ink">
                    Abandoned / Dormant Workflows
                  </h3>
                </div>
                <span className="text-xs font-mono text-ink-3">
                  {report.abandoned ? `${report.abandoned.length} items` : 'Not produced yet'}
                </span>
              </div>
              <p className="text-xs text-ink-3">
                Workflows with no executions or edits in over 90 days.
              </p>

              {report.abandoned && report.abandoned.length > 0 ? (
                <div className="divide-y divide-rule border border-rule rounded-card text-xs">
                  {report.abandoned.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between">
                      <span className="font-semibold text-ink">{item.name}</span>
                      <span className="text-ink-3 font-mono">{item.detail || 'Dormant'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-ink-3">
                  ✓ No abandoned workflows identified.
                </p>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
