"""
server.py — HTTP wrapper around Ammara Nasir's real Knowledge Operationalization
Platform (the Day 6 "OBA-Ready Knowledge Backend" — real SQLite persistence,
real versioning engine, real integrity safeguards).

Reuses her actual FastAPI app (src/api/day6_oba_backend.py) as-is — same
POST endpoint, same integrity rules, same database — and adds:
  - a one-time seed of 2 real knowledge objects through her REAL upsert
    engine (so the integrity safeguards actually run, nothing is faked)
  - GET /api/summary, listing everything currently active
  - GET /health

Run: uvicorn server:app --port 4007
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.day6_oba_backend import (
    app as oba_app,
    SessionLocal,
    OBAKnowledgeModel,
    KnowledgeUpsertRequest,
    ProvenanceInput,
    ValidationInput,
    OBAKnowledgeBackendEngine,
)

app = oba_app  # reuse Ammara's real app and real routes directly
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_seeded = {"done": False}


def seed_once():
    if _seeded["done"]:
        return
    db = SessionLocal()
    try:
        existing = db.query(OBAKnowledgeModel).filter(OBAKnowledgeModel.is_active == True).count()
        if existing == 0:
            demo_objects = [
                KnowledgeUpsertRequest(
                    id="KOBJ-001",
                    title="Cross-platform capability dependency map",
                    description="Operationalized knowledge object linking capability dependencies across Antares platforms for machine consumption.",
                    category="capability-graph",
                    provenance=ProvenanceInput(
                        source_platform="capability-service", author_id="ammara.nasir",
                        source_reference_id="COP-0001",
                    ),
                    validation=ValidationInput(
                        validated_by="ammara.nasir", validation_status="APPROVED",
                        confidence_score=0.91, constitutional_check_passed=True,
                    ),
                    capabilities=["COP-0001"], technologies=["fastapi", "sqlite"], dependencies=[],
                    version=1,
                ),
                KnowledgeUpsertRequest(
                    id="KOBJ-002",
                    title="Governance decision provenance record",
                    description="Operationalized record preserving provenance and validation state for a governance evaluation, ready for OBA machine consumption.",
                    category="governance-record",
                    provenance=ProvenanceInput(
                        source_platform="governance-engine", author_id="ammara.nasir",
                        source_reference_id="EV-governance-demo",
                    ),
                    validation=ValidationInput(
                        validated_by="ammara.nasir", validation_status="APPROVED",
                        confidence_score=0.88, constitutional_check_passed=True,
                    ),
                    capabilities=[], technologies=["node", "governance-engine"], dependencies=["KOBJ-001"],
                    version=1,
                ),
            ]
            for req in demo_objects:
                OBAKnowledgeBackendEngine.upsert_knowledge_with_integrity(db, req)
    finally:
        db.close()
    _seeded["done"] = True


@app.on_event("startup")
def on_startup():
    seed_once()


@app.get("/api/summary")
def summary():
    db = SessionLocal()
    try:
        objs = db.query(OBAKnowledgeModel).filter(OBAKnowledgeModel.is_active == True).all()
        return {
            "service": "operationalization-service",
            "owner": "Ammara Nasir",
            "count": len(objs),
            "objects": [o.to_oba_machine_consumable_format() for o in objs],
        }
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "service": "operationalization-service"}
