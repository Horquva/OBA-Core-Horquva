'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '../../lib/api-client';

interface ValidationResult {
  passed: boolean;
  score?: number;
  details?: string;
  violations?: string[];
  metrics?: Record<string, number>;
}

function ValidationContent() {
  const searchParams = useSearchParams();
  const experimentId = searchParams.get('experimentId') || searchParams.get('id');

  const [validationData, setValidationData] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!experimentId) return;

    async function fetchValidation() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<ValidationResult>(
          `/api/v1/validation/${experimentId}`
        );
        setValidationData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch validation report.');
      } finally {
        setLoading(false);
      }
    }

    fetchValidation();
  }, [experimentId]);

  if (!experimentId) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-600">Please select an experiment to view validation report.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading validation status...</div>;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <h3 className="font-semibold">Unable to load validation report</h3>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Validation Status</h1>
        <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono">
          {experimentId}
        </span>
      </div>

      {validationData ? (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">Validation Gate</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                validationData.passed
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {validationData.passed ? 'PASSED' : 'FAILED'}
            </span>
          </div>

          {validationData.score !== undefined && (
            <div className="text-sm text-slate-600">
              Confidence Score: <span className="font-semibold text-slate-900">{(validationData.score * 100).toFixed(1)}%</span>
            </div>
          )}

          {validationData.details && (
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              {validationData.details}
            </p>
          )}

          {validationData.violations && validationData.violations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Detected Violations</h4>
              <ul className="space-y-1.5 list-disc list-inside text-sm text-rose-600">
                {validationData.violations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-amber-200 bg-amber-50 p-6 rounded-xl">
          <h2 className="font-semibold text-amber-950">No Validation Data</h2>
          <p className="mt-2 text-sm text-amber-900">
            No validation telemetry recorded for this experiment.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ValidationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading component...</div>}>
      <ValidationContent />
    </Suspense>
  );
}