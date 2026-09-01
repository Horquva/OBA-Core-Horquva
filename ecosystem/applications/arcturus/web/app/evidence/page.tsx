'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { SyntheticDataCorpusPreview } from '@/lib/types';

function EvidenceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialExpId = searchParams.get('experimentId') || searchParams.get('id') || '';

  const [experiments, setExperiments] = useState<any[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<string>(initialExpId);
  const [evidence, setEvidence] = useState<SyntheticDataCorpusPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch available experiments
  useEffect(() => {
    apiClient.get<any[]>('/api/v1/experiments')
      .then((data) => {
        const list = data || [];
        setExperiments(list);
        if (!selectedExpId && list.length > 0) {
          setSelectedExpId(list[0].id);
        }
      })
      .catch(() => setExperiments([]));
  }, []);

  // 2. Sync selectedExpId with URL parameter if provided
  useEffect(() => {
    if (initialExpId) {
      setSelectedExpId(initialExpId);
    }
  }, [initialExpId]);

  // 3. Fetch evidence when selectedExpId changes
  useEffect(() => {
    if (!selectedExpId) return;

    async function fetchEvidence() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<SyntheticDataCorpusPreview>(
          `/api/v1/evidence/${selectedExpId}`
        );
        setEvidence(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch synthetic evidence.');
        setEvidence(null);
      } finally {
        setLoading(false);
      }
    }

    fetchEvidence();
  }, [selectedExpId]);

  const handleSelectExperiment = (id: string) => {
    setSelectedExpId(id);
    router.replace(`/evidence?experimentId=${id}`);
  };

  const artifacts = evidence?.accepted_artifacts || [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* Header & Experiment Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Synthetic Data Corpus</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Synthetic Evidence Library</h1>
          <p className="mt-1 text-sm text-slate-600">Inspect simulation-generated documents, meeting notes, and compliance artifacts.</p>
        </div>

        {/* Interactive Experiment Dropdown */}
        <div className="flex items-center gap-3">
          <label htmlFor="exp-evidence-select" className="text-xs font-semibold text-slate-700 whitespace-nowrap">
            Select Run:
          </label>
          <select
            id="exp-evidence-select"
            value={selectedExpId}
            onChange={(e) => handleSelectExperiment(e.target.value)}
            className="text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name} ({exp.id.slice(0, 8)}... - Seed: {exp.seed})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm font-medium text-slate-600">Loading synthetic evidence artifacts...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <h3 className="font-semibold text-base">Unable to load evidence</h3>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Artifacts Table */}
      {!loading && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="font-bold text-slate-900">Accepted Artifacts & Lineage</h2>
              <p className="text-xs text-slate-500 mt-0.5">Grounding evidence registered for run: <span className="font-mono text-indigo-600">{selectedExpId || 'None'}</span></p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
              {evidence?.lineage_available ? '✓ Lineage Verified' : 'Provisional Lineage'}
            </span>
          </div>

          {artifacts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              <p className="text-base font-semibold text-slate-700">No synthetic artifacts registered for this run yet.</p>
              <p className="text-xs text-slate-400 mt-1">Artifacts are generated during scenario execution and synthetic data compilation.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Artifact ID</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Lifecycle State</th>
                    <th className="px-6 py-3.5">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {artifacts.map((art, idx) => (
                    <tr key={art.artifact_id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-xs font-semibold text-indigo-600">{art.artifact_id}</td>
                      <td className="px-6 py-3.5">
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-slate-100 text-slate-700">
                          {art.artifact_type}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-700">{art.lifecycle_state || 'ACCEPTED'}</td>
                      <td className="px-6 py-3.5 text-xs text-slate-400 font-mono">{art.created_at || 'Just now'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EvidencePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Evidence...</div>}>
      <EvidenceContent />
    </Suspense>
  );
}