"use client";
import { useState } from 'react';
<<<<<<< HEAD
import { useExperiment } from '../../hooks/useExperiment';
import CreateExperimentModal from '../../components/experiments/CreateExperimentModal';
import ExperimentCard from '../../components/experiments/ExperimentCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ExperimentTimeline from '../../components/experiments/ExperimentTimeline';
import type { ExperimentRecord } from '../../lib/types';
=======
import Link from 'next/link';
>>>>>>> origin/initiative/arcturus

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
<<<<<<< HEAD
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">Arcturus</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Experiments</h1>
          <p className="mt-2 text-sm text-slate-600">Review experiments returned by the platform API.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          + New Experiment
        </button>
      </div>

      {loading && <LoadingSpinner label="Loading experiments" />}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</div>}

      {!loading && !error && experiments.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">No experiments are available from the backend.</p>
          <button onClick={() => setIsModalOpen(true)} className="mt-4 font-semibold text-sky-700 hover:text-sky-900">Create an experiment</button>
=======
        <h1 className="text-3xl font-bold">Experiments</h1>
      </div>

      {!loading && !error && experiments.length === 0 && (
        <div className="bg-white p-6 rounded-lg shadow border text-center text-gray-500">
          No experiments found.
>>>>>>> origin/initiative/arcturus
        </div>
      )}

      {!loading && !error && experiments.length > 0 && (
        <div className="grid gap-4">
<<<<<<< HEAD
          {experiments.map((experiment: ExperimentRecord) => (
            <div key={experiment.id} className="space-y-3">
              <ExperimentCard experiment={experiment} />
              <ExperimentTimeline status={experiment.status} />
=======
          {experiments.map((exp: any, index: number) => (
            <div key={exp.id || index} className="bg-white p-4 rounded-lg shadow border flex justify-between items-center">
              <div>
                <h3 className="font-bold">Experiment {index + 1}</h3>
                <p className="text-sm text-gray-500">{exp.id || 'N/A'}</p>
              </div>
              <div>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                  {exp.status || 'CREATED'}
                </span>
              </div>
>>>>>>> origin/initiative/arcturus
            </div>
          ))}
        </div>
      )}
    </div>
  );
}