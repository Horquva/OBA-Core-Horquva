'use client';

import { useState } from 'react';
import { useSyntheticCorpus } from '../../hooks/useSyntheticCorpus';
import { useProvenanceLineage } from '../../hooks/useProvenanceLineage';
import Card from '../../components/ui/Card';
import EvidenceTable from '../../components/evidence/EvidenceTable';
import LineageGraph from '../../components/evidence/LineageGraph';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Link from 'next/link';

export default function EvidencePage() {
  const [selectedRunId, setSelectedRunId] = useState('run-001');
  const { corpus, loading: corpusLoading, error: corpusError } = useSyntheticCorpus(selectedRunId);
  const { records, lineageAvailable, loading: lineageLoading } = useProvenanceLineage('exp-001');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">Arcturus</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Evidence & Provenance</h1>
        <p className="mt-2 text-sm text-slate-600">Synthetic artifacts and lineage tracing for simulation runs.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700">Select Simulation Run</label>
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
          >
            <option value="run-001">run-001 (Sunrise Care - exp-001)</option>
            <option value="run-002">run-002 (Attrition - exp-002)</option>
          </select>
        </div>

        {corpusLoading && <LoadingSpinner label="Loading synthetic corpus" />}

        {corpusError && (
          <Card className="border-rose-200 bg-rose-50 p-6">
            <h2 className="font-semibold text-rose-950">Error loading corpus</h2>
            <p className="mt-2 text-sm text-rose-900">{corpusError}</p>
          </Card>
        )}

        {!corpusLoading && corpus && (
          <div className="space-y-6">
            <EvidenceTable
              artifacts={corpus.accepted_artifacts}
              provisional={!corpus.lineage_available}
            />

            {corpus.rejected_artifacts_available && (
              <Card className="border-amber-200 bg-amber-50 p-6">
                <h2 className="font-semibold text-amber-950">Rejected artifacts available</h2>
                <p className="mt-2 text-sm text-amber-900">
                  This run contains artifacts that did not pass validation. Use the validation endpoint to view detailed failure reasons.
                </p>
              </Card>
            )}

            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-950">Provenance & Lineage</h2>
              {lineageLoading ? (
                <LoadingSpinner label="Loading lineage records" />
              ) : lineageAvailable && records.length > 0 ? (
                <LineageGraph records={records} />
              ) : (
                <Card className="border-slate-200 bg-slate-50 p-6">
                  <h3 className="font-semibold text-slate-900">Provenance unavailable</h3>
                  <p className="mt-2 text-sm text-slate-700">
                    Complete lineage tracking is not yet persisted by the backend. Once available, this section will display the complete causal chain from experiment configuration through each artifact generation event.
                  </p>
                </Card>
              )}
            </div>

            <div className="mt-8 flex gap-4">
              <Link
                href="/validation"
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                View Validation Results
              </Link>
              <Link
                href="/intelligence"
                className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                View Intelligence Assessments
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
