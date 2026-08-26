"use client";

import { Play, Settings2, ShieldAlert, CheckCircle2, Loader2, AlertTriangle, User, Bot, Wrench, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Agent, Dependency, AITool } from "../../types";
import { ScenarioResult, mapScenario } from "../../lib/simulation";
import { authHeader } from "../../lib/authFetch";
import { PredictiveRiskEntry } from "../../lib/predictiveRisk";
import { getSPOFs } from "../../lib/graph";

interface Props {
  agents?: Agent[];
  dependencies?: Dependency[];
  tools?: AITool[];
  riskByAgentName?: Map<string, PredictiveRiskEntry>;
}

const TIER_WEIGHT: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

type ScenarioKey = "stress" | "node_outage" | "data_breach";

const SCENARIOS: { key: ScenarioKey; label: string; description: string; icon: React.ElementType }[] = [
  {
    key: "stress",
    label: "Stress Test",
    description: "Simulate your highest-risk knowledge holder departing.",
    icon: User,
  },
  {
    key: "node_outage",
    label: "Node Outage",
    description: "Fail the most critical AI agent and trace the cascade.",
    icon: Bot,
  },
  {
    key: "data_breach",
    label: "Data Breach Attempt",
    description: "Take the most-used tool offline and measure blast radius.",
    icon: Wrench,
  },
];

const RISK_COLORS: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-amber-400",
  low: "text-emerald-400",
};

