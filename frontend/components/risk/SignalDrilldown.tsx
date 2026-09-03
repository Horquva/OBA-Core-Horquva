'use client';

import React, { useEffect, useState } from 'react';
import { signalApi, SignalDrilldownResponse } from '../../lib/api';
import { Activity, AlertTriangle, Info } from 'lucide-react';

interface Props {
  entityName: string;
}

export function SignalDrilldown({ entityName }: Props) {
  const [data, setData] = useState<SignalDrilldownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      setLoading(true);
      setError(false);
    });
    signalApi.drilldown(entityName)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [entityName]);

  if (loading) {
    return <div className="h-12 w-full rounded-md bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] animate-pulse" />;
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-[color:var(--text-tertiary)] p-2">
        <AlertTriangle className="w-4 h-4" />
        Signal reasoning is unavailable right now — could not reach the drilldown data.
      </div>
    );
  }

  if (!data || data.reasons.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-[color:var(--text-tertiary)] p-2">
        <Info className="w-4 h-4" />
        No active signals driving this score.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <Activity className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          Signal Drift Reasoning
        </span>
      </div>
      
      <div className="space-y-2">
        {data.reasons.map((reason) => (
          <div key={reason.id} className="flex items-start gap-3 p-2.5 rounded bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)]">
            <div className={`p-1 rounded flex-shrink-0 ${reason.impactWeight === 'HIGH' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-500'}`}>
              <AlertTriangle className="w-3 h-3" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[color:var(--text-primary)]">{reason.factor}</span>
              <span className="text-[11px] text-[color:var(--text-secondary)] mt-0.5 leading-relaxed">{reason.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
