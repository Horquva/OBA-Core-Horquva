'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import type { StructuredAssessment } from '@/lib/types';
import Card from '../../components/ui/Card';

function IntelligenceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialExpId = searchParams.get('experimentId') || searchParams.get('id') || '';

  const [experiments, setExperiments] = useState<any[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<string>(initialExpId);
  const [assessment, setAssessment] = useState<any | null>(null);
  const [assessmentStatus, setAssessmentStatus] = useState<string | null>(null);
  const [recentInsights, setRecentInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch available experiments and recent insights
  useEffect(() => {
    apiClient.get<any[]>('/api/v1/experiments')
      .then((data) => {
        const list = data || [];
        setExperiments(list);
        if (!selectedExpId && list.length > 0) {
          setSelectedExpId(list[0].id);
        }
      })
      .catch(() => setExperiments([]));

    apiClient.get<any[]>('/api/v1/intelligence/insights')
      .then((data) => setRecentInsights(data || []))
      .catch(() => setRecentInsights([]));
  }, []);

  // 2. Sync selectedExpId with URL parameter if provided
  useEffect(() => {
    if (initialExpId) {
      setSelectedExpId(initialExpId);
    }
  }, [initialExpId]);

  // 3. Fetch Assessment when selectedExpId changes
  useEffect(() => {
    if (!selectedExpId) return;

    async function fetchAssessment() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<any>(
          `/api/v1/intelligence/assessment/${selectedExpId}`
        );
        const status = data?.status || 'NO_TRUSTED_EVIDENCE';
        setAssessmentStatus(status);
        if (status === 'READY' && data?.assessment) {
          setAssessment(data.assessment);
        } else {
          setAssessment(null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch intelligence assessment.');
        setAssessment(null);
        setAssessmentStatus('ERROR');
      } finally {
        setLoading(false);
      }
    }

    fetchAssessment();
  }, [selectedExpId]);

  const handleSelectExperiment = (id: string) => {
    setSelectedExpId(id);
    router.replace(`/intelligence?experimentId=${id}`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* Header & Experiment Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Arcturus AI Strategic Reasoning</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Simulation Intelligence & Assessment</h1>
          <p className="mt-1 text-sm text-slate-600">Gemini LLM post-simulation strategic assessment, risk evaluation, and evidence citations.</p>
        </div>

        {/* Interactive Experiment Dropdown */}
        <div className="flex items-center gap-3">
          <label htmlFor="exp-select" className="text-xs font-semibold text-slate-700 whitespace-nowrap">
            Select Run:
          </label>
          <select
            id="exp-select"
            value={selectedExpId}
            onChange={(e) => handleSelectExperiment(e.target.value)}
            className="text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name} ({exp.id.slice(0, 8)}... - Seed: {exp.seed})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm font-medium text-slate-600">Analyzing simulation evidence with Gemini AI...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <h3 className="font-semibold text-base">Unable to load intelligence assessment</h3>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Empty / Unvalidated State */}
      {!loading && !error && !assessment && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            🧠
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {assessmentStatus === 'UNAVAILABLE' 
                ? 'AI Intelligence Service Unavailable' 
                : 'No Validated Assessment Generated Yet'}
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              {assessmentStatus === 'UNAVAILABLE'
                ? 'Gemini API key is unconfigured or rate limited. Verify GEMINI_API_KEY in ecosystem/applications/arcturus/.env.'
                : 'Strategic AI evaluations are compiled once a simulation finishes and validates its synthetic evidence corpus.'}
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href={`/runtime?experimentId=${selectedExpId}`}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 shadow-sm"
            >
              Start / Monitor Simulation
            </Link>
            <Link
              href={`/evidence?experimentId=${selectedExpId}`}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 border border-slate-200"
            >
              Inspect Evidence
            </Link>
          </div>
        </div>
      )}

      {/* Main Assessment Content */}
      {!loading && assessment && (
        <div className="space-y-6">
          {/* Executive Verdict Banner */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-indigo-300 font-bold">Executive Strategic Analysis</span>
              <h2 className="text-xl font-bold mt-1 text-white">
                {assessment.verdict || 'STRATEGICALLY VALIDATED'}
              </h2>
              <p className="text-xs text-indigo-200 mt-1 font-mono">
                Experiment ID: {selectedExpId}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-indigo-300 uppercase tracking-wider block">AI Confidence Score</span>
              <span className="text-3xl font-extrabold text-emerald-400">
                {Math.round((assessment.confidence_score ?? 0.85) * 100)}%
              </span>
            </div>
          </div>

          {/* Assessment Summary / Narrative */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>📖</span> Executive Assessment Summary
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 font-normal">
              {assessment.assessment_summary || assessment.reasoning || 'Simulation executed successfully across configured time ticks.'}
            </p>
          </div>

          {/* Risk Factors & Recommendations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Risk Factors */}
            <div className="bg-white p-6 rounded-xl border border-rose-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-rose-100 pb-3">
                <span className="text-rose-500 font-bold text-lg">⚠️</span>
                <h3 className="text-base font-bold text-slate-900">Identified Risk Factors</h3>
              </div>
              {assessment.risk_factors && assessment.risk_factors.length > 0 ? (
                <ul className="space-y-2">
                  {assessment.risk_factors.map((risk: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 p-2.5 rounded-lg bg-rose-50/60 border border-rose-100">
                      <span className="text-rose-600 font-bold text-xs mt-0.5">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 italic">No critical anomalies or bottlenecks detected.</p>
              )}
            </div>

            {/* Recommendations */}
            <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-emerald-100 pb-3">
                <span className="text-emerald-500 font-bold text-lg">💡</span>
                <h3 className="text-base font-bold text-slate-900">Actionable Recommendations</h3>
              </div>
              {assessment.recommendations && assessment.recommendations.length > 0 ? (
                <ul className="space-y-2">
                  {assessment.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                      <span className="text-emerald-600 font-bold text-xs mt-0.5">✓</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 italic">Standard operational parameters maintained.</p>
              )}
            </div>
          </div>

          {/* Evidence Citations */}
          {assessment.evidence_citations && assessment.evidence_citations.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">
                Verified Evidence Citations (Grounding)
              </h3>
              <div className="flex flex-wrap gap-2">
                {assessment.evidence_citations.map((cite: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-mono rounded-md border border-slate-200">
                    📎 {cite}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real-time Insights Stream (Bottom section) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Real-Time Simulation Intelligence Stream</h2>
            <p className="text-xs text-slate-500">Live tick-by-tick tactical insights emitted by the runtime engine.</p>
          </div>
          <Link href="/runtime" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            Open Runtime Monitor &rarr;
          </Link>
        </div>

        {recentInsights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {recentInsights.map((ins: any) => (
              <div key={ins.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    {ins.type}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Confidence: {Math.round((ins.confidence || 0.9) * 100)}%
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{ins.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-slate-500">
            No simulation intelligence events logged yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default function IntelligencePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Intelligence...</div>}>
      <IntelligenceContent />
    </Suspense>
  );
}
