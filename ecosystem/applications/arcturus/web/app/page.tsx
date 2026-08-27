"use client";

import { useState } from 'react';
import { useExperiment } from '../../hooks/useExperiment';
import CreateExperimentModal from '../../components/experiments/CreateExperimentModal';

export default function ExperimentsPage() {
  const { experiments, loading, error, refetch } = useExperiment();
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal ki state

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Experiments</h1>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          + New Experiment
        </button>
      </div>

      {loading && <p className="text-gray-500">Loading experiments...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && experiments.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow border text-center">
          <p className="text-gray-500">No experiments found. Create your first experiment to get started.</p>
        </div>
      )}

      {!loading && !error && experiments.length > 0 && (
        <div className="grid gap-4">
          {experiments.map((exp: any, index: number) => (
            {/* Yahan hum ne key theek ki hai */}
            <div key={exp.id || index} className="bg-white p-5 rounded-lg shadow border flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">{exp.name || `Experiment ${index + 1}`}</h3>
                <p className="text-sm text-gray-500 font-mono mt-1">ID: {exp.id || 'N/A'}</p>
              </div>
              <div>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full font-medium">
                  {exp.status || 'CREATED'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Yahan hum ne Modal render kiya hai */}
      <CreateExperimentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onCreated={() => {
          setIsModalOpen(false);
          refetch(); // Naya banne par list refresh karega
        }}
      />
    </div>
  );
}