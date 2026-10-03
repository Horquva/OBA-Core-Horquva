import * as React from 'react';

export default function WhatIfPage() {
  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="pb-4 border-b border-rule/50">
        <h1 className="font-serif text-3xl md:text-4xl text-ink font-normal">
          What-If Continuity Simulator
        </h1>
        <p className="text-sm text-ink-3 mt-1">
          Simulate leavers, service outages, and combined disaster scenarios.
        </p>
      </div>

      <div className="rounded-card border border-rule bg-surface p-6 shadow-xs">
        <p className="text-sm text-ink-2">
          SentenceBuilder, simulation execution, and S6 Worst Losses being mounted in Task 27.
        </p>
      </div>
    </div>
  );
}
