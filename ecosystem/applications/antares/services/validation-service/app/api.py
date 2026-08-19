"""
Capability Validation Platform — HTTP Service Interface
Roadmap Reference: PART-5 — Service interfaces other platforms can use

This exposes CapabilityValidationService over HTTP so other Antares
platforms (e.g. Ammara's Enterprise Validation, Abbas's Integration &
Ecosystem platform) can call it as an independent service rather than
importing this repo's Python module directly. The in-process
CapabilityValidationService class remains the source of truth — this
module is a thin transport layer around it, no logic lives here.
"""

from __future__ import annotations

from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.models.capability import Capability, EvidenceReference, ReadinessLevel
from app.services.validation_service import CapabilityValidationService

app = FastAPI(
    title="Antares Capability Validation Service",
    description="Zara Fatima's Capability Validation Platform — validation only, "
                 "not discovery, not enterprise approval, not operationalization.",
    version="1.0.0",
)

_service = CapabilityValidationService()


# ---- Request/response schemas -------------------------------------------

class EvidenceIn(BaseModel):
    evidence_id: str
    source: str
    description: str
    url_or_locator: Optional[str] = None


class CapabilityIn(BaseModel):
    capability_name: str = ""
    description: str = ""
    organizational_problem: str = ""
    target_organization: str = ""
    expected_value: str = ""
    expected_outcome: str = ""
    source_platform: str = ""
    submitted_by: str = ""
    dependencies: list[str] = []
    risks: list[str] = []
    evidence_references: list[EvidenceIn] = []
    initial_readiness: ReadinessLevel = ReadinessLevel.EARLY_SIGNAL
    constitutional_notes: Optional[str] = None
    oba_compatibility_notes: Optional[str] = None


class RevisionIn(BaseModel):
    updated_fields: dict


# ---- Endpoints ------------------------------------------------------------

@app.post("/capabilities", status_code=201)
def submit_capability(payload: CapabilityIn) -> dict:
    """Capability submission endpoint."""
    capability = Capability(
        capability_name=payload.capability_name,
        description=payload.description,
        organizational_problem=payload.organizational_problem,
        target_organization=payload.target_organization,
        expected_value=payload.expected_value,
        expected_outcome=payload.expected_outcome,
        source_platform=payload.source_platform,
        submitted_by=payload.submitted_by,
        dependencies=payload.dependencies,
        risks=payload.risks,
        evidence_references=[
            EvidenceReference(**ev.model_dump()) for ev in payload.evidence_references
        ],
        initial_readiness=payload.initial_readiness,
        constitutional_notes=payload.constitutional_notes,
        oba_compatibility_notes=payload.oba_compatibility_notes,
    )
    return _service.submit_capability(capability)


@app.post("/capabilities/{capability_id}/validate")
def initiate_validation(capability_id: str) -> dict:
    """Validation initiation endpoint — runs assessment + decision."""
    try:
        result = _service.initiate_validation(capability_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return result.to_dict()


@app.get("/capabilities/{capability_id}/assessment")
def get_assessment(capability_id: str) -> dict:
    """Assessment retrieval endpoint — full explainable trace."""
    try:
        result = _service.get_assessment(capability_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return result.to_dict()


@app.get("/capabilities/{capability_id}/status")
def get_status(capability_id: str) -> dict:
    """Validation status endpoint."""
    try:
        state = _service.get_status(capability_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"capability_id": capability_id, "state": state.value}


@app.get("/capabilities/{capability_id}/history")
def get_validation_history(capability_id: str) -> dict:
    """Validation history endpoint — traceable across revisions."""
    return {
        "capability_id": capability_id,
        "history": _service.get_validation_history(capability_id),
    }


@app.post("/capabilities/{capability_id}/evidence")
def submit_evidence(capability_id: str, payload: EvidenceIn) -> dict:
    """Evidence submission endpoint."""
    try:
        return _service.submit_evidence(
            capability_id, EvidenceReference(**payload.model_dump())
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/capabilities/{capability_id}/revise")
def request_revision(capability_id: str, payload: RevisionIn) -> dict:
    """Revision workflow endpoint."""
    try:
        return _service.request_revision(capability_id, payload.updated_fields)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/capabilities/{capability_id}/report")
def get_validation_report(capability_id: str) -> dict:
    """Human-readable validation report endpoint."""
    try:
        return _service.get_validation_report(capability_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "capability-validation"}
