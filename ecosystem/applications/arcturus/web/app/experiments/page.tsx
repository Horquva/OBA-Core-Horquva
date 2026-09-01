"use client";
import { useState } from 'react';
import { useExperiment } from '../../hooks/useExperiment';
import CreateExperimentModal from '../../components/experiments/CreateExperimentModal';
import ExperimentCard from '../../components/experiments/ExperimentCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ExperimentTimeline from '../../components/experiments/ExperimentTimeline';
import type { ExperimentRecord } from '../../lib/types';
import SectionHeader from '../../components/ui/SectionHeader';

export default function ExperimentsPage() {
  const { experiments, loading, error, refetch } = useExperiment();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-8 pb-12">
      <SectionHeader 
        title="Experiments" 
        description="Review experiments returned by the platform API."
        action={
          <button
            onClick={() => setIsModalOpen(true)} 
            className="bg-[var(--brand-primary)] text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition font-medium text-sm shadow-sm"
          >
            + New Experiment
          </button>
        }
      />

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