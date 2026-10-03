import * as React from 'react';

export default function AskPage() {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-rule/50">
        <h1 className="font-serif text-3xl md:text-4xl text-ink font-normal">
          Ask OBA
        </h1>
        <p className="text-sm text-ink-3 mt-1">
          Continuity intelligence assistant grounded in verified SCD2 facts and entity graphs.
        </p>
      </div>

      <div className="rounded-card border border-rule bg-surface p-6 shadow-xs">
        <p className="text-sm text-ink-2">
          Ask OBA chat interface, history rail, entity chips, and sources being mounted in Task 30.
        </p>
      </div>
    </div>
  );
}