export function ScenarioSandbox({ agents = [], dependencies = [], tools = [], riskByAgentName }: Props) {
  const [activeKey, setActiveKey] = useState<ScenarioKey>("stress");
  const [status, setStatus] = useState<"idle" | "executing" | "done">("idle");
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [showAll, setShowAll] = useState(false);

  const handleExecute = async () => {
    if (agents.length === 0) return;
    setStatus("executing");
    setResult(null);
    setShowAll(false);

    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    try {
      let res: ScenarioResult | null = null;

      if (activeKey === "stress") {
        // Pick the person who owns the most critical agents
        const ownerMap = new Map<string, number>();
        agents.forEach(a => {
          if (a.owner) {
            ownerMap.set(a.owner, (ownerMap.get(a.owner) ?? 0) + 1);
          }
        });
        const topPerson =
          [...ownerMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
          agents[0]?.owner ??
          "";
        if (topPerson) {
          const response = await fetch(`${base}/api/simulations/employee-leaves/${encodeURIComponent(topPerson)}`, { headers: authHeader() });
          if (response.ok) {
            res = mapScenario(await response.json());
          }
        }
      } else if (activeKey === "node_outage") {
        // Fail the highest-risk agent
        const spofs = getSPOFs(agents, dependencies).map(s => s.agentId);
        const ranked = [...agents].sort((a, b) => {
          const aTier = riskByAgentName?.get(a.name)?.threatLevel ?? "low";
          const bTier = riskByAgentName?.get(b.name)?.threatLevel ?? "low";
          const aScore = (spofs.includes(a.id) ? 100 : 0) + TIER_WEIGHT[aTier];
          const bScore = (spofs.includes(b.id) ? 100 : 0) + TIER_WEIGHT[bTier];
          return bScore - aScore;
        });
        if (ranked[0]) {
          const response = await fetch(`${base}/api/simulations/agent-fails/${encodeURIComponent(ranked[0].name)}`, { headers: authHeader() });
          if (response.ok) {
            res = mapScenario(await response.json());
          }
        }
      } else if (activeKey === "data_breach") {
        // Take the most-used critical tool offline
        const criticalTool =
          tools
            .filter(t => t.criticality === "critical" || t.criticality === "high")
            .sort((a, b) => (b.agents_using?.length ?? 0) - (a.agents_using?.length ?? 0))[0] ??
          tools[0];
        if (criticalTool) {
          const response = await fetch(`${base}/api/simulations/platform-down/${encodeURIComponent(criticalTool.name)}`, { headers: authHeader() });
          if (response.ok) {
            res = mapScenario(await response.json());
          }
        }
      }

      setResult(res);
      setStatus("done");
    } catch {
      setStatus("idle");
    }
  };

  const delta = result?.healthDelta ?? 0;
  const visibleImpacts = showAll
    ? result?.impactedAgents ?? []
    : (result?.impactedAgents ?? []).slice(0, 3);

  return (
    <div
      className="rounded-xl border bg-[color:var(--bg-card)] p-5 backdrop-blur-md flex flex-col gap-4"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-500">
          Scenario Sandbox
        </h3>
        <Settings2 className="h-5 w-5 text-[color:var(--text-tertiary)]" />
      </div>

      {/* Scenario picker */}
      <div className="space-y-2">
        {SCENARIOS.map(({ key, label, description, icon: Icon }) => (
          <button
            key={key}
            onClick={() => {
              setActiveKey(key);
              setStatus("idle");
              setResult(null);
            }}
            className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
              activeKey === key
                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-600 dark:text-cyan-300"
                : "text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)]"
            }`}
            style={activeKey !== key ? { borderColor: "var(--border-subtle)" } : {}}
          >
            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold leading-snug">{label}</p>
              <p className="text-[10px] text-[color:var(--text-tertiary)] leading-snug mt-0.5">
                {description}
              </p>
            </div>
            {activeKey === key && <ShieldAlert className="h-3.5 w-3.5 ml-auto mt-0.5 shrink-0" />}
          </button>
        ))}
      </div>

      {/* Execute button */}
      <button
        onClick={handleExecute}
        disabled={status === "executing" || agents.length === 0}
        className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
          agents.length === 0
            ? "bg-[color:var(--bg-elevated)] text-[color:var(--text-tertiary)] cursor-not-allowed"
            : status === "done"
            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
            : status === "executing"
            ? "bg-cyan-600/50 text-white cursor-not-allowed"
            : "bg-cyan-600 hover:bg-cyan-500 text-white"
        }`}
      >
        {status === "idle" && agents.length === 0 && "No data loaded"}
        {status === "idle" && agents.length > 0 && (
          <><Play className="h-4 w-4" fill="currentColor" /> EXECUTE SCENARIO</>
        )}
        {status === "executing" && (
          <><Loader2 className="h-4 w-4 animate-spin" /> SIMULATING…</>
        )}
        {status === "done" && (
          <><CheckCircle2 className="h-4 w-4" /> RE-RUN SCENARIO</>
        )}
      </button>

      {/* Results */}
      {status === "done" && result && (
        <div
          className="rounded-lg border p-3 space-y-3"
          style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
        >
          {/* Score delta */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-wide">Target</p>
              <p className="text-xs font-semibold text-[color:var(--text-primary)]">{result.targetName}</p>
              <p className="text-[10px] text-[color:var(--text-tertiary)]">{SCENARIOS.find(s => s.key === activeKey)?.label}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-wide">Health Impact</p>
              <p className={`text-lg font-bold ${delta > 0 ? "text-red-400" : "text-emerald-400"}`}>
                {delta > 0 ? "-" : delta < 0 ? "+" : ""}{Math.abs(delta)}
              </p>
              <p className="text-[10px] text-[color:var(--text-tertiary)]">
                {result.baselineHealthScore} → {result.simulatedHealthScore}
              </p>
            </div>
          </div>

          {/* Impacted agents */}
          {result.impactedAgents.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)] mb-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-orange-400" />
                {result.impactedAgents.length} Agent{result.impactedAgents.length !== 1 ? "s" : ""} Affected
              </p>
              <div className="space-y-1">
                {visibleImpacts.map((a, i) => (
                  <div
                    key={a.id || i}
                    className="flex justify-between items-start text-[11px] py-1 border-b last:border-0"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[color:var(--text-primary)] truncate">{a.name}</p>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <span className={`font-semibold ${RISK_COLORS[a.risk] ?? ""}`}>
                        {a.risk.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {result.impactedAgents.length > 3 && (
                <button
                  onClick={() => setShowAll(v => !v)}
                  className="mt-1 text-[10px] text-cyan-500 flex items-center gap-0.5 hover:underline"
                >
                  {showAll ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show {result.impactedAgents.length - 3} more</>}
                </button>
              )}
            </div>
          )}

          {result.impactedAgents.length === 0 && (
            <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> No agents impacted — org is resilient.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
