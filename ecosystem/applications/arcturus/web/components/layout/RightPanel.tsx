import LiveSimulationPanel from "./LiveSimulationPanel";
import IntelligenceInsightsPanel from "./IntelligenceInsightsPanel";

export default function RightPanel() {
  return (
    <aside className="w-80 bg-[var(--card-bg)] border-l border-[var(--card-border)] flex flex-col h-full shrink-0 z-20 shadow-[-4px_0_15px_rgba(0,0,0,0.02)]">
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-8">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            Live Simulation
          </h3>
          <LiveSimulationPanel />
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
            Intelligence Insights
          </h3>
          <IntelligenceInsightsPanel />
        </div>
      </div>
    </aside>
  );
}
