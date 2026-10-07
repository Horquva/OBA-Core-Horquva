'use client';

import * as React from 'react';
import type { OrganizationSettings } from '@/types/view';
import { Card } from '@/components/ui/Card';
import { Skeleton, ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchOrganization, saveOrganization } from '@/lib/api/settings';
import { toApiError } from '@/lib/api/client';

export interface OrganizationViewProps {
  initialSettings?: OrganizationSettings;
}

export function OrganizationView({ initialSettings }: OrganizationViewProps) {
  const orgResource = useResource<OrganizationSettings>(
    'settings-organization',
    fetchOrganization,
  );

  // No invented starting values: the form only shows once real settings are here.
  const orgData = orgResource.status === 'ready' ? orgResource.data : initialSettings ?? null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border-b border-rule/50 pb-4">
        <h2 className="text-base font-semibold text-ink">Organization & Aggregation Rules</h2>
        <p className="text-xs text-ink-3 mt-0.5">
          Configure branding, logo display, and statistical aggregation floor rules.
        </p>
      </div>

      {orgResource.status === 'loading' && !initialSettings ? (
        <div className="space-y-4">
          <Skeleton variant="card" className="h-40" />
        </div>
      ) : !orgData ? (
        <ErrorState onRetry={orgResource.reload} message="Could not load organization settings." />
      ) : (
        // Keyed by the loaded values: a reload after saving starts the form from the server's copy.
        <OrganizationForm key={JSON.stringify(orgData)} settings={orgData} onSaved={orgResource.reload} />
      )}
    </div>
  );
}

function OrganizationForm({ settings, onSaved }: { settings: OrganizationSettings; onSaved: () => void }) {
  const [companyName, setCompanyName] = React.useState(settings.companyName);
  const [logoUrl, setLogoUrl] = React.useState(settings.logoUrl || '');
  const [minGroupSize, setMinGroupSize] = React.useState(settings.minGroupSize);
  const mappings = settings.departmentMappings;

  const [isSaving, setIsSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

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
      setNotice('Organization settings updated successfully.');
      onSaved();
    } catch (err) {
      setNotice(`Could not save organization settings: ${toApiError(err).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div className="rounded-control bg-amber/10 border border-amber/30 p-3 text-xs text-amber-ink font-mono">
          {notice}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6 bg-surface shadow-card border border-rule space-y-4 text-xs">
            <h3 className="text-lg font-semibold text-ink">
              Company Branding
            </h3>

            <div className="space-y-1">
              <label htmlFor="company-name" className="font-semibold text-ink block">
                Company Name
              </label>
              <input
                id="company-name"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-control border border-rule bg-surface p-2.5 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="logo-url" className="font-semibold text-ink block">
                Logo URL (Optional, displayed on Attestation form)
              </label>
              <input
                id="logo-url"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://company.com/logo.svg"
                className="w-full rounded-control border border-rule bg-surface p-2.5 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber font-mono"
              />
            </div>
          </Card>

          <Card className="p-6 bg-surface shadow-card border border-rule space-y-4 text-xs">
            <h3 className="text-lg font-semibold text-ink">
              Privacy & Aggregation Floor
            </h3>

            <div className="space-y-1">
              <label htmlFor="min-group-size" className="font-semibold text-ink block">
                Minimum Team Reporting Size (Default: 5, Floor: 3)
              </label>
              <input
                id="min-group-size"
                type="number"
                min={3}
                max={50}
                required
                value={minGroupSize}
                onChange={(e) => setMinGroupSize(Number(e.target.value))}
                className="w-32 rounded-control border border-rule bg-surface p-2 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber font-mono"
              />
              <p className="text-[11px] text-ink-3 pt-1">
                Invariant D-23: Teams smaller than this threshold roll up into the parent department to
                prevent re-identification of individual employees.
              </p>
            </div>
          </Card>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving || !companyName.trim()}
              className="rounded-control bg-amber text-paper px-5 py-2 text-xs font-semibold hover:bg-amber-hover transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSaving ? 'Saving...' : 'Save Organization Settings'}
            </button>
          </div>
      </form>
    </div>
  );
}
