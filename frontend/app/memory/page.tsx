'use client';

import { useEffect, useState } from 'react';
import { mapOrgMemoryResponse, OrgMemoryReport } from '../../lib/orgMemory';
import { MemoryHeader } from '../../components/memory/MemoryHeader';
import { MemoryCarriersPanel } from '../../components/memory/MemoryCarriersPanel';
import { LostAssetsPanel } from '../../components/memory/LostAssetsPanel';
import { request, ApiError } from '../../lib/api';

export default function MemoryPage() {
  const [report, setReport]   = useState<OrgMemoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    request<Partial<OrgMemoryReport>>('/api/memory/map')
      .then(json => setReport(mapOrgMemoryResponse(json)))
      .catch((err: unknown) => setError(err instanceof ApiError ? `${err.status} — ${err.message}` : 'Failed to load'))
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
