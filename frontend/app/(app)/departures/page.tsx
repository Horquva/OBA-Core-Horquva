import * as React from 'react';

export default function DeparturesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rule/50">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-ink font-normal">
            Departures & Handover
          </h1>
          <p className="text-sm text-ink-3 mt-1">
            Track upcoming departures, succession assignments, and post-departure verification.
          </p>
        </div>
      </div>

      <div className="rounded-card border border-rule bg-surface p-6 shadow-xs">
        <h2 className="text-sm font-semibold text-ink">Upcoming Departures</h2>
        <p className="text-sm text-ink-3 mt-1">
          Departure tracking and handover workbench view being mounted in Phase D (Tasks 21–23).
        </p>
      </div>
    </div>
  );
}
