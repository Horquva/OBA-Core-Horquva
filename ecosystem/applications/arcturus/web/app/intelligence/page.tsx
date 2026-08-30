import Link from 'next/link';
import Card from '../../components/ui/Card';

export default function IntelligencePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">Arcturus</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Intelligence</h1>
        <p className="mt-2 text-sm text-slate-600">Evidence-grounded assessments for completed simulation runs.</p>
      </div>
      <Card className="border-amber-200 bg-amber-50 p-6">
        <h2 className="font-semibold text-amber-950">Assessment unavailable</h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">No validated Intelligence assessment is available from the backend yet. This view will not display an assessment without validated evidence and supporting citations.</p>
        <Link href="/experiments" className="mt-4 inline-block text-sm font-semibold text-amber-950 underline underline-offset-4">Return to experiments</Link>
      </Card>
    </div>
  );
}
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { StructuredAssessment } from '@/lib/types';

function IntelligenceContent() {
  const searchParams = useSearchParams();
  const experimentId = searchParams.get('experimentId') || searchParams.get('id');

  const [assessment, setAssessment] = useState<StructuredAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!experimentId) return;

    async function fetchAssessment() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<StructuredAssessment>(
          `/api/v1/intelligence/assessment/${experimentId}`
        );
        setAssessment(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch intelligence assessment.');
      } finally {
        setLoading(false);
      }
    }

    fetchAssessment();
  }, [experimentId]);

  if (!experimentId) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-600">Please select an experiment to view intelligence assessment.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading assessment...</div>;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <h3 className="font-semibold">Unable to load intelligence assessment</h3>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Intelligence Assessment</h1>
        <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono">
          {experimentId}
        </span>
      </div>

      {assessment ? (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">Verdict</span>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full">
              {assessment.verdict}
            </span>
          </div>

          <div className="text-sm text-slate-600">
            Confidence: <span className="font-semibold text-slate-900">{(assessment.confidence_score * 100).toFixed(1)}%</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700">
            <h3 className="font-semibold text-slate-800 mb-1">Reasoning</h3>
            <p>{assessment.reasoning}</p>
          </div>

          {assessment.recommendations && assessment.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recommendations</h4>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                {assessment.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-amber-200 bg-amber-50 p-6 rounded-xl">
          <h2 className="font-semibold text-amber-950">Assessment unavailable</h2>
          <p className="mt-2 text-sm text-amber-900">
            No validated Intelligence assessment is available from the backend yet.
          </p>
        </div>
      )}
    </div>
  );
}

export default function IntelligencePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>
      <IntelligenceContent />
    </Suspense>
  );
}
