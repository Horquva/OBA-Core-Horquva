'use client';

import { useState } from 'react';
import { useValidationResult } from '../../hooks/useValidationResult';
import Card from '../../components/ui/Card';
import ValidationSummary from '../../components/validation/ValidationSummary';
import QualityGateIndicator from '../../components/validation/QualityGateIndicator';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Link from 'next/link';

export default function ValidationPage() {
  const [selectedExperimentId, setSelectedExperimentId] = useState('exp-001');
  const { result, loading, error, refetch } = useValidationResult(selectedExperimentId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">Arcturus</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Validation</h1>
        <p className="mt-2 text-sm text-slate-600">Validation results and quality gate status for completed experiments.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700">Select Experiment</label>
          <select
            value={selectedExperimentId}
            onChange={(e) => setSelectedExperimentId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
          >
            <option value="exp-001">exp-001 (Sunrise Care Scenario)</option>
            <option value="exp-002">exp-002 (Attrition Scenario)</option>
          </select>
        </div>

        {loading && <LoadingSpinner label="Loading validation results" />}

        {error && (
          <Card className="border-rose-200 bg-rose-50 p-6">
            <h2 className="font-semibold text-rose-950">Error loading validation</h2>
            <p className="mt-2 text-sm text-rose-900">{error}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 text-sm font-semibold text-rose-950 underline underline-offset-2"
            >
              Try again
            </button>
          </Card>
        )}

        {!loading && result && (
          <div className="space-y-6">
            <ValidationSummary
              experimentId={selectedExperimentId}
              status={result.final_status}
              reason={result.reason || undefined}
            />

            <QualityGateIndicator status={result.final_status} />

            <Card className="p-5">
              <h2 className="font-semibold text-slate-950">Validation Rules Applied</h2>

              {result.passed_rules.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-emerald-700">Passed Rules ({result.passed_rules.length})</h3>
                  <ul className="mt-2 space-y-1">
                    {result.passed_rules.map((rule) => (
                      <li key={rule} className="text-sm text-emerald-700">
                        ✓ {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.failed_rules.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-rose-700">Failed Rules ({result.failed_rules.length})</h3>
                  <ul className="mt-2 space-y-1">
                    {result.failed_rules.map((rule) => (
                      <li key={rule} className="text-sm text-rose-700">
                        ✗ {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.flagged_rules.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-amber-700">Flagged Rules ({result.flagged_rules.length})</h3>
                  <ul className="mt-2 space-y-1">
                    {result.flagged_rules.map((rule) => (
                      <li key={rule} className="text-sm text-amber-700">
                        ⚠ {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.passed_rules.length === 0 &&
                result.failed_rules.length === 0 &&
                result.flagged_rules.length === 0 && (
                  <p className="mt-4 text-sm text-slate-600">No validation rules available for this experiment.</p>
                )}
            </Card>

            <Card className="border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Evaluation Timestamp</p>
              <p className="mt-2 break-all font-mono text-xs text-slate-700">{result.evaluated_at}</p>
            </Card>

            <div className="flex gap-4">
              <Link
                href="/evidence"
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                View Evidence
              </Link>
              <Link
                href="/intelligence"
                className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                View Intelligence
              </Link>
            </div>
          </div>
        )}

        {!loading && !result && !error && (
          <Card className="border-amber-200 bg-amber-50 p-6">
            <h2 className="font-semibold text-amber-950">Validation results not available</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              No validation results have been generated for this experiment yet. Once validation completes on the backend, the results will appear here.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
