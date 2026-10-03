import * as React from 'react';

export default function ActionsPage() {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-rule/50">
        <h1 className="font-serif text-3xl md:text-4xl text-ink font-normal">
          Actions & Confirmations
        </h1>
        <p className="text-sm text-ink-3 mt-1">
          Remediate failing checks, manage accepted risks, and track attestation campaigns.
        </p>
      </div>

      <div className="rounded-card border border-rule bg-surface p-6 shadow-xs">
        <p className="text-sm text-ink-2">
          Actions list and Confirmations tab being mounted in Tasks 28–29.
        </p>
      </div>
    </div>
  );
}
