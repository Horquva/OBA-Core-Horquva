"use client";

import SectionHeader from "../../components/ui/SectionHeader";
import StatusDot from "../../components/ui/StatusDot";
import { GitMerge, Play, CheckCircle2, Clock } from "lucide-react";
import { useSimulationStream } from "../../hooks/useSimulationStream";
import { dashboardApi } from "../../lib/api-client";
import { useState, useEffect } from "react";

export default function WorkflowsPage() {
  const [activeExpId, setActiveExpId] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi.getActiveSimulation().then(data => {
      if (data?.experiment_id) {
        setActiveExpId(data.experiment_id);
      }
    });
  }, []);

  const { worldState } = useSimulationStream(activeExpId);
  const liveTasks = worldState?.task_queue ? Object.values(worldState.task_queue) : null;
  
  const displayTasks = liveTasks || [
    { task_id: "wf-101", name: "Enterprise Order Fulfillment", complexity: 0.8, status: "completed", required_role: "Supply Chain Team" },
    { task_id: "wf-102", name: "Financial Settlement & Reconciliation", complexity: 1.2, status: "in_progress", required_role: "Finance Twin Subsystem" },
    { task_id: "wf-103", name: "Disaster Recovery Failover Simulation", complexity: 0.5, status: "completed", required_role: "DevOps Operations" },
  ];

  return (
    <div className="space-y-8 pb-12">
      <SectionHeader
        title="Workflow Orchestration"
        description="View and execute business process Directed Acyclic Graphs (DAGs) across simulation engines."
        action={
          <button className="bg-[var(--brand-primary)] text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition font-medium text-sm shadow-sm flex items-center gap-2">
            <GitMerge className="w-4 h-4" /> Create Workflow DAG
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayTasks.map((wf: any) => (
          <div key={wf.task_id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{wf.task_id}</span>
                <h3 className="text-base font-bold text-slate-800 mt-1 truncate max-w-[200px]" title={wf.name}>{wf.name}</h3>
              </div>
              <StatusDot status={wf.status === "in_progress" ? "info" : wf.status === "completed" ? "success" : "neutral"} animate={wf.status === "in_progress"} />
            </div>
            <div className="text-xs text-slate-500 flex justify-between pt-2 border-t border-slate-100">
              <span>Required Role: <b>{wf.required_role}</b></span>
              <span>Complexity: <b>{wf.complexity}</b></span>
            </div>
            <div className="text-xs text-slate-500 flex justify-between">
              <span>Progress: <b>{Math.round((wf.progress || 0) * 100)}%</b></span>
              <span>Status: <b className="uppercase">{wf.status}</b></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
