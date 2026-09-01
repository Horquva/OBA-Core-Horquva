"use client";
import { useParams } from 'next/navigation';
import { useSimulationStream } from '../../../hooks/useSimulationStream';
import Link from 'next/link';
import SectionHeader from '../../../components/ui/SectionHeader';
import ExperimentPerformanceChart from '../../../components/dashboard/ExperimentPerformanceChart';

export default function ExperimentDetailPage() {
  const params = useParams();
  const experimentId = params.id as string;
  const { currentTick, status } = useSimulationStream(experimentId);

  return (
    <div className="space-y-8 pb-12">
      <SectionHeader 
        title={`Experiment: ${experimentId.slice(0, 8)}`} 
        description={experimentId} 
        action={
          <Link href="/experiments" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            &larr; Back to List
          </Link>
        }
      />

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500 mb-1">Status</div>
          <div className="text-lg font-semibold font-mono text-[var(--brand-primary)] uppercase">{status}</div>
        </div>
        <div>
          <div className="text-sm text-slate-500 mb-1">Current Tick</div>
          <div className="text-lg font-semibold font-mono text-slate-800">{currentTick}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link 
          href={`/intelligence?experimentId=${experimentId}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          🧠 View Gemini Strategic Assessment & Recommendations
        </Link>
        <Link 
          href={`/evidence?experimentId=${experimentId}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold shadow-sm transition-colors"
        >
          📋 View Synthetic Evidence Corpus
        </Link>
      </div>

      <ExperimentPerformanceChart experimentId={experimentId} />
    </div>
  );
}