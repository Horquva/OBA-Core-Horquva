"use client";

import { CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";
import { Agent, AITool } from "../../types";

interface TwinSyncStatusProps {
  agents?: Agent[];
  tools?: AITool[];
}

export function TwinSyncStatus({ agents = [], tools = [] }: TwinSyncStatusProps) {
  const totalNodes = agents.length + tools.length;

  // This card previously framed itself as a live replication process --
  // "Synchronized"/"Out of Sync" states and a "Replication Lag" in ms with no
  // real basis (Math.max(8, round(totalNodes*0.4)), pure invention). There is
  // no async twin/replica in this architecture to have a lag: the brain graph
  // (M49, "Digital Twin") is recomputed synchronously from the same live data
  // on every request, so "synchronized" is always true by construction, never
  // a measured fact. What IS real here is ownership coverage, so that's what
  // this card now honestly shows instead of a fabricated sync metaphor.
  const unownedAgents = agents.filter(a => !a.owner).length;
  const coverageRatio = totalNodes > 0 ? unownedAgents / totalNodes : 0;

  const status: "Fully Owned" | "Partial Coverage" | "Coverage Gap" =
    coverageRatio === 0
      ? "Fully Owned"
      : coverageRatio < 0.2
      ? "Partial Coverage"
      : "Coverage Gap";

  const StatusIcon =
    status === "Fully Owned"
      ? CheckCircle2
      : status === "Partial Coverage"
      ? RefreshCw
      : AlertCircle;

  const statusColor =
    status === "Fully Owned"
      ? "text-emerald-400"
      : status === "Partial Coverage"
      ? "text-amber-400"
      : "text-red-400";

  const rows: { label: string; value: string | number; highlight?: string }[] = [
    { label: "Coverage Status", value: status, highlight: statusColor },
    { label: "Agents Monitored", value: agents.length },
    { label: "Tools Monitored", value: tools.length },
    {
      label: "Unowned Assets",
      value: unownedAgents,
      highlight: unownedAgents > 0 ? "text-red-400" : "text-emerald-400",
    },
  ];

  return (
    <div
      className="rounded-xl border bg-[color:var(--bg-card)] p-5 backdrop-blur-md"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-500">
          Ownership Coverage
        </h3>
        <StatusIcon
          className={`h-5 w-5 ${statusColor} ${
            status === "Partial Coverage" ? "animate-spin" : ""
          }`}
        />
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex justify-between items-center pb-2 ${
              i < rows.length - 1 ? "border-b" : ""
            }`}
            style={i < rows.length - 1 ? { borderColor: "var(--border-subtle)" } : {}}
          >
            <span className="text-sm text-[color:var(--text-tertiary)]">
              {row.label}
            </span>
            <span
              className={`text-sm font-medium ${
                row.highlight ?? "text-[color:var(--text-primary)]"
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
