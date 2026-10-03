import * as React from 'react';
import Link from 'next/link';

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-rule/50">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-ink font-normal">
            Overview
          </h1>
          <p className="text-sm text-ink-2 mt-1">
            Counted continuity metrics, single points of failure, and upcoming departures.
          </p>
        </div>

        <Link
          href="/showcase"
          className="inline-flex items-center gap-2 rounded-control bg-amber/15 border border-amber/40 px-3 py-1.5 text-xs font-semibold text-amber-ink hover:bg-amber/25 transition-colors"
        >
          <span>🎨 Living Component Showcase</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="rounded-card border border-rule bg-surface p-6 shadow-xs space-y-4">
        <h2 className="font-sans text-base font-semibold text-ink">
          Operational Brain Analysis
        </h2>
        <p className="text-sm text-ink-2 leading-relaxed">
          Welcome to OBA. When someone leaves, nothing breaks. Screen 1 features are being mounted in Phase D.
        </p>
      </div>
    </div>
  );
}
