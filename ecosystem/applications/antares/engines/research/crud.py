"""
crud.py

This is the actual persistence/repository layer the roadmap asks for in
Part-2: "storing organizational signals, retrieving organizational
models, updating analyses, maintaining relationships, preserving
evidence, maintaining provenance, versioning important intelligence."

I kept these as plain functions instead of a full repository class
hierarchy - for Day 2 that felt like over-engineering something that
only needs to do simple CRUD right now. Can always wrap these in classes
later if the platform needs swappable storage backends.
"""

from difflib import SequenceMatcher

from sqlalchemy.orm import Session

from . import models, schemas


# ---------- Signals ----------

def create_signal(db: Session, signal: schemas.SignalCreate) -> models.Signal:
    db_signal = models.Signal(**signal.model_dump())
    db.add(db_signal)
    db.commit()
    db.refresh(db_signal)
    return db_signal


def get_signal(db: Session, signal_id: str) -> models.Signal | None:
    return db.query(models.Signal).filter(models.Signal.id == signal_id).first()


def list_signals(db: Session, skip: int = 0, limit: int = 50):
    return db.query(models.Signal).offset(skip).limit(limit).all()


def update_signal(
    db: Session, signal_id: str, update: schemas.SignalUpdate
) -> models.Signal | None:
    """
    Updates a signal AND writes the pre-update state into signal_history
    first, so nothing gets silently overwritten. This is the "real"
    versioning/provenance I was missing when I first wrote bump-version-
    only logic - a counter alone doesn't tell you what actually changed.

    Only bumps the version if something meaningful actually changed
    (comparing field by field) - otherwise a no-op "update" call would
    inflate the version number for nothing.
    """
    db_signal = get_signal(db, signal_id)
    if db_signal is None:
        return None

    update_data = update.model_dump(exclude={"changed_by", "change_reason"}, exclude_unset=True)
    if not update_data:
        return db_signal  # nothing to actually update

    changed = any(getattr(db_signal, field) != value for field, value in update_data.items())
    if not changed:
        return db_signal

    # snapshot BEFORE applying the update
    history_row = models.SignalHistory(
        signal_id=db_signal.id,
        version=db_signal.version,
        title=db_signal.title,
        description=db_signal.description,
        evidence_state=db_signal.evidence_state,
        changed_by=update.changed_by,
        change_reason=update.change_reason,
    )
    db.add(history_row)

    for field, value in update_data.items():
        setattr(db_signal, field, value)
    db_signal.version += 1

    db.commit()
    db.refresh(db_signal)
    return db_signal


def get_signal_history(db: Session, signal_id: str):
    return (
        db.query(models.SignalHistory)
        .filter(models.SignalHistory.signal_id == signal_id)
        .order_by(models.SignalHistory.version)
        .all()
    )


def find_possible_duplicate_signals(
    db: Session, title: str, description: str, threshold: float = 0.75
):
    """
    Very naive duplicate check for Day 2 - just string similarity on
    title+description against existing signals using difflib. This is
    NOT the embeddings-based semantic duplicate detection the roadmap
    mentions as a Part-2/Part-4 AI engineering direction - it's a cheap
    stand-in so the ingestion endpoint has *some* protection against
    obvious copy-paste duplicates while there's no AI service wired up
    yet. Worth swapping for real embedding similarity later.
    """
    candidates = []
    combined_new = f"{title} {description}".lower()
    for existing in db.query(models.Signal).all():
        combined_existing = f"{existing.title} {existing.description}".lower()
        score = SequenceMatcher(None, combined_new, combined_existing).ratio()
        if score >= threshold:
            candidates.append((existing, score))
    candidates.sort(key=lambda pair: pair[1], reverse=True)
    return candidates


# ---------- Evidence ----------

def create_evidence(db: Session, evidence: schemas.EvidenceCreate) -> models.Evidence:
    db_evidence = models.Evidence(**evidence.model_dump())
    db.add(db_evidence)
    db.commit()
    db.refresh(db_evidence)
    return db_evidence


def list_evidence_for_signal(db: Session, signal_id: str):
    return db.query(models.Evidence).filter(models.Evidence.signal_id == signal_id).all()


# ---------- Organizational Dimensions ----------

def list_dimensions(db: Session):
    return db.query(models.OrganizationalDimension).all()


def get_dimension_by_name(db: Session, name: models.DimensionName):
    return (
        db.query(models.OrganizationalDimension)
        .filter(models.OrganizationalDimension.name == name)
        .first()
    )


# ---------- Impacts (organizational analysis) ----------

def create_impact(db: Session, impact: schemas.ImpactCreate) -> models.Impact:
    db_impact = models.Impact(**impact.model_dump())
    db.add(db_impact)
    db.commit()
    db.refresh(db_impact)
    return db_impact


def list_impacts_for_signal(db: Session, signal_id: str):
    return db.query(models.Impact).filter(models.Impact.signal_id == signal_id).all()


# ---------- Patterns ----------

def create_pattern(db: Session, pattern: schemas.PatternCreate) -> models.Pattern:
    db_pattern = models.Pattern(**pattern.model_dump())
    db.add(db_pattern)
    db.commit()
    db.refresh(db_pattern)
    return db_pattern


def get_pattern_by_name(db: Session, name: str) -> models.Pattern | None:
    return db.query(models.Pattern).filter(models.Pattern.name == name).first()


def list_patterns(db: Session, skip: int = 0, limit: int = 50):
    return db.query(models.Pattern).offset(skip).limit(limit).all()


def get_pattern(db: Session, pattern_id: str):
    return db.query(models.Pattern).filter(models.Pattern.id == pattern_id).first()


# ---------- Organization Models ----------

def create_organization_model(
    db: Session, model: schemas.OrganizationModelCreate
) -> models.OrganizationModel:
    db_model = models.OrganizationModel(**model.model_dump())
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model


def list_organization_models(db: Session, skip: int = 0, limit: int = 50):
    return db.query(models.OrganizationModel).offset(skip).limit(limit).all()


def get_organization_model(db: Session, model_id: str):
    return (
        db.query(models.OrganizationModel)
        .filter(models.OrganizationModel.id == model_id)
        .first()
    )


# ---------- Candidate Capabilities ----------

def create_candidate_capability(
    db: Session, capability: schemas.CandidateCapabilityCreate
) -> models.CandidateCapability:
    db_capability = models.CandidateCapability(**capability.model_dump())
    db.add(db_capability)
    db.commit()
    db.refresh(db_capability)
    return db_capability


def get_candidate_capability(db: Session, capability_id: str):
    return (
        db.query(models.CandidateCapability)
        .filter(models.CandidateCapability.id == capability_id)
        .first()
    )


def list_candidate_capabilities(db: Session, skip: int = 0, limit: int = 50):
    return db.query(models.CandidateCapability).offset(skip).limit(limit).all()


# ---------- Relationships ----------

def create_relationship(db: Session, rel: schemas.RelationshipCreate) -> models.Relationship:
    db_rel = models.Relationship(**rel.model_dump())
    db.add(db_rel)
    db.commit()
    db.refresh(db_rel)
    return db_rel


def list_relationships(db: Session, source_id: str | None = None):
    query = db.query(models.Relationship)
    if source_id:
        query = query.filter(models.Relationship.source_id == source_id)
    return query.all()
