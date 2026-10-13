'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, CircleSlash, KeyRound, Moon, ShieldCheck, UserRound } from 'lucide-react';
import type { N8nCheckReport } from '@/types/view';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { runN8nCheck } from '@/lib/api/settings';
import { toApiError } from '@/lib/api/client';
import { formatDate, formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Notice } from './SectionHeader';

export interface N8nCheckViewProps {
  initialReport?: N8nCheckReport;
}

type Finding = { id: string; name: string; detail?: string | null };

/** A check that didn't run is unknown, never a pass (DATA-03). */
function NotChecked() {
  return (
    <p className="type-meta inline-flex items-center rounded-full border border-dashed border-ev-unknown px-2.5 py-1 text-ev-unknown">
      Not checked: this scan did not produce this result.
    </p>
  );
}

function FindingPanel({
  title,
  description,
  icon,
  items,
  fallbackDetail,
  clean,
  tone,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: Finding[] | null | undefined;
  fallbackDetail: string;
  clean: string;
  tone: 'fail' | 'warn' | 'quiet';
}) {
  const id = `finding-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <Panel aria-labelledby={id} className="flex flex-col">
      <PanelHeader titleId={id} title={title} icon={icon} count={items ? items.length : undefined} description={description} />
      <div className="flex-1">
        {items === null || items === undefined ? (
          <div className="px-5 py-4">
            <NotChecked />
          </div>
        ) : items.length === 0 ? (
          <p className="type-meta px-5 py-4 text-ink-3">{clean}</p>
        ) : (
          <ul className="divide-y divide-rule">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <span className="type-meta min-w-0 truncate font-medium text-ink">{item.name}</span>
                <span className={cn('type-meta shrink-0', tone === 'fail' ? 'text-st-fail' : tone === 'warn' ? 'text-amber-ink' : 'text-ink-3')}>
                  {item.detail || fallbackDetail}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

const inputCls = 'type-meta h-10 w-full rounded-control border border-rule bg-surface px-3 text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none';

export function N8nCheckView({ initialReport }: N8nCheckViewProps) {
  const [n8nUrl, setN8nUrl] = React.useState('');
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
      setReport(await runN8nCheck(n8nUrl.trim(), n8nApiKey.trim()));
    } catch (err) {
      setError(`Could not scan the n8n instance: ${toApiError(err).message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // "35 workflows, 6 users and 12 credentials scanned. 4 need attention."
  const summary = report
    ? (() => {
        const s = report.summary;
        const flagged = new Set([...(report.singleOwner ?? []), ...(report.personalCredential ?? []), ...(report.failing ?? [])].map((f) => f.id)).size;
        const scanned = `${formatNumber(s.totalWorkflows)} ${s.totalWorkflows === 1 ? 'workflow' : 'workflows'}, ${formatNumber(s.totalUsers)} ${s.totalUsers === 1 ? 'user' : 'users'} and ${formatNumber(s.totalCredentials)} ${s.totalCredentials === 1 ? 'credential' : 'credentials'} scanned`;
        const ai = s.aiIntegrationsCount > 0 ? `, ${formatNumber(s.aiIntegrationsCount)} using AI models` : '';
        const need = flagged === 0 ? 'Nothing flagged in the checks that ran.' : `${flagged} ${flagged === 1 ? 'workflow needs' : 'workflows need'} attention.`;
        return `${scanned}${ai}. ${need}`;
      })()
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <div className="space-y-4">
        <Link href="/settings/connections" className="type-meta inline-flex items-center gap-1.5 font-medium text-ink-3 transition-colors hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Connections
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="type-title text-ink">n8n Ownership & Exposure Check</h2>
            <p className="mt-1 text-sm text-ink-2">A one-off scan of your n8n: who owns each workflow, what runs on personal credentials, and what&apos;s failing.</p>
          </div>
          {report && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setReport(null);
                setN8nApiKey('');
              }}
            >
              New scan
            </Button>
          )}
        </div>
      </div>

      {!report ? (
        <Panel aria-labelledby="n8n-form-heading">
          <div className="px-6 pb-2 pt-5">
            <h3 id="n8n-form-heading" className="type-heading text-ink">
              Connect to n8n
            </h3>
            <p className="type-meta mt-0.5 text-ink-3">Your n8n address and an API key that can read workflows.</p>
          </div>
          <form onSubmit={handleScanSubmit}>
            <div className="grid gap-4 px-6 py-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="n8n-url" className="type-meta block font-medium text-ink">
                  n8n Instance URL
                </label>
                <input id="n8n-url" type="url" required value={n8nUrl} onChange={(e) => setN8nUrl(e.target.value)} placeholder="https://n8n.yourcompany.com" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="n8n-key" className="type-meta block font-medium text-ink">
                  n8n API Key
                </label>
                <input id="n8n-key" type="password" required value={n8nApiKey} onChange={(e) => setN8nApiKey(e.target.value)} placeholder="n8n_api_…" className={inputCls} />
              </div>
              <p className="type-meta flex items-start gap-2 text-ink-3 sm:col-span-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                The key is used in memory for this scan only. It&apos;s never saved to the database or written to logs.
              </p>
              {error && (
                <div className="sm:col-span-2">
                  <Notice ok={false}>{error}</Notice>
                </div>
              )}
            </div>
            <div className="flex justify-end border-t border-rule bg-surface-sunken/40 px-6 py-3.5">
              <Button type="submit" variant="primary" size="sm" disabled={isScanning || !n8nUrl.trim() || !n8nApiKey.trim()}>
                {isScanning ? 'Scanning…' : 'Run Continuity Scan'}
              </Button>
            </div>
          </form>
        </Panel>
      ) : (
        <div className="space-y-6">
          <Panel className="px-6 py-5">
            <p className="type-meta text-ink-3">Scanned {formatDate(report.scannedAt)}</p>
            <p className="mt-1 text-lg font-semibold leading-snug tracking-tight text-ink">{summary}</p>
          </Panel>

          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
            <FindingPanel
              title="Single Owner Workflows"
              description="Only one person can edit these, and nobody backs them up."
              icon={<UserRound />}
              items={report.singleOwner}
              fallbackDetail="Single owner"
              clean="No workflow depends on a single owner."
              tone="fail"
            />
            <FindingPanel
              title="Personal Credential Workflows"
              description="They run on someone's own login, not a service account."
              icon={<KeyRound />}
              items={report.personalCredential}
              fallbackDetail="Personal login"
              clean="No workflow runs on a personal credential."
              tone="warn"
            />
            <FindingPanel
              title="Failing Executions"
              description="Workflows whose recent runs are failing."
              icon={<CircleSlash />}
              items={report.failing}
              fallbackDetail="Failing"
              clean="No failing executions detected."
              tone="fail"
            />
            <FindingPanel
              title="Abandoned / Dormant Workflows"
              description="No runs or edits in over 90 days."
              icon={<Moon />}
              items={report.abandoned}
              fallbackDetail="Dormant"
              clean="No abandoned workflows identified."
              tone="quiet"
            />
          </div>
        </div>
      )}
    </div>
  );
}
