import * as React from 'react';

export default function PeoplePage() {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-rule/50">
        <h1 className="font-serif text-3xl md:text-4xl text-ink font-normal">
          People & Teams
        </h1>
        <p className="text-sm text-ink-3 mt-1">
          Concentration shares, team roll-ups, and unbacked critical dependencies.
        </p>
      </div>

      <div className="rounded-card border border-rule bg-surface p-6 shadow-xs">
        <h2 className="text-sm font-semibold text-ink">Team Holdings & Concentration</h2>
        <p className="text-sm text-ink-3 mt-1">
          People grid and named share bars being mounted in Task 24.
        </p>
      </div>
    </div>
  );
}
