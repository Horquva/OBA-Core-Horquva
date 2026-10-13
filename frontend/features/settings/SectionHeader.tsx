import * as React from 'react';

/** The title row at the top of each Settings section. */
export function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        <p className="type-meta mt-0.5 text-ink-3">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** A status line under a section header: green when it worked, red when it didn't. */
export function Notice({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={
        ok
          ? 'type-meta rounded-control border border-st-pass/30 bg-[color-mix(in_srgb,var(--st-pass)_8%,transparent)] px-4 py-2.5 text-ink'
          : 'type-meta rounded-control border border-st-fail/30 bg-[color-mix(in_srgb,var(--st-fail)_8%,transparent)] px-4 py-2.5 text-st-fail'
      }
    >
      {children}
    </div>
  );
}
