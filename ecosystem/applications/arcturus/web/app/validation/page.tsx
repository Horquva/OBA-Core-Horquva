"use client";
import { useState, useEffect } from 'react';
import { experimentApi } from '../../lib/api-client';

export default function ValidationPage() {
  const [experimentId, setExperimentId] = useState('exp-test-001');
  const [validationData, setValidationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchValidation = async () => {
      try {
        setLoading(true);
        // Real API call to Amina's Validation engine[cite: 3]
        const data = await experimentApi.getValidationResults(experimentId);
        setValidationData(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load validation results');
        setValidationData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchValidation();
  }, [experimentId]);

  // Helper function to colorize the tri-state classification
  const getStatusColor = (status: string) => {
    if (status === 'VALIDATED') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'REJECTED') return 'bg-red-100 text-red-800 border-red-300';
    if (status === 'INCONCLUSIVE') return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow border">
        <div>
          <h1 className="text-3xl font-bold">Validation Results</h1>
          <p className="text-gray-500 mt-1">Quality Gates & Tri-State Classification</p>
        </div>
        <div className="text-sm text-gray-500 font-mono">Experiment: {experimentId}</div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border">
        {loading && <div className="text-blue-600 animate-pulse">Running quality gates...</div>}
        
        {/* Honest failure state[cite: 3] */}
        {error && <div className="text-red-600 font-bold border-l-4 border-red-600 pl-4">Error: {error}</div>}
        
        {!loading && !error && validationData && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border-2 font-bold text-lg text-center uppercase ${getStatusColor(validationData.final_status)}`}>
              Status: {validationData.final_status || 'UNKNOWN'}
            </div>
            
            <h2 className="font-bold mb-2 mt-6">Validation Payload</h2>
            <pre className="bg-slate-900 text-blue-300 p-4 rounded-md overflow-x-auto text-sm font-mono">
              {JSON.stringify(validationData, null, 2)}
            </pre>
          </div>
        )}
        
        {!loading && !error && !validationData && (
          <div className="text-gray-500">No validation results found. Ensure the simulation and data generation are complete.</div>
        )}
      </div>
    </div>
  );
}