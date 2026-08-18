"""
HTTP service layer (roadmap Part-3 task 5, Part-6 task 1).

Run:  uvicorn fsi.api:app --reload --app-dir src

Endpoint names follow the roadmap. Before merging, reconcile them against the
locked Antares engineering conventions — the roadmap says naming must follow
the convention, and the convention document is the authority, not this file.
"""

from __future__ import annotations

import os
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from domains.research.domain.models import LifecycleState
from domains.research.domain.taxonomy import TaxonomyError
from domains.research.engines.ingestion import ValidationError
from domains.research.service import FutureSignalService

DB_PATH = os.environ.get("FSI_DB", "fsi.db")

app = FastAPI(
    title="Future-Signal Intelligence",
    version="0.1.0",
    description=(
        "Emerging organizational signal discovery, impact analysis and "
        "future-pattern intelligence for the Antares capability lifecycle."
    ),
)


def get_service() -> FutureSignalService:
    return FutureSignalService(DB_PATH)


# ---------------------------------------------------------------- schemas

class SignalIn(BaseModel):
    title: str = Field(min_length=8)
    description: str = Field(min_length=30)
    themes: list[str] = []
    dimensions: list[str] = []
    organizations: list[str] = []


class EvidenceIn(BaseModel):
    title: str
    excerpt: str
    source_name: str
    source_type: str
    source_url: str = ""
    published_at: str = ""
    observed_at: str = ""
    status: str = "UNVERIFIED"


class ImpactOverride(BaseModel):
    dimension: str
    direction: str
    severity: int = Field(ge=1, le=5)
    horizon_months: int = 18
    rationale: str = ""


class ImpactIn(BaseModel):
    overrides: list[ImpactOverride] = []


class ReviewIn(BaseModel):
    reviewer: str
    note: str = ""


# ------------------------------------------------------------ error handling

@app.exception_handler(ValidationError)
async def _validation_handler(_, exc: ValidationError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"error": "validation_error", "detail": str(exc)})


@app.exception_handler(TaxonomyError)
async def _taxonomy_handler(_, exc: TaxonomyError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"error": "taxonomy_error", "detail": str(exc)})


# ---------------------------------------------------------------- signals

@app.post("/signals", status_code=201)
def create_signal(body: SignalIn, actor: str = Query("api"),
                  svc: FutureSignalService = Depends(get_service)) -> dict[str, Any]:
    return svc.submit_signal(body.model_dump(), actor)


@app.get("/signals")
def list_signals(state: str | None = None, theme: str | None = None, q: str | None = None,
                 svc: FutureSignalService = Depends(get_service)) -> list[dict[str, Any]]:
    lifecycle = LifecycleState(state) if state else None
    return [
        {"id": s.id, "title": s.title, "state": s.state.value,
         "themes": s.themes, "dimensions": s.dimensions, "version": s.version}
        for s in svc.repo.list_signals(lifecycle, theme, q)
    ]


@app.get("/signals/{signal_id}")
def get_signal(signal_id: str, svc: FutureSignalService = Depends(get_service)) -> dict[str, Any]:
    signal = svc.repo.get_signal(signal_id)
    if not signal:
        raise HTTPException(404, f"Unknown signal '{signal_id}'")
    trajectory, detail = svc.trajectory.signal_trajectory(signal_id)
    return {
        "id": signal.id, "title": signal.title, "description": signal.description,
        "state": signal.state.value, "themes": signal.themes,
        "dimensions": signal.dimensions, "organizations": signal.organizations,
        "version": signal.version, "history": signal.history,
        "trajectory": {"value": trajectory.value, "detail": detail},
    }


@app.post("/signals/{signal_id}/evidence", status_code=201)
def add_evidence(signal_id: str, body: EvidenceIn, actor: str = Query("api"),
                 svc: FutureSignalService = Depends(get_service)) -> dict[str, Any]:
    return svc.add_evidence(signal_id, body.model_dump(), actor)


