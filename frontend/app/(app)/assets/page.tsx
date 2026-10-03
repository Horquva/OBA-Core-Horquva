import * as React from 'react';

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-rule/50">
        <h1 className="font-serif text-3xl md:text-4xl text-ink font-normal">
          Assets Catalog
        </h1>
        <p className="text-sm text-ink-3 mt-1">
          Automations, AI models, credentials, vendors, and documented systems.
        </p>
      </div>

      <div className="rounded-card border border-rule bg-surface p-6 shadow-xs">
        <h2 className="text-sm font-semibold text-ink">Catalog Table</h2>
        <p className="text-sm text-ink-3 mt-1">
          Sortable 48px rows, evidence dots, and 560px detail drawer being mounted in Task 25.
        </p>
      </div>
    </div>
  );
}
