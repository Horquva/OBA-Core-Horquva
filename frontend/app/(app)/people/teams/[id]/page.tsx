import * as React from 'react';

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-rule/50">
        <h1 className="font-serif text-3xl md:text-4xl text-ink font-normal">
          Team Drill-Down
        </h1>
        <p className="text-sm text-ink-3 mt-1 font-mono">
          Team ID: {id}
        </p>
      </div>

      <div className="rounded-card border border-rule bg-surface p-6 shadow-xs">
        <p className="text-sm text-ink-2">
          Alphabetical member roster and critical asset coverage being mounted in Task 24.
        </p>
      </div>
    </div>
  );
}
