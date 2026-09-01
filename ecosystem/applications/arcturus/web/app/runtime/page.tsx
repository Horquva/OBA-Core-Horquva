"use client";
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSimulationStream } from '../../hooks/useSimulationStream';
import { apiClient, experimentApi } from '../../lib/api-client';
import Link from 'next/link';

export default function RuntimePage() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('experimentId') || searchParams.get('id') || '';
  const [experiments, setExperiments] = useState<any[]>([]);
  const [experimentId, setExperimentId] = useState<string>(initialId);
  const [durationTicks, setDurationTicks] = useState<number>(50);
  const [tickSpeed, setTickSpeed] = useState<number>(0.2);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<any[]>('/api/v1/experiments')
      .then((data) => {
        const list = data || [];
        setExperiments(list);
        if (!experimentId && list.length > 0) {
          setExperimentId(list[0].id);
        }
      })
      .catch(() => setExperiments([]));
  }, []);

  const { events, currentTick, status, worldState, liveInsights } = useSimulationStream(experimentId);

  const handleStartSimulation = async () => {
    if (!experimentId) return;
    try {
      setIsRunning(true);
      setActionMessage("Starting simulation loop...");
      await experimentApi.startSimulation(experimentId, {
        global_seed: 42,
        duration_ticks: durationTicks,
        tick_delay_seconds: tickSpeed,
      });
      setActionMessage(`Simulation triggered for ${durationTicks} ticks!`);
    } catch (err: any) {
      setActionMessage(`Failed to start: ${err.message || 'Error'}`);
      setIsRunning(false);
    }
  };

  const handlePauseSimulation = async () => {
    if (!experimentId) return;
    try {
      await experimentApi.pauseSimulation(experimentId);
      setActionMessage("Simulation paused.");
    } catch (err: any) {
      setActionMessage(`Pause error: ${err.message}`);
    }
  };

  const handleResumeSimulation = async () => {
    if (!experimentId) return;
    try {
      await experimentApi.resumeSimulation(experimentId);
      setActionMessage("Simulation resumed.");
    } catch (err: any) {
      setActionMessage(`Resume error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Runtime Telemetry</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Live Simulation Monitor</h1>
          <p className="text-sm text-slate-500 mt-0.5">Control simulation execution and stream real-time ticks & agent telemetry.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="rt-select" className="text-xs font-semibold text-slate-700 whitespace-nowrap">Active Run:</label>
          <select
            id="rt-select"
            value={experimentId}
            onChange={(e) => setExperimentId(e.target.value)}
            className="text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none max-w-xs"
          >
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name} ({exp.id.slice(0, 8)}...)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Execution Control Strip */}
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase block">Ticks to Execute</span>
            <input
              type="number"
              min="5"
              max="500"
              value={durationTicks}
              onChange={(e) => setDurationTicks(Number(e.target.value))}
              className="mt-1 w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase block">Tick Speed</span>
            <select
              value={tickSpeed}
              onChange={(e) => setTickSpeed(Number(e.target.value))}
              className="mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={0.05}>Fast (50ms)</option>
              <option value={0.1}>Normal (100ms)</option>
              <option value={0.2}>Standard (200ms)</option>
              <option value={0.5}>Slow (500ms)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleStartSimulation}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow transition-all flex items-center gap-2"
          >
            <span>▶</span> Run Simulation
          </button>
          <button
            onClick={handlePauseSimulation}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg border border-slate-700 transition"
          >
            ⏸ Pause
          </button>
          <button
            onClick={handleResumeSimulation}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg border border-slate-700 transition"
          >
            ⏯ Resume
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs font-semibold rounded-lg">
          ⚡ {actionMessage}
        </div>
      )}

      {/* Clock & Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-400">Stream Connection</div>
          <div className={`text-lg font-bold mt-1 ${status === 'CONNECTED' ? 'text-emerald-600' : 'text-amber-600'}`}>
            {status}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-400">Simulation Clock</div>
          <div className="text-3xl font-mono font-bold text-indigo-600 mt-1">
            TICK {currentTick} <span className="text-xs text-slate-400 font-sans font-normal">/ {durationTicks}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-400">Active Agents</div>
          <div className="text-2xl font-mono font-bold text-slate-800 mt-1">
            {worldState?.active_headcount ?? worldState?.agents_count ?? 'Online'}
          </div>
        </div>
      </div>

      {/* Real-time Insights Feed */}
      {liveInsights.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-base font-bold text-slate-900">Live AI Reasoning Stream</h2>
          <div className="space-y-2">
            {liveInsights.map((ins, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700">
                <span className="font-semibold text-indigo-600 mr-2">[{ins.type?.toUpperCase() || 'INSIGHT'}]</span>
                {ins.content}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shortcuts */}
      <div className="flex justify-end gap-3 pt-2">
        <Link
          href={`/intelligence?experimentId=${experimentId}`}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 shadow-sm"
        >
          🧠 Open Gemini Assessment &rarr;
        </Link>
        <Link
          href={`/evidence?experimentId=${experimentId}`}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 shadow-sm"
        >
          📋 Open Synthetic Evidence &rarr;
        </Link>
      </div>
    </div>
  );
}