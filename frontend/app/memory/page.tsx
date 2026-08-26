'use client';

import { useEffect, useState } from 'react';
import { mapOrgMemoryResponse, OrgMemoryReport } from '../../lib/orgMemory';
import { MemoryHeader } from '../../components/memory/MemoryHeader';
import { MemoryCarriersPanel } from '../../components/memory/MemoryCarriersPanel';
import { LostAssetsPanel } from '../../components/memory/LostAssetsPanel';
import { authHeader } from '../../lib/authFetch';

export default function MemoryPage() {
  const [report, setReport]   = useState<OrgMemoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    fetch(`${base}/api/memory/map`, { headers: authHeader() })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${r.statusText}`)))
      .then(json => setReport(mapOrgMemoryResponse(json)))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !report) {
    return (
      <div className="space-y-8 pb-12 animate-pulse mt-8 px-6">
        <div className="h-48 w-full bg-[var(--border-subtle)] rounded-xl" />
        <div className="h-96 w-full bg-[var(--border-subtle)] rounded-xl" />
        <div className="h-64 w-full bg-[var(--border-subtle)] rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mt-10 mx-6">
        Failed to load Org Memory pipeline: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Module header + KPI strip + IMHS meter */}
      <MemoryHeader report={report} />

      {/* Critical memory carriers — per-person scorecards */}
      <MemoryCarriersPanel carriers={report.carriers} />

      {/* LOST assets — no owner, no docs, no recovery */}
      <LostAssetsPanel lost={report.lost} />
    </div>
  );
}
