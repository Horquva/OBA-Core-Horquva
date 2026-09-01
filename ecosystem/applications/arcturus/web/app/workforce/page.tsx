"use client";

import SectionHeader from "../../components/ui/SectionHeader";
import StatusDot from "../../components/ui/StatusDot";
import { Users, Bot, Briefcase, Activity } from "lucide-react";
import { useSimulationStream } from "../../hooks/useSimulationStream";
import { dashboardApi } from "../../lib/api-client";
import { useState, useEffect } from "react";

export default function WorkforcePage() {
  const [activeExpId, setActiveExpId] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi.getActiveSimulation().then(data => {
      if (data?.experiment_id) {
        setActiveExpId(data.experiment_id);
      }
    });
  }, []);

  const { worldState } = useSimulationStream(activeExpId);
  // Fallback to demo agents if no live state
  const liveAgents = worldState?.agents ? Object.values(worldState.agents) : null;
  if (!liveAgents && typeof window !== 'undefined') {
    console.warn('[FALLBACK TRIGGERED] Workforce: No active simulation stream detected. Diverting to default demo agents payload.', { activeExpId });
  }
  const displayAgents = liveAgents || [
    { agent_id: "agt-001", name: "Financial Risk Agent", role_id: "Risk Analyst", status: "active", current_task_id: "Analyzing Q3 Cashflow Variance", output_quality: 0.98 },
    { agent_id: "agt-002", name: "Supply Chain Dispatcher", role_id: "Logistics Specialist", status: "active", current_task_id: "Optimizing Shipping Routes", output_quality: 0.95 },
    { agent_id: "agt-003", name: "Compliance Validator", role_id: "Audit Officer", status: "idle", current_task_id: "Awaiting Next Simulation Batch", output_quality: 0.99 },
    { agent_id: "agt-004", name: "Customer Demand Predictor", role_id: "Data Scientist", status: "active", current_task_id: "Running Monte Carlo Demand Models", output_quality: 0.92 },
  ];
  
  const totalAgents = worldState?.agents ? Object.keys(worldState.agents).length : 1024;
  const activeWorkloads = worldState?.task_queue 
    ? Object.values(worldState.task_queue).filter((t: any) => t.status === 'in_progress').length 
    : 856;
  const avgEfficiency = liveAgents && liveAgents.length > 0 
    ? (liveAgents.reduce((sum: number, a: any) => sum + a.output_quality, 0) / liveAgents.length) * 100 
    : 96.4;

  return (
    <div className="space-y-8 pb-12">
      <SectionHeader
        title="Synthetic Workforce"
        description="Monitor active AI agents and synthetic persona execution across simulation scenarios."
        action={
          <button className="bg-[var(--brand-primary)] text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition font-medium text-sm shadow-sm flex items-center gap-2">
            <Bot className="w-4 h-4" /> Provision Agent
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Users className="w-5 h-5" /></div>
          <div><div className="text-xs text-slate-500">Total Agents</div><div className="text-xl font-bold font-mono">{totalAgents}</div></div>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Activity className="w-5 h-5" /></div>
          <div><div className="text-xs text-slate-500">Active Workloads</div><div className="text-xl font-bold font-mono">{activeWorkloads}</div></div>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-lg"><Briefcase className="w-5 h-5" /></div>
          <div><div className="text-xs text-slate-500">Roles Configured</div><div className="text-xl font-bold font-mono">24</div></div>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><Bot className="w-5 h-5" /></div>
          <div><div className="text-xs text-slate-500">Avg Efficiency</div><div className="text-xl font-bold font-mono">{avgEfficiency.toFixed(1)}%</div></div>
        </div>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[var(--card-border)] bg-slate-50 dark:bg-slate-800/50 font-semibold text-sm text-slate-700">
          Active Workforce Registry
        </div>
        <div className="divide-y divide-[var(--card-border)]">
          {displayAgents.map((agt: any) => (
            <div key={agt.agent_id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <StatusDot status={agt.status === "working" ? "success" : agt.status === "active" ? "success" : "neutral"} animate={agt.status === "working" || agt.status === "active"} />
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">{agt.name}</h4>
                  <p className="text-xs text-slate-500">Role ID: {agt.role_id} • {agt.agent_id} • Status: {agt.status}</p>
                </div>
              </div>
              <div className="text-sm text-slate-600 font-medium">
                {agt.current_task_id ? 
                  (worldState?.task_queue?.[agt.current_task_id]?.name || agt.current_task_id) : 
                  "Idle"
                }
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-indigo-600">{Math.round(agt.output_quality * 100)}%</div>
                <div className="text-[10px] text-slate-400">Quality</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
