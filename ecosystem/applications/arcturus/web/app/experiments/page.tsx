"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Experiments</h1>
      </div>

      {!loading && !error && experiments.length === 0 && (
        <div className="bg-white p-6 rounded-lg shadow border text-center text-gray-500">
          No experiments found.
        </div>
      )}

      {!loading && !error && experiments.length > 0 && (
        <div className="grid gap-4">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}