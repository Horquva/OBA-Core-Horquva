import json
import sqlite3
from pathlib import Path

from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    SyntheticArtifactContract
)
from ecosystem.applications.arcturus.contracts.evaluation.base_models import (
    ValidationResultContract
)

def save_synthetic_artifact(db_path: Path, run_id: str, artifact: SyntheticArtifactContract) -> None:
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(
            """
            INSERT INTO synthetic_artifacts 
            (artifact_id, run_id, artifact_type, content, metadata, lifecycle_state, provenance)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                artifact.artifact_id,
                run_id,
                artifact.artifact_type,
                json.dumps(artifact.content),
                json.dumps(artifact.metadata),
                artifact.lifecycle_state,
                json.dumps(artifact.provenance)
            )
        )
        conn.commit()
    finally:
        conn.close()

def save_validation_result(db_path: Path, result: ValidationResultContract, run_id: str | None = None) -> None:
    conn = sqlite3.connect(str(db_path))
    try:
        actual_run_id = str(run_id) if run_id else str(result.run_id)
        conn.execute(
            """
            INSERT INTO validation_results 
            (run_id, passed_rules, failed_rules, flagged_rules, final_status, reason, metrics)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                actual_run_id,
                json.dumps(result.passed_rules),
                json.dumps(result.failed_rules),
                json.dumps(result.flagged_rules),
                result.final_status,
                result.reason,
                "{}"
            )
        )
        conn.commit()
    finally:
        conn.close()
