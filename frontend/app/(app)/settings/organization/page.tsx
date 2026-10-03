import * as React from 'react';

export default function OrganizationSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-rule/50">
        <h2 className="text-base font-semibold text-ink">Organization Settings</h2>
        <p className="text-xs text-ink-3 mt-0.5">
          Company details, department mappings, and minimum team reporting size threshold (default: 5).
        </p>
      </div>

      <div className="rounded-card border border-rule bg-surface p-6 shadow-xs">
        <p className="text-sm text-ink-2">
          Organization settings and department normalization rules being mounted in Task 32.
        </p>
      </div>
    </div>
  );
}
