"""
api/routers/synthetic_data.py — Day 4, Synthetic Data Platform.
Owner: Ahmed Raza. Consumed by Umair's Evidence page (EvidenceTable.tsx).

Matches the get_db()/Settings()/ArcturusValidationError conventions
established in api/routers/experiments.py and runtime.py.

SCHEMA GAP (flagged to Hashim, not worked around): confirmed against
database_schema.sql — the synthetic_artifacts table has no lineage or
rejected_artifacts columns, despite its comment saying "with lineage".
SyntheticDataCorpus's own validator requires every accepted artifact to
have a matching lineage record, so returning that contract here with
lineage=[] would violate its own invariant. This router returns
SyntheticDataCorpusPreview instead, honestly labeled as provisional,
until lineage/rejected_artifacts persistence exists.
"""

from __future__ import annotations

import json
import sqlite3

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ecosystem.applications.arcturus.api.config import Settings
from ecosystem.applications.arcturus.api.database import get_db_connection
from ecosystem.applications.arcturus.contracts.shared.base_models import ArcturusValidationError
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    SyntheticArtifactContract,
)

router = APIRouter(prefix="/api/v1/synthetic-data", tags=["Synthetic Data"])
settings = Settings()
PLATFORM_SOURCE = "synthetic_data"


def get_db():
    with get_db_connection(settings.db_path) as conn:
        yield conn


class SyntheticDataCorpusPreview(BaseModel):
    """
    Provisional response — NOT SyntheticDataCorpus. That contract requires
    lineage to cover every accepted artifact, which this endpoint can't
    yet guarantee (no lineage table in database_schema.sql). Once Hashim
    adds lineage/rejected_artifacts tables, this endpoint should return
    the real, validated SyntheticDataCorpus instead.
    """

    run_id: str
    accepted_artifacts: list[SyntheticArtifactContract]
    lineage_available: bool = False
    rejected_artifacts_available: bool = False


@router.get("/{run_id}/corpus", response_model=SyntheticDataCorpusPreview)
def get_corpus(run_id: str, db: sqlite3.Connection = Depends(get_db)) -> SyntheticDataCorpusPreview:
    try:
        rows = db.execute(
            "SELECT artifact_id, artifact_type, content, metadata, "
            "lifecycle_state, provenance, created_at "
            "FROM synthetic_artifacts "
            "WHERE run_id = ? OR run_id IN (SELECT run_id FROM simulation_runs WHERE experiment_id = ?)",
            (run_id, run_id),
        ).fetchall()
    except sqlite3.Error as e:
        raise ArcturusValidationError(
            message=f"Database error retrieving corpus: {str(e)}",
            platform_source=PLATFORM_SOURCE,
        )

    if not rows:
        raise HTTPException(status_code=404, detail=f"No synthetic data found for run_id={run_id}")

    return SyntheticDataCorpusPreview(
        run_id=run_id,
        accepted_artifacts=[_row_to_artifact(row) for row in rows],
    )


evidence_router = APIRouter(prefix="/api/v1/evidence", tags=["Synthetic Evidence"])


@evidence_router.get("/{experiment_id}", response_model=SyntheticDataCorpusPreview)
def get_evidence(experiment_id: str, db: sqlite3.Connection = Depends(get_db)) -> SyntheticDataCorpusPreview:
    """Convenience alias for /api/v1/evidence/:experiment_id used by frontend"""
    try:
        return get_corpus(run_id=experiment_id, db=db)
    except HTTPException as exc:
        if exc.status_code == 404:
            return SyntheticDataCorpusPreview(
                run_id=experiment_id,
                accepted_artifacts=[],
            )
        raise


def _row_to_artifact(row: sqlite3.Row) -> SyntheticArtifactContract:
    """Column mapping confirmed against database_schema.sql — synthetic_artifacts table."""
    return SyntheticArtifactContract(
        artifact_id=row["artifact_id"],
        artifact_type=row["artifact_type"],
        content=json.loads(row["content"]) if row["content"] else {},
        metadata=json.loads(row["metadata"]) if row["metadata"] else {},
        lifecycle_state=row["lifecycle_state"],
        provenance=json.loads(row["provenance"]) if row["provenance"] else {"global_seed": 0},
        created_at=row["created_at"],
    )
