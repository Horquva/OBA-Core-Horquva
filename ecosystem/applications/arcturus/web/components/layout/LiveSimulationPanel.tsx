"use client";

import { Activity, Pause, Play, Square, Loader2 } from "lucide-react";
import ProgressBar from "../ui/ProgressBar";
import { useSimulationStream } from "../../hooks/useSimulationStream";
import { dashboardApi, experimentApi } from "../../lib/api-client";
import { useState, useEffect } from "react";

export default function LiveSimulationPanel() {
  const [activeExpId, setActiveExpId] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi.getActiveSimulation().then(data => {
      if (data?.experiment_id) {
        setActiveExpId(data.experiment_id);
      }
    });
  }, []);

  const { currentTick, status, worldState } = useSimulationStream(activeExpId);
  
  if (!activeExpId) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-[var(--card-border)] text-sm text-slate-500 text-center">
        No active simulation running
      </div>
    );
  }

  const isRunning = status === 'RUNNING';
  
  // Hardcoded for demo, normally from backend config
  const totalTicks = 100; 
  const progress = (currentTick / totalTicks) * 100;

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${isRunning ? 'text-[var(--brand-primary)] animate-pulse' : 'text-slate-400'}`} />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Run: {activeExpId.slice(0,8)}</span>
        </div>
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isRunning ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
          {status}
        </span>
      </div>
      
      <div className="p-4 space-y-4">
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Progress</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{Math.round(progress)}% ({currentTick}/{totalTicks})</span>
          </div>
          <ProgressBar progress={progress} color="var(--brand-primary)" />
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Budget Burn</div>
            <div className="font-mono text-sm">${worldState?.kpis?.budget_burn_rate?.toLocaleString() ?? 0} / tick</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Active Tasks</div>
            <div className="font-mono text-sm">{Object.values(worldState?.departments || {}).reduce((sum: number, d: any) => sum + (d.active_tasks || 0), 0)}</div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button 
            onClick={async () => {
              if (activeExpId) {
                if (isRunning) {
                  await experimentApi.pauseSimulation(activeExpId);
                } else {
                  await experimentApi.resumeSimulation(activeExpId);
                }
              }
            }}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-colors"
          >
            {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isRunning ? 'Pause' : 'Resume'}
          </button>
          <button 
            onClick={() => setActiveExpId(null)}
            className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <Square className="w-3 h-3" />
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}
