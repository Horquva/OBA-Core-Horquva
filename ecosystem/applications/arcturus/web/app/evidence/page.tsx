'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { SyntheticDataCorpusPreview } from '@/lib/types';

function EvidenceContent() {
  const searchParams = useSearchParams();
  const experimentId = searchParams.get('experimentId') || searchParams.get('id');

  const [evidence, setEvidence] = useState<SyntheticDataCorpusPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!experimentId) return;

    async function fetchEvidence() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<SyntheticDataCorpusPreview>(
          `/api/v1/evidence/${experimentId}`
        );
        setEvidence(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch synthetic evidence.');
      } finally {
        setLoading(false);
      }
    }

    fetchEvidence();
  }, [experimentId]);

  if (!experimentId) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-600">Please select an experiment to view synthetic evidence.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading evidence...</div>;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <h3 className="font-semibold">Unable to load evidence</h3>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  const artifacts = evidence?.accepted_artifacts || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Synthetic Evidence</h1>
        <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono">
          {experimentId}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-semibold text-slate-800">Accepted Artifacts</h2>
          <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
            {evidence?.lineage_available ? 'Lineage Verified' : 'Provisional Lineage'}
          </span>
        </div>
        {artifacts.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">No artifacts registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Artifact ID</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Name / Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {artifacts.map((art, idx) => (
                  <tr key={art.artifact_id || idx} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3 font-mono text-xs text-indigo-600">{art.artifact_id}</td>
                    <td className="px-6 py-3">{art.artifact_type}</td>
                    <td className="px-6 py-3">{art.name || art.description || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EvidencePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>
      <EvidenceContent />
    </Suspense>
  );
}