import * as React from 'react';

export default function NewConfirmationPage() {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-rule/50">
        <h1 className="font-serif text-3xl md:text-4xl text-ink font-normal">
          New Confirmation Campaign
        </h1>
        <p className="text-sm text-ink-3 mt-1">
          4-step wizard: Scope → Review → Message Preview → Schedule.
        </p>
      </div>

      <div className="rounded-card border border-rule bg-surface p-6 shadow-xs">
        <p className="text-sm text-ink-2">
          FullPageWizard campaign creator being mounted in Task 29.
        </p>
      </div>
    </div>
  );
}
