"""
capability_engine.py

Part-6 of the roadmap: "Organizational Futures Intelligence Engine" —
specifically the "Capability Candidate Extraction" piece:

    Where evidence and patterns justify it, the system should identify
    candidate organizational capabilities. These are candidates only.
    The platform does not approve them. That boundary belongs to
    Capability Validation.

v1 takes an existing OrganizationModel (Day 6) and turns it into a
CandidateCapability row - a suggestion for something Antares might
build, always left in status="candidate", never auto-approved.
"""

from sqlalchemy.orm import Session

from app import crud, models, schemas


def _primary_pattern_id_for_model(db: Session, model_id: str) -> str | None:
    """
    A model can be informed by multiple patterns (Day 6), but the
    CandidateCapability table only tracks one supporting_pattern_id.
    v1 just picks the first pattern that informs the model - noted as
    a known limitation, not a hidden decision.
    """
    for r in crud.list_relationships(db):
        if r.target_type == "model" and r.target_id == model_id and r.relationship_type == "informs":
            return r.source_id
    return None


def build_candidate_capability(
    db: Session, model_id: str, name: str | None = None
) -> models.CandidateCapability | None:
    """
    Builds one CandidateCapability from an existing future model.
    Returns None if the model doesn't exist.
    """
    model = crud.get_organization_model(db, model_id)
    if model is None:
        return None

    pattern_id = _primary_pattern_id_for_model(db, model_id)
    capability_name = name or f"Capability suggestion: {model.name}"
    description = (
        f"Suggested capability derived from future organizational model "
        f"'{model.name}'. {model.purpose or ''}".strip()
    )
    evidence_summary = (
        f"Derived from model (confidence: {model.confidence.value}). "
        f"{model.structure_notes or ''}".strip()
    )

    capability = crud.create_candidate_capability(
        db,
        schemas.CandidateCapabilityCreate(
            name=capability_name,
            description=description,
            supporting_pattern_id=pattern_id,
            evidence_summary=evidence_summary,
            status="candidate",  # never auto-approved - Capability Validation's job
        ),
    )

    crud.create_relationship(
        db,
        schemas.RelationshipCreate(
            source_type="model",
            source_id=model.id,
            target_type="capability",
            target_id=capability.id,
            relationship_type="suggests",
        ),
    )

    return capability


def trace_signal(db: Session, signal_id: str) -> dict | None:
    """
    Part-6's "Intelligence Retrieval" idea, kept simple for v1: walks
    the real relationship graph outward from one signal and returns
    everything downstream of it - which patterns it supports, which
    models those patterns informed, which capabilities those models
    suggested. Pure graph traversal over data already written by the
    Day 4/5/6/7 engines - no new reasoning, just making the existing
    trail queryable in one call instead of five separate ones.
    """
    signal = crud.get_signal(db, signal_id)
    if signal is None:
        return None

    all_rels = crud.list_relationships(db)

    pattern_ids = [
        r.target_id for r in all_rels
        if r.source_id == signal_id and r.target_type == "pattern"
    ]
    model_ids = [
        r.target_id for r in all_rels
        if r.source_id in pattern_ids and r.target_type == "model"
    ]
    capability_ids = [
        r.target_id for r in all_rels
        if r.source_id in model_ids and r.target_type == "capability"
    ]

    return {
        "signal": schemas.SignalOut.model_validate(signal).model_dump(),
        "impacts": [
            schemas.ImpactOut.model_validate(i).model_dump()
            for i in crud.list_impacts_for_signal(db, signal_id)
        ],
        "patterns": [
            schemas.PatternOut.model_validate(crud.get_pattern(db, pid)).model_dump()
            for pid in pattern_ids
        ],
        "models": [
            schemas.OrganizationModelOut.model_validate(
                crud.get_organization_model(db, mid)
            ).model_dump()
            for mid in model_ids
        ],
        "candidate_capabilities": [
            schemas.CandidateCapabilityOut.model_validate(
                crud.get_candidate_capability(db, cid)
            ).model_dump()
            for cid in capability_ids
        ],
    }
