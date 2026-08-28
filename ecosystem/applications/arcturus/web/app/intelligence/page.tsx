"use client";
import { useState, useEffect } from 'react';
import { experimentApi } from '../../lib/api-client';

export default function IntelligencePage() {
  const [experimentId, setExperimentId] = useState('exp-test-001');
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIntelligence = async () => {
      try {
        setLoading(true);
        // Real API call to Ahmed's Gemini Intelligence engine
        const data = await experimentApi.getIntelligenceAssessments(experimentId);
        setAssessment(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load intelligence assessment');
        setAssessment(null);
      } finally {
        setLoading(false);
      }
    };

    fetchIntelligence();
  }, [experimentId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow border">
        <div>
          <h1 className="text-3xl font-bold text-indigo-700">AI Intelligence Assessment</h1>
          <p className="text-gray-500 mt-1">Powered by Google Gemini (Evidence-Grounded)</p>
        </div>
        <div className="text-sm text-gray-500 font-mono">Experiment: {experimentId}</div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border">
        {loading && <div className="text-indigo-600 animate-pulse">Generating evidence-grounded assessment via Gemini...</div>}
        
        {/* Honest failure state */}
        {error && <div className="text-red-600 font-bold border-l-4 border-red-600 pl-4">Error: {error}</div>}
        
        {!loading && !error && assessment && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold">Confidence Score:</div>
              <div className="text-2xl text-indigo-600 font-mono">{(assessment.confidence_score * 100).toFixed(1)}%</div>
            </div>
            
            <div>
              <h2 className="text-xl font-bold border-b pb-2 mb-3">Executive Summary</h2>
              <p className="text-gray-800">{assessment.assessment_summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-red-50 p-4 rounded border border-red-100">
                <h3 className="font-bold text-red-800 mb-2">Risk Factors</h3>
                <ul className="list-disc pl-5 space-y-1 text-red-700 text-sm">
                  {assessment.risk_factors?.map((risk: string, i: number) => <li key={i}>{risk}</li>)}
                </ul>
              </div>
              <div className="bg-green-50 p-4 rounded border border-green-100">
                <h3 className="font-bold text-green-800 mb-2">Recommendations</h3>
                <ul className="list-disc pl-5 space-y-1 text-green-700 text-sm">
                  {assessment.recommendations?.map((rec: string, i: number) => <li key={i}>{rec}</li>)}
                </ul>
              </div>
            </div>

            <div className="mt-6 bg-gray-50 p-4 rounded border">
              <h3 className="font-bold text-gray-700 mb-2">Evidence Citations (No Hallucinations)</h3>
              <div className="flex flex-wrap gap-2">
                {assessment.evidence_citations?.map((id: string, i: number) => (
                  <span key={i} className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded font-mono">
                    {id}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {!loading && !error && !assessment && (
          <div className="text-gray-500">No assessment available. Ensure validation is complete first.</div>
        )}
      </div>
    </div>
  );
}