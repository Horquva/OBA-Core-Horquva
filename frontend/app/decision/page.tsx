'use client';

import { useEffect, useState } from 'react';
import { DecisionIntelligenceReport } from '../../lib/decisionIntelligence';
import { DecisionHeader } from '../../components/decision/DecisionHeader';
import { CriticalDecisionsPanel } from '../../components/decision/CriticalDecisionsPanel';
import { DecisionTrailTable } from '../../components/decision/DecisionTrailTable';
import { authHeader } from '../../lib/authFetch';

export default function DecisionPage() {
  const [report, setReport] = useState<DecisionIntelligenceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    // Server-computed — the scoring engine now lives in
    // backend/routes/decisionIntelligence.js so there's one implementation,
    // not a client-side reimplementation next to it.
    fetch(`${base}/api/decision-intelligence`, { headers: authHeader() })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load decision intelligence pipeline');
        return r.json();
      })
      .then((data: DecisionIntelligenceReport) => setReport(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mt-10 mx-6">
        Failed to load Decision Intelligence pipeline: {error}
      </div>
    );
  }

  if (loading || !report) {
    return (
      <div className="space-y-8 pb-12 animate-pulse mt-8 px-6">
        <div className="h-48 w-full bg-[var(--border-subtle)] rounded-xl" />
        <div className="h-96 w-full bg-[var(--border-subtle)] rounded-xl" />
        <div className="h-64 w-full bg-[var(--border-subtle)] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Module header: DQI gauge + KPI strip */}
      <DecisionHeader report={report} />

      {/* HARMFUL + POOR decisions side-by-side */}
      <CriticalDecisionsPanel harmful={report.harmful} poor={report.poor} />

      {/* Full decision trail audit table */}
      <DecisionTrailTable decisions={report.decisions} />
    </div>
  );
}
