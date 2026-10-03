import * as React from 'react';

export default function N8nCheckPage() {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-rule/50">
        <h2 className="text-base font-semibold text-ink">Stateless n8n Ownership Scan</h2>
        <p className="text-xs text-ink-3 mt-0.5">
          Scan workflows in-memory without persistence to audit single-owner risks and credential exposures.
        </p>
      </div>

      <div className="rounded-card border border-rule bg-surface p-6 shadow-xs">
        <p className="text-sm text-ink-2">
          Stateless n8n scan wizard and counted exposure report being mounted in Task 33.
        </p>
      </div>
    </div>
  );
}
