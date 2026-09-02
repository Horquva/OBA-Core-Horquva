'use client';

import { useState, useEffect } from 'react';
import { orgScience, ApiError, type IntelligenceResponse, type CapabilityPayload } from '../../lib/api';
import { Building2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

type FetchState = 'loading' | 'success' | 'error' | 'empty';

function MetricRow({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--border-subtle)] last:border-0">
      <span className="text-[color:var(--text-secondary)]">{label}</span>
      <span className={clsx("font-bold tabular-nums", color)}>{value}</span>
    </div>
  );
}

export function CapabilityByDeptCard() {
  const [res, setRes] = useState<IntelligenceResponse<CapabilityPayload> | null>(null);
  const [state, setState] = useState<FetchState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await orgScience.capabilityByDept();
        if (cancelled) return;
        setRes(response);
        setState('success');
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMsg(
          err instanceof ApiError
            ? `${err.status} — ${err.message}`
            : 'Failed to fetch capability data',
        );
        setState('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const data = res?.payload;

  return (
    <div className="card border-[var(--border-subtle)] flex flex-col h-full min-h-[280px]">
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Building2 className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">Capability Intel</h3>
        </div>
        {/*
          The badge here used to read STRONG/DEVELOPING off
          brainConstitutionalCapabilities — the brain's own module count, always
          55, so it always said STRONG. It measured the machinery rather than the
          organization and was removed with the runtime. Nothing in this payload
          currently supports a health verdict, so the card states counts only.
        */}
      </div>

      <div className="p-6 flex-1 flex flex-col justify-center">
        {state === 'loading' && (
          <div className="space-y-4">
            <div className="h-10 w-24 mx-auto rounded bg-[var(--border-subtle)] animate-pulse-soft" />
            <div className="space-y-2">
              <div className="h-6 w-full rounded bg-[var(--border-subtle)] animate-pulse-soft" />
              <div className="h-6 w-full rounded bg-[var(--border-subtle)] animate-pulse-soft" />
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[color:var(--text-primary)] font-medium mb-1">Failed to load capability data</p>
              <p className="text-xs text-[color:var(--text-tertiary)]">{errorMsg}</p>
            </div>
          </div>
        )}

        {state === 'empty' && (
          <div className="flex flex-col items-center text-center">
            <Building2 className="w-8 h-8 text-[color:var(--text-tertiary)] mb-2" />
            <p className="text-sm text-[color:var(--text-secondary)]">No capability data available.</p>
          </div>
        )}

        {state === 'success' && data && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="text-4xl font-bold text-[color:var(--text-primary)] tabular-nums tracking-tight mb-1">
                {data.workflowCapabilities.length}
              </div>
              <p className="text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-widest font-medium">
                Workflow Capabilities
              </p>
            </div>

            <div>
              {/*
                "Not modelled", not "none exist" — no Supabase table sources the
                `system` entity type, so this is a gap in what we capture rather
                than a fact about the organization. Shown in muted text so it
                does not read as a measured zero.
              */}
              <MetricRow
                label="System Capabilities"
                value={data.systemCapabilities.length > 0 ? data.systemCapabilities.length : 'not modelled'}
                color="text-[color:var(--text-tertiary)]"
              />
              <MetricRow
                label="Workflows Mapped"
                value={data.workflowCapabilities.length}
                color="text-[color:var(--text-primary)]"
              />
            </div>

            {res.recommendations && res.recommendations.length > 0 && (
              <div className="px-3 py-2 rounded-lg bg-[var(--border-subtle)] border border-[var(--border-default)]">
                <p className="text-[10px] text-[color:var(--text-secondary)] uppercase tracking-widest font-bold mb-1">Insights</p>
                <p className="text-xs text-[color:var(--text-primary)] truncate">
                  {res.recommendations[0]}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
