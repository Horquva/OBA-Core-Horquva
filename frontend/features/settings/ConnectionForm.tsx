'use client';

import * as React from 'react';
import type { ConnectionTestResult, ConnectionType, SyncableConnectionType } from '@/types/view';
import { Button } from '@/components/ui/Button';
import { testConnectionConfig } from '@/lib/api/settings';
import { toApiError } from '@/lib/api/client';
import { cn } from '@/lib/cn';

export const TYPE_LABELS: Record<ConnectionType, string> = {
  n8n: 'n8n Workflow Automation',
  entra: 'Microsoft Entra ID',
  google: 'Google Workspace',
  ai_admin: 'AI vendor admin (OpenAI / Anthropic)',
  openai: 'OpenAI Platform',
  anthropic: 'Anthropic Claude API',
  csv: 'CSV / Manual Import',
};

interface Field {
  key: string;
  label: string;
  kind: 'text' | 'secret' | 'textarea' | 'select';
  placeholder?: string;
  help?: string;
  options?: Array<{ value: string; label: string }>;
  optional?: boolean;
}

/** Mirrors the backend's per-type config schemas (connectors/sdk/runner.ts). */
export const CONNECTION_FIELDS: Record<SyncableConnectionType, Field[]> = {
  n8n: [
    { key: 'baseUrl', label: 'n8n URL', kind: 'text', placeholder: 'https://n8n.your-org.edu' },
    { key: 'apiKey', label: 'API key', kind: 'secret', help: 'n8n → Settings → n8n API. A read-only key is enough.' },
  ],
  entra: [
    { key: 'tenantId', label: 'Tenant ID', kind: 'text', placeholder: '00000000-0000-0000-0000-000000000000' },
    { key: 'clientId', label: 'Application (client) ID', kind: 'text' },
    { key: 'clientSecret', label: 'Client secret', kind: 'secret', help: 'App registration with User.Read.All and Application.Read.All (application permissions, read-only).' },
  ],
  google: [
    { key: 'adminEmail', label: 'Admin email to act as', kind: 'text', placeholder: 'it-admin@your-org.edu' },
    { key: 'serviceAccountKeyJson', label: 'Service account key (JSON)', kind: 'textarea', help: 'With domain-wide delegation for admin.directory.user.readonly.' },
  ],
  ai_admin: [
    { key: 'vendor', label: 'Vendor', kind: 'select', options: [{ value: 'openai', label: 'OpenAI' }, { value: 'anthropic', label: 'Anthropic' }] },
    { key: 'adminApiKey', label: 'Admin API key', kind: 'secret' },
    { key: 'organizationId', label: 'Organization ID', kind: 'text', optional: true },
  ],
};

export function isConfigComplete(type: SyncableConnectionType, config: Record<string, string>): boolean {
  return CONNECTION_FIELDS[type].every((f) => f.optional || (config[f.key] ?? '').trim() !== '');
}

/** Drops optional fields left blank so the server's schema sees them as absent. */
export function cleanConfig(type: SyncableConnectionType, config: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    CONNECTION_FIELDS[type].map((f) => [f.key, (config[f.key] ?? '').trim()]).filter(([, v]) => v !== ''),
  );
}

const inputClass =
  'w-full rounded-control border border-rule bg-surface p-2.5 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber';

export interface ConnectionFieldsProps {
  type: SyncableConnectionType;
  config: Record<string, string>;
  onChange: (config: Record<string, string>) => void;
  idPrefix: string;
}

export function ConnectionFields({ type, config, onChange, idPrefix }: ConnectionFieldsProps) {
  const set = (key: string, value: string) => onChange({ ...config, [key]: value });
  return (
    <div className="space-y-4 text-xs">
      {CONNECTION_FIELDS[type].map((f) => {
        const id = `${idPrefix}-${f.key}`;
        const helpId = f.help ? `${id}-help` : undefined;
        return (
          <div key={f.key} className="space-y-1.5">
            <label htmlFor={id} className="font-semibold text-ink block">
              {f.label}
              {f.optional && <span className="font-normal text-ink-3"> (optional)</span>}
            </label>
            {f.kind === 'textarea' ? (
              <textarea id={id} rows={6} aria-describedby={helpId} className={cn(inputClass, 'font-mono')} value={config[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} spellCheck={false} />
            ) : f.kind === 'select' ? (
              <select id={id} aria-describedby={helpId} className={inputClass} value={config[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">Choose…</option>
                {f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input
                id={id}
                type={f.kind === 'secret' ? 'password' : 'text'}
                autoComplete="off"
                aria-describedby={helpId}
                placeholder={f.placeholder}
                className={inputClass}
                value={config[f.key] ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
            {f.help && <p id={helpId} className="text-[11px] text-ink-3">{f.help}</p>}
          </div>
        );
      })}
    </div>
  );
}

/** "Test connection" for credentials that aren't saved yet. */
export function TestConnectionButton({ type, config }: { type: SyncableConnectionType; config: Record<string, string> }) {
  // The result belongs to the exact settings tested; editing any field hides it.
  const key = JSON.stringify([type, config]);
  const [run_, setRun] = React.useState<{ key: string; state: 'testing' | ConnectionTestResult } | null>(null);
  const state = run_ && run_.key === key ? run_.state : 'idle';

  const run = async () => {
    setRun({ key, state: 'testing' });
    try {
      setRun({ key, state: await testConnectionConfig(type, cleanConfig(type, config)) });
    } catch (e) {
      setRun({ key, state: { ok: false, error: toApiError(e).message } });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" size="sm" onClick={run} disabled={!isConfigComplete(type, config) || state === 'testing'} isLoading={state === 'testing'}>
        Test connection
      </Button>
      <span role="status" className="text-xs">
        {typeof state === 'object' &&
          (state.ok ? (
            <span className="text-st-pass font-medium">Connected. These credentials work.</span>
          ) : (
            <span className="text-st-fail">{`Couldn't connect: ${state.error}`}</span>
          ))}
      </span>
    </div>
  );
}
