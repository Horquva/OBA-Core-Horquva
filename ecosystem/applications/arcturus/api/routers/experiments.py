from typing import List
import sqlite3
import json
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ecosystem.applications.arcturus.api.config import Settings
from ecosystem.applications.arcturus.api.database import get_db_connection
from ecosystem.applications.arcturus.contracts.experiment.base_models import (
    ExperimentRecord,
    ExperimentConfig,
    ExperimentStatus,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import ArcturusValidationError
from ecosystem.applications.arcturus.api.models.experiment import (
    row_to_experiment_record,
    experiment_record_to_row,
)

router = APIRouter(prefix="/api/v1/experiments", tags=["Experiments"])
settings = Settings()

class CreateExperimentRequest(BaseModel):
    name: str
    seed: int
    config: ExperimentConfig

class UpdateExperimentStatusRequest(BaseModel):
    status: ExperimentStatus

def get_db():
    with get_db_connection(settings.db_path) as conn:
        yield conn

@router.post("", response_model=ExperimentRecord, status_code=201)
def create_experiment(
    payload: CreateExperimentRequest,
    db: sqlite3.Connection = Depends(get_db)
):
    try:
        new_id = str(uuid4())
        record = ExperimentRecord(
            id=new_id,
            name=payload.name,
            seed=payload.seed,
            config=payload.config,
            status=ExperimentStatus.CREATED,
            created_at=datetime.now(timezone.utc),
        )
        
        row_data = experiment_record_to_row(record)
        db.execute(
            "INSERT INTO experiments (id, name, seed, config, status, created_at, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            row_data
        )
        db.commit()
        return record
    except sqlite3.Error as e:
        db.rollback()
        raise ArcturusValidationError(
            message=f"Database error during creation: {str(e)}",
            platform_source="Governance API"
        )

@router.get("", response_model=List[ExperimentRecord])
def list_experiments(db: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = db.execute("SELECT * FROM experiments ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [row_to_experiment_record(row) for row in rows]
    except sqlite3.Error as e:
        raise ArcturusValidationError(
            message=f"Database error during listing: {str(e)}",
            platform_source="Governance API"
        )

@router.get("/{experiment_id}", response_model=ExperimentRecord)
def get_experiment(experiment_id: str, db: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = db.execute("SELECT * FROM experiments WHERE id = ?", (experiment_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Experiment not found")
        return row_to_experiment_record(row)
    except sqlite3.Error as e:
        raise ArcturusValidationError(
            message=f"Database error during retrieval: {str(e)}",
            platform_source="Governance API"
        )

@router.patch("/{experiment_id}/status", response_model=ExperimentRecord)
def update_experiment_status(
    experiment_id: str,
    payload: UpdateExperimentStatusRequest,
    db: sqlite3.Connection = Depends(get_db)
):
    try:
        cursor = db.execute("SELECT * FROM experiments WHERE id = ?", (experiment_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Experiment not found")
        
        record = row_to_experiment_record(row)
        record.status = payload.status
        
        if payload.status == ExperimentStatus.RUNNING and not record.started_at:
            record.started_at = datetime.now(timezone.utc)
        elif payload.status in (ExperimentStatus.COMPLETED, ExperimentStatus.FAILED) and not record.completed_at:
            record.completed_at = datetime.now(timezone.utc)
            
        update_tuple = (
            record.status.value,
            record.started_at.isoformat() if record.started_at else None,
            record.completed_at.isoformat() if record.completed_at else None,
            experiment_id
        )
        
        db.execute(
            "UPDATE experiments SET status = ?, started_at = ?, completed_at = ? WHERE id = ?",
            update_tuple
        )
        db.commit()
        return record
    except sqlite3.Error as e:
        db.rollback()
        raise ArcturusValidationError(
            message=f"Database error during update: {str(e)}",
            platform_source="Governance API"
        )

@router.delete("/{experiment_id}", status_code=204)
def delete_experiment(experiment_id: str, db: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = db.execute("SELECT id FROM experiments WHERE id = ?", (experiment_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Experiment not found")
            
        db.execute("DELETE FROM experiments WHERE id = ?", (experiment_id,))
        db.commit()
        return None
    except sqlite3.Error as e:
        db.rollback()
        raise ArcturusValidationError(
            message=f"Database error during deletion: {str(e)}",
            platform_source="Governance API"
        )
