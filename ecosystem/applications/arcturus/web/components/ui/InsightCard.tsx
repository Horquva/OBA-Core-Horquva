import { BrainCircuit, AlertTriangle, Lightbulb, Activity } from "lucide-react";
import type { Insight } from "../../lib/types";
import { formatDistanceToNow } from "date-fns";

export default function InsightCard({ insight }: { insight: Insight }) {
  const getIcon = () => {
    switch (insight.type) {
      case "optimization": return <Lightbulb className="w-4 h-4 text-amber-500" />;
      case "risk": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "anomaly": return <Activity className="w-4 h-4 text-purple-500" />;
      default: return <BrainCircuit className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-[var(--card-border)] hover:border-slate-300 transition-colors">
      <div className="flex gap-3">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1">
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 leading-relaxed">
            {insight.content}
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1">
              Confidence: <span className="font-medium text-slate-700 dark:text-slate-300">{Math.round(insight.confidence * 100)}%</span>
            </span>
            <span className="text-slate-400">
              {formatDistanceToNow(new Date(insight.timestamp), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
