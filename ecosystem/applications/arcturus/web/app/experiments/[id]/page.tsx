"use client";
import { useParams } from 'next/navigation';
import { useSimulationStream } from '../../../hooks/useSimulationStream';
import Link from 'next/link';

export default function ExperimentDetailPage() {
  const params = useParams();
  const experimentId = params.id as string;
  const { currentTick, status } = useSimulationStream(experimentId);

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg shadow border">
      <h1 className="text-3xl font-bold mb-4">Experiment: {experimentId}</h1>
      <p>Status: <b>{status}</b> | Current Tick: <b>{currentTick}</b></p>
      <Link href="/runtime" className="text-blue-600 hover:underline mt-4 block">View Live Monitor</Link>
    </div>
  );
}