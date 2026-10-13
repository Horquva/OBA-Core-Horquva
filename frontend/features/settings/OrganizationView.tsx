'use client';

import * as React from 'react';
import type { OrganizationSettings } from '@/types/view';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchOrganization, saveOrganization } from '@/lib/api/settings';
import { toApiError } from '@/lib/api/client';
import { SectionHeader, Notice } from './SectionHeader';

export interface OrganizationViewProps {
  initialSettings?: OrganizationSettings;
}

export function OrganizationView({ initialSettings }: OrganizationViewProps) {
  const orgResource = useResource<OrganizationSettings>('settings-organization', fetchOrganization);

  // No invented starting values: the form only shows once real settings are here.
  const orgData = orgResource.status === 'ready' ? orgResource.data : initialSettings ?? null;

  return (
    <div className="space-y-5">
      <SectionHeader title="Organization & Aggregation Rules" description="Your company's name and logo, and how small a team can be before it's reported on its own." />

      {orgResource.status === 'loading' && !initialSettings ? (
        <span className="skeleton block h-64 rounded-panel" />
      ) : !orgData ? (
        <Panel className="p-5">
          <ErrorState onRetry={orgResource.reload} message="We couldn't load organization settings." />
        </Panel>
      ) : (
        // Keyed by the loaded values: a reload after saving starts the form from the server's copy.
        <OrganizationForm key={JSON.stringify(orgData)} settings={orgData} onSaved={orgResource.reload} />
      )}
    </div>
  );
}

/** A settings row: what it is on the left, the control on the right. */
function Row({ label, htmlFor, help, children }: { label: string; htmlFor: string; help: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 px-6 py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-8">
      <div>
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
        </label>
        <p className="type-meta mt-0.5 text-ink-3">{help}</p>
      </div>
      <div className="md:pt-0.5">{children}</div>
    </div>
  );
}

const inputCls = 'type-meta h-10 w-full rounded-control border border-rule bg-surface px-3 text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none';

function OrganizationForm({ settings, onSaved }: { settings: OrganizationSettings; onSaved: () => void }) {
  const [companyName, setCompanyName] = React.useState(settings.companyName);
  const [logoUrl, setLogoUrl] = React.useState(settings.logoUrl || '');
  const [minGroupSize, setMinGroupSize] = React.useState(settings.minGroupSize);
  const mappings = settings.departmentMappings;

  const [isSaving, setIsSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);

  const dirty = companyName !== settings.companyName || logoUrl !== (settings.logoUrl || '') || minGroupSize !== settings.minGroupSize;

  const reset = () => {
    setCompanyName(settings.companyName);
    setLogoUrl(settings.logoUrl || '');
    setMinGroupSize(settings.minGroupSize);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setNotice(null);
    const payload: OrganizationSettings = {
      companyName: companyName.trim(),
      logoUrl: logoUrl.trim() || null,
      minGroupSize: Math.max(3, minGroupSize),
      departmentMappings: mappings,
    };
    try {
      await saveOrganization(payload);
      setNotice({ ok: true, text: 'Organization settings saved.' });
      onSaved();
    } catch (err) {
      setNotice({ ok: false, text: `Could not save organization settings: ${toApiError(err).message}` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {notice && <Notice ok={notice.ok}>{notice.text}</Notice>}

      <Panel className="divide-y divide-rule">
        <Row label="Company Name" htmlFor="company-name" help="Shown in reports and on the confirmation form people fill in.">
          <input id="company-name" type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} />
        </Row>
        <Row label="Logo" htmlFor="logo-url" help="Optional. A link to your logo, shown on the confirmation form.">
          <div className="flex items-center gap-3">
            <input id="logo-url" type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://company.com/logo.svg" className={inputCls} />
            {logoUrl.trim() && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-control border border-rule bg-surface object-contain p-1" />
            )}
          </div>
        </Row>
        <Row
          label="Smallest team reported on its own"
          htmlFor="min-group-size"
          help="Teams smaller than this roll up into their parent, so nobody can be singled out. At least 3; 5 is the default."
        >
          <div className="flex items-center gap-2">
            <input
              id="min-group-size"
              type="number"
              min={3}
              max={50}
              required
              value={minGroupSize}
              onChange={(e) => setMinGroupSize(Number(e.target.value))}
              className={`${inputCls} w-24 tabular-nums`}
            />
            <span className="type-meta text-ink-3">people</span>
          </div>
        </Row>
      </Panel>

      {/* Appears only when something has changed. */}
      {dirty && (
        <div className="sticky bottom-4 z-20 flex justify-center">
          <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-panel border border-rule bg-surface px-4 py-3 shadow-panel">
            <p className="type-meta text-ink-2">You have unsaved changes.</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={reset} disabled={isSaving}>
                Discard
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSaving || !companyName.trim()} aria-label="Save Organization Settings">
                {isSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