@app.get("/signals/{signal_id}/evidence")
def get_evidence(signal_id: str,
                 svc: FutureSignalService = Depends(get_service)) -> list[dict[str, Any]]:
    return [
        {"id": e.id, "title": e.title, "excerpt": e.excerpt, "status": e.status.value,
         "weight": e.weight, "observed_at": e.observed_at,
         "source": {"name": e.provenance.source_name, "type": e.provenance.source_type.value,
                    "url": e.provenance.source_url, "published_at": e.provenance.published_at}}
        for e in svc.repo.evidence_for(signal_id)
    ]


@app.post("/signals/{signal_id}/impact", status_code=201)
def analyze_impact(signal_id: str, body: ImpactIn, actor: str = Query("api"),
                   svc: FutureSignalService = Depends(get_service)) -> dict[str, Any]:
    return svc.analyze_impact(signal_id, [o.model_dump() for o in body.overrides], actor)


@app.get("/signals/{signal_id}/impact")
def get_impact(signal_id: str,
               svc: FutureSignalService = Depends(get_service)) -> dict[str, Any]:
    return svc.impact.impact_profile(signal_id)


@app.get("/signals/{signal_id}/relationships")
def get_relationships(signal_id: str,
                      svc: FutureSignalService = Depends(get_service)) -> list[dict[str, Any]]:
    return [
        {"id": r.id, "source": r.source_signal_id, "target": r.target_signal_id,
         "relation": r.relation, "strength": r.strength, "explanation": r.explanation}
        for r in svc.repo.relationships_for(signal_id)
    ]


@app.get("/signals/{signal_id}/contradictions")
def get_contradictions(signal_id: str,
                       svc: FutureSignalService = Depends(get_service)) -> list[dict[str, Any]]:
    return svc.contradictions.check_signal(signal_id)


# ---------------------------------------------------------------- patterns

@app.post("/intelligence/cycle")
def run_cycle(actor: str = Query("api"),
              svc: FutureSignalService = Depends(get_service)) -> dict[str, Any]:
    return svc.run_intelligence_cycle(actor)


@app.get("/patterns")
def list_patterns(svc: FutureSignalService = Depends(get_service)) -> list[dict[str, Any]]:
    return [
        {"id": p.id, "name": p.name, "theme": p.theme, "state": p.state.value,
         "confidence": p.confidence.value, "band": p.confidence.band,
         "trajectory": p.trajectory.value, "dimensions": p.dimensions,
         "contradiction_count": len(p.contradictions)}
        for p in svc.repo.list_patterns()
    ]


@app.get("/patterns/{pattern_id}")
def get_pattern(pattern_id: str,
                svc: FutureSignalService = Depends(get_service)) -> dict[str, Any]:
    pattern = svc.repo.get_pattern(pattern_id)
    if not pattern:
        raise HTTPException(404, f"Unknown pattern '{pattern_id}'")
    return svc.intelligence_contract(pattern_id)


@app.post("/patterns/{pattern_id}/confirm")
def confirm_pattern(pattern_id: str, body: ReviewIn,
                    svc: FutureSignalService = Depends(get_service)) -> dict[str, Any]:
    return svc.confirm_pattern(pattern_id, body.reviewer, body.note)


@app.post("/patterns/{pattern_id}/validate")
def validate_pattern(pattern_id: str, body: ReviewIn,
                     svc: FutureSignalService = Depends(get_service)) -> dict[str, Any]:
    artifact = svc.validate_pattern(pattern_id, body.reviewer, body.note)
    return {"artifact_id": artifact.id, "schema_version": artifact.schema_version,
            "payload": artifact.payload}


@app.get("/convergence")
def convergence(svc: FutureSignalService = Depends(get_service)) -> list[dict[str, Any]]:
    return svc.trajectory.convergence()


# ------------------------------------------------- downstream consumption

@app.get("/intelligence/artifacts")
def list_artifacts(svc: FutureSignalService = Depends(get_service)) -> list[dict[str, Any]]:
    return [
        {"id": a.id, "pattern_id": a.pattern_id, "schema_version": a.schema_version,
         "created_at": a.created_at}
        for a in svc.repo.list_artifacts()
    ]


@app.get("/intelligence/snapshot")
def snapshot(svc: FutureSignalService = Depends(get_service)) -> dict[str, Any]:
    """Feed for the Part-8 intelligence dashboard."""
    return svc.dashboard_snapshot()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "future-signal-intelligence"}
