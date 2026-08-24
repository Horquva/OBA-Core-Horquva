"use client";

import { CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";
import { Agent, AITool } from "../../types";

interface TwinSyncStatusProps {
  agents?: Agent[];
  tools?: AITool[];
}

export function TwinSyncStatus({ agents = [], tools = [] }: TwinSyncStatusProps) {
  const totalNodes = agents.length + tools.length;

  // Derive sync quality from completeness of ownership/documentation data
  const unownedAgents = agents.filter(a => !a.owner).length;
  const statusRatio = totalNodes > 0 ? unownedAgents / totalNodes : 0;

  const status: "Synchronized" | "Partially Synced" | "Out of Sync" =
    statusRatio === 0
      ? "Synchronized"
      : statusRatio < 0.2
      ? "Partially Synced"
      : "Out of Sync";

  const lagMs = totalNodes > 0 ? Math.max(8, Math.round(totalNodes * 0.4)) : 0;
  const lag = totalNodes === 0 ? "—" : `${lagMs}ms`;

  const StatusIcon =
    status === "Synchronized"
      ? CheckCircle2
      : status === "Partially Synced"
      ? RefreshCw
      : AlertCircle;

  const statusColor =
    status === "Synchronized"
      ? "text-emerald-400"
      : status === "Partially Synced"
      ? "text-amber-400"
      : "text-red-400";

  const rows: { label: string; value: string | number; highlight?: string }[] = [
    { label: "State", value: status, highlight: statusColor },
    { label: "Replication Lag", value: lag },
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
          Sync Status
        </h3>
        <StatusIcon
          className={`h-5 w-5 ${statusColor} ${
            status === "Partially Synced" ? "animate-spin" : ""
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
