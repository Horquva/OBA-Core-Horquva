import * as React from 'react';

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-rule/50">
        <h1 className="font-serif text-3xl md:text-4xl text-ink font-normal">
          Person Holdings Detail
        </h1>
        <p className="text-sm text-ink-3 mt-1 font-mono">
          Person ID: {id}
        </p>
      </div>

      <div className="rounded-card border border-rule bg-surface p-6 shadow-xs">
        <p className="text-sm text-ink-2">
          Holdings, backup commitments, and personal credential automations being mounted in Task 24.
        </p>
      </div>
    </div>
  );
}
