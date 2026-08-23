import sqlite3
import json
from typing import Any, Dict
from datetime import datetime

from ecosystem.applications.arcturus.contracts.experiment.base_models import (
    ExperimentRecord,
    ExperimentConfig,
    ExperimentStatus,
    SimulationRunRecord,
)

def row_to_experiment_record(row: sqlite3.Row) -> ExperimentRecord:
    """Map a raw SQLite Row to the strict Pydantic ExperimentRecord contract."""
    return ExperimentRecord(
        id=row["id"],
        name=row["name"],
        seed=row["seed"],
        config=ExperimentConfig(**json.loads(row["config"])),
        status=ExperimentStatus(row["status"]),
        created_at=datetime.fromisoformat(row["created_at"]) if row["created_at"] else datetime.now(),
        started_at=datetime.fromisoformat(row["started_at"]) if row["started_at"] else None,
        completed_at=datetime.fromisoformat(row["completed_at"]) if row["completed_at"] else None,
    )

def experiment_record_to_row(record: ExperimentRecord) -> tuple:
    """Flatten an ExperimentRecord into a SQLite INSERT-compatible tuple."""
    return (
        record.id,
        record.name,
        record.seed,
        record.config.model_dump_json(),
        record.status.value,
        record.created_at.isoformat(),
        record.started_at.isoformat() if record.started_at else None,
        record.completed_at.isoformat() if record.completed_at else None,
    )

def row_to_simulation_run_record(row: sqlite3.Row) -> SimulationRunRecord:
    pass

def simulation_run_record_to_row(record: SimulationRunRecord) -> tuple:
    pass
