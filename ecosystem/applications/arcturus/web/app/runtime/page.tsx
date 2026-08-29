"use client";
import { useState } from 'react';
import { useSimulationStream } from '../../hooks/useSimulationStream';

export default function RuntimePage() {
  const [experimentId, setExperimentId] = useState('exp-test-001');
  const { events, currentTick, status } = useSimulationStream(experimentId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow border">
        <div>
          <h1 className="text-3xl font-bold">Runtime Monitor</h1>
          <p className="text-gray-500 mt-1">Live Simulation Stream</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500 font-medium uppercase">Simulation Clock</div>
          <div className="text-4xl font-mono text-blue-600 font-bold">TICK {currentTick}</div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-xl font-bold mb-4">System Status: {status}</h2>
      </div>
    </div>
  );
}