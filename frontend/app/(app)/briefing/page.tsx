import * as React from 'react';

export default function BriefingPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-rule/50">
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-ink">
          Executive Continuity Briefing
        </span>
        <h1 className="font-serif text-3xl md:text-4xl text-ink font-normal mt-1">
          Weekly Continuity Reading View
        </h1>
        <p className="text-sm text-ink-3 mt-1">
          Generated from counted deterministic facts and verified SCD2 history.
        </p>
      </div>

      <div className="rounded-card border border-rule bg-surface p-8 shadow-xs">
        <p className="font-serif text-lg text-ink-2 leading-relaxed italic">
          Weekly briefing is loading or awaiting compilation.
        </p>
      </div>
    </div>
  );
}
