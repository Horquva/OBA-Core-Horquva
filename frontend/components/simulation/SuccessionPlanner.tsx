"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Play, ShieldAlert, User } from "lucide-react";
import { request, ApiError } from "../../lib/api";

/**
 * D-70 Succession Planner (Phase 1.6) — the front end of
 * POST /api/simulations/reassign.
 *
 * Until now the product could simulate DAMAGE (what if Ahmed leaves) but not
 * RECOVERY (reassign Ahmed's assets to Sara and see what it buys). This is
 * the recovery half: pick a departing employee and a successor, run the
 * sandboxed reassignment, and read the delta the succession buys
 * (healthDelta vs comparedToNoSuccessor.healthDelta) plus the successor's
 * residual risk (assetsWithoutBackup, assetsUndocumented,
 * successorConcentrationAfter, successorBecomesSpof).
 *
 * Nothing here mutates production state — the backend clones the roots
 * bundle; the mutation exists only inside the simulation.
 */

interface Employee {
  id: string;
  name: string;
  role?: string | null;
  department?: string | null;
}

interface ReassignResponse {
  scenario: string;
  severity: string;
  healthDelta: number | null;
  comparedToNoSuccessor: {
    healthDelta: number | null;
    severity: string | null;
  };
  residualRisk: {
    assetsWithoutBackup: number;
    assetsUndocumented: number;
    successorConcentrationAfter: number;
    successorBecomesSpof: boolean;
  };
  impactedAgents: { id: string; name: string }[];
  impactedWorkflows: { id: string; name: string }[];
  successorName: string;
  targetName: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-400",
  HIGH: "text-orange-400",
  MODERATE: "text-amber-400",
  LOW: "text-emerald-400",
};

export function SuccessionPlanner() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [successorId, setSuccessorId] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReassignResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    request<Employee[]>("/api/employees")
      .then((rows) => {
        const list = Array.isArray(rows) ? rows.filter((e) => e && e.id && e.name) : [];
        setEmployees(list);
        if (list.length) setEmployeeId(list[0].id);
      })
      .catch(() => setLoadFailed(true));
  }, []);

  const run = async () => {
    if (!employeeId || !successorId || employeeId === successorId) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await request<ReassignResponse>("/api/simulations/reassign", {
        method: "POST",
        body: JSON.stringify({ employeeId, successorId }),
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.status} — ${err.message}` : "Simulation failed");
    } finally {
      setRunning(false);
    }
  };

  const buy = result && result.comparedToNoSuccessor.healthDelta != null && result.healthDelta != null
    ? result.comparedToNoSuccessor.healthDelta - result.healthDelta
    : null;

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
          <User size={16} className="text-[var(--accent)]" />
          D-70 Succession Planner
        </h3>
        <p className="text-xs text-[var(--text-secondary)]">
          Simulate a departure <em>with</em> a named successor taking over the assets — then compare
          against the leave-only scenario to see what the succession buys. Sandbox only; nothing changes.
        </p>
      </div>

      {loadFailed ? (
        <p className="text-xs text-[var(--text-tertiary)] italic">
          Employee directory unavailable — succession planning needs it to pick participants.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              Departing employee
              <select
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  if (e.target.value === successorId) setSuccessorId("");
                }}
                className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)]"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </label>
            <ArrowRight size={16} className="text-[var(--text-tertiary)] mb-2.5 hidden sm:block" />
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              Successor
              <select
                value={successorId}
                onChange={(e) => setSuccessorId(e.target.value)}
                className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)]"
              >
                <option value="">Pick a successor…</option>
                {employees.filter((e) => e.id !== employeeId).map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </label>
          </div>

          <button
            onClick={run}
            disabled={running || !employeeId || !successorId || employeeId === successorId}
            className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold bg-[var(--accent)] text-[var(--bg-base)] disabled:opacity-40 disabled:cursor-not-allowed w-fit"
          >
            {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
            Run succession simulation
          </button>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          {result && (
            <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-3">
              <p className="text-xs text-[var(--text-secondary)]">{result.scenario}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <div className={`text-lg font-bold ${SEVERITY_COLORS[result.severity] ?? "text-[var(--text-primary)]"}`}>
                    {result.severity}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Severity</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[var(--text-primary)]">
                    {result.healthDelta != null ? result.healthDelta.toFixed(1) : "—"}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Health Δ (reassign)</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[var(--text-primary)]">
                    {result.comparedToNoSuccessor.healthDelta != null ? result.comparedToNoSuccessor.healthDelta.toFixed(1) : "—"}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Health Δ (leave only)</div>
                </div>
                <div>
                  <div className={`text-lg font-bold ${buy != null && buy > 0 ? "text-emerald-400" : "text-[var(--text-tertiary)]"}`}>
                    {buy != null ? `+${buy.toFixed(1)}` : "—"}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Points the succession buys</div>
                </div>
              </div>

              <div className="text-xs text-[var(--text-secondary)] flex flex-col gap-1">
                <span>
                  Impacted: {result.impactedAgents?.length ?? 0} agent(s), {result.impactedWorkflows?.length ?? 0} workflow(s)
                </span>
                <span>
                  Successor residual risk ({result.successorName}):{" "}
                  {result.residualRisk.assetsWithoutBackup} asset(s) without backup ·{" "}
                  {result.residualRisk.assetsUndocumented} undocumented · concentration{" "}
                  {result.residualRisk.successorConcentrationAfter}
                </span>
                {result.residualRisk.successorBecomesSpof && (
                  <span className="inline-flex items-center gap-1.5 text-red-400 font-semibold">
                    <ShieldAlert size={13} />
                    Warning: the successor would become a single point of failure — consider splitting the assets.
                  </span>
                )}
                {!result.residualRisk.successorBecomesSpof && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 size={13} />
                    Successor does not become a SPOF.
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
