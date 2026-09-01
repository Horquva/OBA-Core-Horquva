import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import Sparkline from "./Sparkline";
import type { KpiMetric } from "../../lib/types";

export default function KpiCard({ metric }: { metric: KpiMetric }) {
  const isUp = metric.trendDirection === "up";
  const isDown = metric.trendDirection === "down";
  
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-slate-500">{metric.label}</h3>
        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
          metric.status === 'success' ? 'bg-[var(--status-success-bg)] text-[var(--status-success)]' :
          metric.status === 'danger' ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger)]' :
          'bg-[var(--status-info-bg)] text-[var(--status-info)]'
        }`}>
          {isUp && <TrendingUp className="w-3 h-3" />}
          {isDown && <TrendingDown className="w-3 h-3" />}
          {!isUp && !isDown && <Minus className="w-3 h-3" />}
          {metric.trend}
        </span>
      </div>
      
      <div className="flex items-end justify-between">
        <div className="text-3xl font-bold font-heading text-slate-800 dark:text-slate-100">
          {metric.value}
        </div>
        <div className="w-24">
          <Sparkline 
            data={metric.sparkline} 
            color={metric.status === 'success' ? 'var(--status-success)' : metric.status === 'danger' ? 'var(--status-danger)' : 'var(--brand-primary)'} 
          />
        </div>
      </div>
    </div>
  );
}
