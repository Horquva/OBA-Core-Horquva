"use client";

import { useActiveExperiment } from "../../hooks/useDashboardData";
import { Play, Loader2 } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";
import ProgressBar from "../ui/ProgressBar";
import Link from "next/link";

export default function CurrentExperimentCard() {
  const { data, loading } = useActiveExperiment();

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 shadow-sm flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 shadow-sm flex flex-col items-center justify-center h-48 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
          <Play className="w-5 h-5 text-slate-400" />
        </div>
        <h3 className="text-sm font-medium text-slate-700">No Active Experiment</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">Start a new run to see real-time metrics.</p>
        <Link href="/experiments" className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-md hover:bg-indigo-100">
          Go to Experiments
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 shadow-sm">
      <SectionHeader 
        title="Active Experiment" 
        description={`Run ID: ${data.experiment_id}`}
        action={
          <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full uppercase">
            {data.status}
          </span>
        }
      />

      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-500">Overall Progress</span>
            <span className="font-medium text-slate-700">{Math.round((data.current_tick / 100) * 100)}%</span>
          </div>
          <ProgressBar progress={(data.current_tick / 100) * 100} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-[var(--card-border)]">
            <div className="text-xs text-slate-500 mb-1">Current Tick</div>
            <div className="text-xl font-bold font-mono">{data.current_tick}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-[var(--card-border)]">
            <div className="text-xs text-slate-500 mb-1">Agents Active</div>
            <div className="text-xl font-bold font-mono">1,024</div>
          </div>
        </div>
      </div>
    </div>
  );
}
