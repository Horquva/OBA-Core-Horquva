'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSimulationStream } from '@/hooks/useSimulationStream';

function RuntimeContent() {
  const searchParams = useSearchParams();
  const experimentId = searchParams.get('experimentId') || searchParams.get('id') || 'exp-001';

  const { events, status, error, isPaused, connect, disconnect, togglePause, clearEvents } =
    useSimulationStream({ experimentId });

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Connected</span>;
      case 'reconnecting':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 animate-pulse">Reconnecting...</span>;
      case 'connecting':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Connecting</span>;
      case 'error':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">Error</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">Disconnected</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Runtime Telemetry</h1>
          <p className="text-sm text-slate-500 mt-0.5">Live event stream for experiment: <span className="font-mono text-indigo-600 font-semibold">{experimentId}</span></p>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <button
            onClick={togglePause}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
              isPaused ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {isPaused ? 'Resume Stream' : 'Pause Stream'}
          </button>
          <button
            onClick={clearEvents}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Clear
          </button>
          {status === 'disconnected' || status === 'error' ? (
            <button
              onClick={connect}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              Reconnect
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs shadow-inner h-[500px] flex flex-col">
        <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-800 text-slate-400">
          <span>EVENT BUFFER ({events.length}/100)</span>
          <span>{isPaused ? '⏸ STREAM PAUSED' : '⚡ LIVE STREAMING'}</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 font-mono">
          {events.length === 0 ? (
            <div className="text-slate-500 text-center py-20">No telemetry events received yet. Waiting for WebSocket handshake...</div>
          ) : (
            events.map((evt, idx) => (
              <div key={idx} className="p-2.5 rounded bg-slate-800/60 border border-slate-700/50 flex flex-col gap-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span className="text-indigo-400 font-semibold">{evt.type}</span>
                  <span>{evt.timestamp}</span>
                </div>
                <div className="text-slate-200 overflow-x-auto">
                  {typeof evt.payload === 'object' ? JSON.stringify(evt.payload, null, 2) : String(evt.payload)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function RuntimePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading runtime telemetry...</div>}>
      <RuntimeContent />
    </Suspense>
  );
}