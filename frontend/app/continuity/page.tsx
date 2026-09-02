'use client';

import { useEffect, useState } from 'react';
import { mapContinuityResponse, ContinuityReport } from '../../lib/continuityRisk';
import { AutomationStatusStrip } from '../../components/continuity/AutomationStatusStrip';
import { ContinuityTab, ContinuityPayload } from '../../components/continuity/ContinuityTab';
import { GovernanceTab, GovernancePayload } from '../../components/continuity/GovernanceTab';
import { authHeader } from '../../lib/authFetch';
import { ModuleResult } from '../../lib/moduleResult';

export default function ContinuityPage() {
  const [report, setReport] = useState<ContinuityReport | null>(null);
  const [continuityModule, setContinuityModule] = useState<ModuleResult<ContinuityPayload> | null>(null);
  const [governanceModule, setGovernanceModule] = useState<ModuleResult<GovernancePayload> | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    Promise.all([
      // D-61 -- the per-asset heuristic (Department Disruption Map,
      // Must-Protect/Worst-Offenders lists), now computed server-side.
      fetch(`${base}/api/continuity`, { headers: authHeader() }).then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${r.statusText}`))),
      // M18/M19 -- real brain modules, org/department aggregates over a
      // different formula (see assetContinuity()'s own header comment).
      fetch(`${base}/api/intelligence/continuity`, { headers: authHeader() }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${base}/api/intelligence/governance`, { headers: authHeader() }).then(r => r.ok ? r.json() : null).catch(() => null),
    ])
    .then(([continuityJson, continuityData, governanceData]) => {
      setReport(mapContinuityResponse(continuityJson));
      setContinuityModule(continuityData);
      setGovernanceModule(governanceData);
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
  }, []);

  if (loading || !report) {
    return (
      <div className="space-y-8 pb-12 animate-pulse mt-8 px-6 max-w-7xl mx-auto">
        <div className="h-64 w-full bg-[var(--border-subtle)] rounded-xl" />
        <div className="flex flex-col xl:flex-row gap-8">
           <div className="flex-1 h-96 bg-[var(--border-subtle)] rounded-xl" />
           <div className="flex-1 h-96 bg-[var(--border-subtle)] rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mt-10 max-w-7xl mx-auto">
        Failed to load Continuity Intelligence pipeline: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Continuity & Governance</h1>
        <p className="text-sm text-[color:var(--text-secondary)] mt-1">Disruption survival modeling and compliance auditing across all assets.</p>
      </div>

      {/* Advisory mode strip (M52 & M53) */}
      <AutomationStatusStrip />
      
      {/* Layout split: Continuity on left, Governance on right (or stacked on mobile) */}
      <div className="flex flex-col xl:flex-row gap-8">
        
        {/* Continuity (M18) */}
        <section className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4 px-1">
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Disruption Continuity</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">M18</span>
          </div>
          <ContinuityTab report={report} module={continuityModule} />
        </section>

        <div className="hidden xl:block w-px bg-[color:var(--border-subtle)]" />

        {/* Governance (M19) */}
        <section className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4 px-1">
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Compliance Governance</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-sky-500/30 text-sky-400 bg-sky-500/10">M19</span>
          </div>
          <GovernanceTab report={report} module={governanceModule} />
        </section>

      </div>
    </div>
  );
}
