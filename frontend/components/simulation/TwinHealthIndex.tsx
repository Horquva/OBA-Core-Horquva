"use client";

import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Agent } from "../../types";

interface TwinHealthIndexProps {
  agents?: Agent[];
  healthIndex?: number;
}

export function TwinHealthIndex({ agents = [], healthIndex = 0 }: TwinHealthIndexProps) {
  const score = healthIndex;

  // Derive trend by comparing full-owner agents vs a "stressed" baseline
  const criticalCount = agents.filter(
    a => !a.owner || !a.backup_owner
  ).length;
  const trend: "up" | "down" | "stable" =
    agents.length === 0
      ? "stable"
      : criticalCount === 0
      ? "up"
      : criticalCount > agents.length * 0.3
      ? "down"
      : "stable";

  const getHealthColor = () => {
    if (score >= 75) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const getHealthLabel = () => {
    if (score >= 75) return "Healthy";
    if (score >= 50) return "Degraded";
    return "Critical";
  };

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
      ? "text-red-400"
      : "text-[color:var(--text-secondary)]";

  const criticalAgents = agents.filter(
    a => !a.owner || !a.backup_owner
  ).length;

  return (
    <div
      className="rounded-xl border bg-[color:var(--bg-card)] p-5 backdrop-blur-md"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-500">
          Twin Health Index
        </h3>
        <Activity className={`h-5 w-5 ${getHealthColor()}`} />
      </div>

      <div className="flex items-end gap-3 mb-4">
        <span className={`text-4xl font-bold ${getHealthColor()}`}>
          {score}
        </span>
        <div className="mb-1 flex flex-col">
          <span className="text-sm text-[color:var(--text-tertiary)]">/ 100</span>
          <span className={`text-xs font-semibold ${getHealthColor()}`}>
            {getHealthLabel()}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 rounded-full mb-4 overflow-hidden"
        style={{ background: "var(--border-subtle)" }}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            score >= 75
              ? "bg-emerald-400"
              : score >= 50
              ? "bg-amber-400"
              : "bg-red-400"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>

      <div
        className="mt-3 flex items-center justify-between text-xs text-[color:var(--text-tertiary)] border-t pt-3"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-1.5">
          <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
          <span className={`font-semibold ${trendColor}`}>
            {trend.toUpperCase()}
          </span>
        </div>
        <span>
          {criticalAgents > 0
            ? `${criticalAgents} unprotected agent${criticalAgents !== 1 ? "s" : ""}`
            : `${agents.length} agents tracked`}
        </span>
      </div>
    </div>
  );
}
