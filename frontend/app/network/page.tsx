'use client';

import { useEffect, useState } from 'react';
import { NetworkReport } from '../../lib/networkRisk';
import { CentralityGraph } from '../../components/network/CentralityGraph';
import { authHeader } from '../../lib/authFetch';

export default function NetworkPage() {
  const [report, setReport] = useState<NetworkReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    // Server-computed — the graph algorithm now lives in backend/routes/network.js
    // so there's one implementation, not a client-side reimplementation next to it.
    fetch(`${base}/api/network/centrality`, { headers: authHeader() })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load network centrality data');
        return r.json();
      })
      .then((data: NetworkReport) => setReport(data))
      .catch((err) => setError(err.message))
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
