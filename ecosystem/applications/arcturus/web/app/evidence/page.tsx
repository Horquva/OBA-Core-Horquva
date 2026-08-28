"use client";
import { useState, useEffect } from 'react';
import { experimentApi } from '../../lib/api-client';

export default function EvidencePage() {
  const [experimentId, setExperimentId] = useState('exp-test-001'); // Temporary ID for testing
  const [evidence, setEvidence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvidence = async () => {
      try {
        setLoading(true);
        // Backend se real evidence API call
        const data = await experimentApi.getEvidence(experimentId);
        setEvidence(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load evidence');
        setEvidence(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEvidence();
  }, [experimentId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow border">
        <h1 className="text-3xl font-bold">Synthetic Evidence</h1>
        <div className="text-sm text-gray-500 font-mono">Experiment: {experimentId}</div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border">
        {loading && <div className="text-blue-600 animate-pulse">Loading real evidence data from backend...</div>}
        
        {/* Honest failure state jaisa rules mein likha hai */}
        {error && <div className="text-red-600 font-bold border-l-4 border-red-600 pl-4">Error: {error}</div>}
        
        {!loading && !error && evidence && (
          <div>
            <h2 className="font-bold mb-2">Validated Corpus</h2>
            <pre className="bg-slate-900 text-green-400 p-4 rounded-md overflow-x-auto text-sm font-mono">
              {JSON.stringify(evidence, null, 2)}
            </pre>
          </div>
        )}
        
        {!loading && !error && !evidence && (
          <div className="text-gray-500">No evidence available for this experiment yet. Run the simulation first.</div>
        )}
      </div>
    </div>
  );
}