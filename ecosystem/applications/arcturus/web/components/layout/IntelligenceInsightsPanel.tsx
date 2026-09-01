"use client";

import { useState, useEffect } from "react";
import { useIntelligenceInsights } from "../../hooks/useDashboardData";
import { useSimulationStream } from "../../hooks/useSimulationStream";
import { dashboardApi } from "../../lib/api-client";
import InsightCard from "../ui/InsightCard";
import { Loader2, Sparkles } from "lucide-react";

export default function IntelligenceInsightsPanel() {
  const [activeExpId, setActiveExpId] = useState<string | null>(null);
  const { data: initialInsights, loading } = useIntelligenceInsights();

  useEffect(() => {
    dashboardApi.getActiveSimulation().then(data => {
      if (data?.experiment_id) {
        setActiveExpId(data.experiment_id);
      }
    });
  }, []);

  const { liveInsights } = useSimulationStream(activeExpId);

  // Merge live streaming insights on top of database insights
  const combinedInsights = [
    ...(liveInsights || []),
    ...(initialInsights || []).filter(
      init => !(liveInsights || []).some(live => live.id === init.id)
    )
  ];

  if (loading && combinedInsights.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  if (combinedInsights.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-[var(--card-border)] text-sm text-slate-500 text-center">
        No active insights generated
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {liveInsights && liveInsights.length > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
          <span>Live Gemini Intelligence Active</span>
        </div>
      )}
      {combinedInsights.map(insight => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}

