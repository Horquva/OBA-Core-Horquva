"use client";

import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Agent } from "../../types";
import { healthStatusTextClass, healthStatusBgClass, normalizeHealthStatus } from "../../lib/healthStatus";

interface TwinHealthIndexProps {
  agents?: Agent[];
  healthIndex?: number;
  healthStatus?: string | null;
}

export function TwinHealthIndex({ agents = [], healthIndex = 0, healthStatus = null }: TwinHealthIndexProps) {
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

  // Derived from the backend's own healthStatus (70/45, domain/derived.js's
  // orgHealth()) instead of a local 75/50 re-threshold of the same score.
  const getHealthColor = () => healthStatusTextClass(healthStatus);

  const getHealthLabel = () => {
    const status = normalizeHealthStatus(healthStatus);
    return status === 'STABLE' ? 'Healthy' : status === 'WARNING' ? 'Degraded' : 'Critical';
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
          className={`h-full rounded-full transition-all duration-700 ${healthStatusBgClass(healthStatus)}`}
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
