import StatusDot from "./StatusDot";
import type { SystemComponent } from "../../lib/types";

export default function ServiceTile({ component }: { component: SystemComponent }) {
  const isHealthy = component.status === "healthy";
  
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <StatusDot status={isHealthy ? 'success' : 'danger'} animate={isHealthy} />
        <div>
          <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">{component.name}</h4>
          <p className="text-xs text-slate-500">Uptime: {component.uptime}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{component.latency_ms}ms</div>
        <div className="text-xs text-slate-400">Latency</div>
      </div>
    </div>
  );
}
