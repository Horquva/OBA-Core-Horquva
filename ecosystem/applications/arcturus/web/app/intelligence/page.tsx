'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStructuredAssessment } from '../../hooks/useStructuredAssessment';
import Card from '../../components/ui/Card';
import AssessmentCard from '../../components/intelligence/AssessmentCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function IntelligencePage() {
  const [selectedExperimentId, setSelectedExperimentId] = useState('exp-001');
  const { assessment, loading, error } = useStructuredAssessment(selectedExperimentId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">Arcturus</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Intelligence</h1>
        <p className="mt-2 text-sm text-slate-600">Evidence-grounded assessments for completed simulation runs.</p>
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

        {loading && <LoadingSpinner label="Loading assessment" />}
        
        {error && (
          <Card className="border-rose-200 bg-rose-50 p-6">
            <h2 className="font-semibold text-rose-950">Error loading assessment</h2>
            <p className="mt-2 text-sm text-rose-900">{error}</p>
          </Card>
        )}

        {!loading && assessment && <AssessmentCard assessment={assessment} />}

        {!loading && !assessment && !error && (
          <Card className="border-amber-200 bg-amber-50 p-6">
            <h2 className="font-semibold text-amber-950">Assessment unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">No validated Intelligence assessment is available from the backend yet. This view will not display an assessment without validated evidence and supporting citations.</p>
            <Link href="/experiments" className="mt-4 inline-block text-sm font-semibold text-amber-950 underline underline-offset-4">Return to experiments</Link>
          </Card>
        )}
      </div>
    </div>
  );
}
