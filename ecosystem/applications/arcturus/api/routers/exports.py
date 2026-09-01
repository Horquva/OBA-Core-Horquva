"""
Arcturus Digital Twin Platform — Simulation Data Export & Audit Engine
Provides CSV, JSON, and compliance audit trail exports for simulation runs.
"""

from __future__ import annotations

import csv
import io
import json
import sqlite3
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse

from ecosystem.applications.arcturus.api.config import Settings
from ecosystem.applications.arcturus.api.database import get_db_connection

router = APIRouter(prefix="/api/v1/exports", tags=["Exports & Audits"])
settings = Settings()


def get_db():
    with get_db_connection(settings.db_path) as conn:
        yield conn


@router.get("/runs/{run_id}/json")
def export_run_json(run_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Export complete simulation run package as a unified structured JSON archive."""
    run = db.execute("SELECT * FROM simulation_runs WHERE run_id = ?", (run_id,)).fetchone()
    if not run:
        raise HTTPException(status_code=404, detail="Simulation run not found")

    experiment = db.execute("SELECT * FROM experiments WHERE id = ?", (run["experiment_id"],)).fetchone()
    events = db.execute("SELECT * FROM simulation_events WHERE run_id = ? ORDER BY tick ASC", (run_id,)).fetchall()
    checkpoints = db.execute("SELECT checkpoint_id, tick, state_snapshot, created_at FROM checkpoints WHERE run_id = ? ORDER BY tick ASC", (run_id,)).fetchall()
    artifacts = db.execute("SELECT * FROM synthetic_artifacts WHERE run_id = ?", (run_id,)).fetchall()
    insights = db.execute("SELECT * FROM intelligence_insights WHERE run_id = ? ORDER BY tick ASC", (run_id,)).fetchall()
    validation = db.execute("SELECT * FROM validation_results WHERE run_id = ?", (run_id,)).fetchone()

    payload = {
        "export_metadata": {
            "platform": "Arcturus Digital Twin Simulator",
            "version": "1.0.0",
            "run_id": run_id,
            "experiment_id": run["experiment_id"],
        },
        "experiment": dict(experiment) if experiment else None,
        "run": dict(run),
        "validation_verdict": dict(validation) if validation else None,
        "events_count": len(events),
        "events": [
            {
                "event_id": e["event_id"],
                "tick": e["tick"],
                "type": e["event_type"],
                "affected_entities": json.loads(e["affected_entities"]) if e["affected_entities"] else {},
                "state_changes": json.loads(e["observed_state_changes"]) if e["observed_state_changes"] else {},
            }
            for e in events
        ],
        "insights": [
            {
                "insight_id": ins["insight_id"],
                "tick": ins["tick"],
                "type": ins["insight_type"],
                "content": ins["content"],
                "confidence": ins["confidence"],
                "recommendations": json.loads(ins["recommendations"]) if ins["recommendations"] else [],
                "risk_factors": json.loads(ins["risk_factors"]) if ins["risk_factors"] else [],
            }
            for ins in insights
        ],
        "checkpoints_summary": [
            {
                "checkpoint_id": cp["checkpoint_id"],
                "tick": cp["tick"],
                "timestamp": cp["created_at"],
            }
            for cp in checkpoints
        ],
        "artifacts_count": len(artifacts),
    }

    return payload


@router.get("/runs/{run_id}/csv")
def export_run_csv(run_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Export time-series tick telemetry and KPIs as a CSV spreadsheet."""
    checkpoints = db.execute(
        "SELECT tick, state_snapshot, created_at FROM checkpoints WHERE run_id = ? ORDER BY tick ASC",
        (run_id,)
    ).fetchall()

    checkpoint_entries = []
    if checkpoints:
        for cp in checkpoints:
            state_dict = json.loads(cp["state_snapshot"]) if cp["state_snapshot"] else {}
            checkpoint_entries.append((cp["tick"], cp["created_at"], state_dict))
    else:
        # Fallback to filesystem checkpoint directory
        print(f"[FALLBACK TRIGGERED] Checkpoint Export (run_id={run_id}): No DB checkpoints found. Diverting to filesystem checkpoints directory scan.", flush=True)
        checkpoint_dir = settings.db_path.parent / "checkpoints"
        files = sorted(checkpoint_dir.glob(f"{run_id}__*.json"))
        for f in files:
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                tick = int(data.get("clock_step", 0))
                ts = data.get("last_step_at", "")
                checkpoint_entries.append((tick, ts, data))
            except Exception:
                continue

    if not checkpoint_entries:
        raise HTTPException(status_code=404, detail="No checkpoints recorded for this simulation run")

    output = io.StringIO()
    writer = csv.writer(output)

    # Write CSV Header
    writer.writerow([
        "Tick",
        "Timestamp",
        "Throughput",
        "Budget_Burn_Rate",
        "Avg_Latency_MS",
        "Error_Rate",
        "Customer_Satisfaction",
        "Active_Agents",
        "Completed_Tasks",
        "Queued_Tasks",
    ])

    for tick, ts, state_dict in checkpoint_entries:
        world_state = state_dict.get("world_state", {})
        kpis = world_state.get("kpis", {})

        throughput = kpis.get("throughput", 0)
        burn_rate = kpis.get("budget_burn_rate", 0.0)
        latency = kpis.get("avg_latency_ms", 0.0)
        error_rate = kpis.get("error_rate", 0.0)
        satisfaction = kpis.get("customer_satisfaction", 1.0)

        agents = world_state.get("agents", {})
        active_agents = sum(1 for a in agents.values() if a.get("status") in ("working", "active"))

        task_queue = world_state.get("task_queue", {})
        completed = sum(1 for t in task_queue.values() if t.get("status") == "completed")
        queued = sum(1 for t in task_queue.values() if t.get("status") == "queued")

        writer.writerow([
            tick,
            ts,
            throughput,
            burn_rate,
            latency,
            error_rate,
            satisfaction,
            active_agents,
            completed,
            queued,
        ])


    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=arcturus_run_{run_id[:8]}_telemetry.csv"},
    )
