import * as React from 'react';

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-64px)] w-full flex flex-col">
      <div className="p-4 border-b border-rule/50 bg-surface/50 backdrop-blur-xs flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-ink font-normal">
            Dependency Map
          </h1>
          <p className="text-xs text-ink-3">
            Multi-hop continuous graph with blast radius highlighting.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-surface-sunken/40">
        <div className="rounded-card border border-rule bg-surface p-8 text-center max-w-md shadow-xs">
          <p className="font-serif text-lg text-ink">@xyflow/react + dagre Map Engine</p>
          <p className="text-xs text-ink-3 mt-2">
            Graph visualization and blast radius analysis being mounted in Task 26.
          </p>
        </div>
      </div>
    </div>
  );
}
