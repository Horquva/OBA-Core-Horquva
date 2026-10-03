import * as React from 'react';
import Link from 'next/link';

export default function ConnectionsSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Connectors & Data Sources</h2>
          <p className="text-xs text-ink-3 mt-0.5">
            Configure n8n, Entra ID, Google Workspace, and AI API integrations.
          </p>
        </div>

        <Link
          href="/settings/connections/n8n-check"
          className="rounded-control bg-amber px-3 py-1.5 text-xs font-semibold text-ink hover:opacity-90 transition-opacity"
        >
          Run n8n Ownership Scan
        </Link>
      </div>

      <div className="rounded-card border border-rule bg-surface p-6 shadow-xs">
        <p className="text-sm text-ink-2">
          Connector status cards (n8n, Entra, Google, OpenAI, Anthropic, CSV) being mounted in Task 32.
        </p>
      </div>
    </div>
  );
}
