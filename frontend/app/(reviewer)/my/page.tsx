import * as React from 'react';

export default function ReviewerMyPage() {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-rule/50">
        <h1 className="font-serif text-3xl text-ink font-normal">
          My Review Tasks
        </h1>
        <p className="text-sm text-ink-3 mt-1">
          Ownership confirmations and successor asset handover requests assigned to you.
        </p>
      </div>

      <div className="rounded-card border border-rule bg-surface p-6 shadow-xs">
        <p className="text-sm text-ink-2">
          Reviewer task queue and handover acceptance controls being mounted in Task 31.
        </p>
      </div>
    </div>
  );
}
