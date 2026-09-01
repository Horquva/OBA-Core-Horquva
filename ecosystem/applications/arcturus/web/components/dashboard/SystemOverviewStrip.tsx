"use client";

import { useSystemHealth } from "../../hooks/useDashboardData";
import ServiceTile from "../ui/ServiceTile";
import { Loader2 } from "lucide-react";

export default function SystemOverviewStrip() {
  const { data, loading } = useSystemHealth();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading system status...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {data.components.map(comp => (
        <ServiceTile key={comp.id} component={comp} />
      ))}
    </div>
  );
}
