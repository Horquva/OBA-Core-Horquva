'use client';

import { useEffect, useState } from 'react';
import { NetworkReport } from '../../lib/networkRisk';
import { CentralityGraph } from '../../components/network/CentralityGraph';
import { request, ApiError } from '../../lib/api';

export default function NetworkPage() {
  const [report, setReport] = useState<NetworkReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Server-computed — the graph algorithm now lives in backend/routes/network.js
    // so there's one implementation, not a client-side reimplementation next to it.
    request<NetworkReport>('/api/network/centrality')
      .then((data) => setReport(data))
      .catch((err: unknown) => setError(err instanceof ApiError ? `${err.status} — ${err.message}` : 'Failed to load network centrality data'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">

      <div>
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Network Visualization</h1>
        <p className="text-sm text-[color:var(--text-secondary)] mt-1">
          People-centric dependency topology. Uncovers human bottlenecks and hidden siloes across the organization.
        </p>
      </div>

      {loading && (
        <div className="h-[600px] w-full bg-[var(--border-subtle)] rounded-xl animate-pulse" />
      )}

      {!loading && error && (
        <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
          Failed to load network dataset: {error}
        </div>
      )}

      {!loading && !error && report && <CentralityGraph report={report} />}

    </div>
  );
}
