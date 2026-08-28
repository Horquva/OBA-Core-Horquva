"use client";
import { useState } from 'react';
import { useExperiment } from '../../hooks/useExperiment';
import CreateExperimentModal from '../../components/experiments/CreateExperimentModal';
import ExperimentCard from '../../components/experiments/ExperimentCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ExperimentTimeline from '../../components/experiments/ExperimentTimeline';
import type { ExperimentRecord } from '../../lib/types';

export default function ExperimentsPage() {
  const { experiments, loading, error, refetch } = useExperiment();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
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
        </div>
      )}

      {!loading && !error && experiments.length > 0 && (
        <div className="grid gap-4">
          {experiments.map((experiment: ExperimentRecord) => (
            <div key={experiment.id} className="space-y-3">
              <ExperimentCard experiment={experiment} />
              <ExperimentTimeline status={experiment.status} />
            </div>
          ))}
        </div>
      )}

      <CreateExperimentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => {
          setIsModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}