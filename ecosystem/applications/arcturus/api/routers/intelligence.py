"""Day 5 — Owner: Ahmed Raza. Mounted at /api/v1/intelligence."""

from __future__ import annotations

import sqlite3
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ecosystem.applications.arcturus.api.config import Settings
from ecosystem.applications.arcturus.api.database import get_db_connection
from ecosystem.applications.arcturus.api.services.intelligence_service import (
    IntelligenceService, IntelligenceUnavailable,
)
from ecosystem.applications.arcturus.contracts.evaluation.intelligence_models import StructuredAssessment

router = APIRouter(prefix="/api/v1/intelligence", tags=["Intelligence"])
settings = Settings()


def get_db():
    with get_db_connection(settings.db_path) as conn:
        yield conn


def get_intelligence_service() -> IntelligenceService:
    return IntelligenceService(settings=settings)


class IntelligenceAssessmentResponse(BaseModel):
    """Tri-state, matching Saba's Blue/Green/Purple visual hierarchy task."""
    status: Literal["READY", "NO_TRUSTED_EVIDENCE", "UNAVAILABLE"]
    assessment: StructuredAssessment | None = None
    reason: str | None = None


@router.get("/{run_id}/assessment", response_model=IntelligenceAssessmentResponse)
def get_assessment(
    run_id: str,
    db: sqlite3.Connection = Depends(get_db),
    service: IntelligenceService = Depends(get_intelligence_service),
) -> IntelligenceAssessmentResponse:
    if not db.execute("SELECT 1 FROM simulation_runs WHERE run_id = ?", (run_id,)).fetchone():
        raise HTTPException(status_code=404, detail=f"No run found for run_id={run_id}")

    try:
        assessment = service.generate_assessment(run_id=run_id)
    except IntelligenceUnavailable as exc:
        return IntelligenceAssessmentResponse(status="UNAVAILABLE", reason=str(exc))

    if assessment is None:
        return IntelligenceAssessmentResponse(status="NO_TRUSTED_EVIDENCE")

    return IntelligenceAssessmentResponse(status="READY", assessment=assessment)