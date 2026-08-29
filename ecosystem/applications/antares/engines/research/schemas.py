"""
schemas.py

Pydantic models for request/response bodies. Keeping these separate from
the SQLAlchemy models in models.py on purpose - the API shape and the
database shape don't always need to match, and it's cleaner to keep them
apart from the start rather than untangle them later.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from .models import EvidenceState, DimensionName, PatternStatus


# ---------- Signal ----------

class SignalCreate(BaseModel):
    title: str
    description: str
    source: Optional[str] = None
    context: Optional[str] = None
    evidence_state: EvidenceState = EvidenceState.OBSERVED


class SignalOut(BaseModel):
    id: str
    title: str
    description: str
    source: Optional[str]
    context: Optional[str]
    evidence_state: EvidenceState
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SignalUpdate(BaseModel):
    """
    Separate from SignalCreate on purpose - every field is optional here
    since an update might only touch one thing, and I added changed_by /
    change_reason so there's at least a minimal record of who changed
    what and why (goes into SignalHistory).
    """
    title: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    context: Optional[str] = None
    evidence_state: Optional[EvidenceState] = None
    changed_by: Optional[str] = None
    change_reason: Optional[str] = None


class SignalHistoryOut(BaseModel):
    id: str
    signal_id: str
    version: int
    title: str
    description: str
    evidence_state: EvidenceState
    changed_by: Optional[str]
    change_reason: Optional[str]
    recorded_at: datetime

    class Config:
        from_attributes = True


class DuplicateCandidate(BaseModel):
    """Response shape for the naive duplicate-check helper."""
    signal_id: str
    title: str
    similarity: float


# ---------- Evidence ----------

class EvidenceCreate(BaseModel):
    signal_id: str
    description: str
    source_reference: Optional[str] = None
    evidence_state: EvidenceState = EvidenceState.OBSERVED


class EvidenceOut(BaseModel):
    id: str
    signal_id: str
    description: str
    source_reference: Optional[str]
    evidence_state: EvidenceState
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Organizational Dimension ----------

class DimensionOut(BaseModel):
    id: str
    name: DimensionName
    description: Optional[str]

    class Config:
        from_attributes = True


# ---------- Impact (this is the "organizational analysis" output) ----------

class ImpactCreate(BaseModel):
    signal_id: str
    dimension_id: str
    description: str
    affected_stakeholders: Optional[str] = None
    risk_notes: Optional[str] = None
    opportunity_notes: Optional[str] = None
    confidence: EvidenceState = EvidenceState.INFERRED


class ImpactOut(BaseModel):
    id: str
    signal_id: str
    dimension_id: str
    dimension_name: Optional[str] = None
    description: str
    affected_stakeholders: Optional[str]
    risk_notes: Optional[str]
    opportunity_notes: Optional[str]
    confidence: EvidenceState
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Pattern ----------

class PatternCreate(BaseModel):
    name: str
    description: str
    status: PatternStatus = PatternStatus.CREATED
    confidence: EvidenceState = EvidenceState.HYPOTHESIZED


class PatternOut(BaseModel):
    id: str
    name: str
    description: str
    status: PatternStatus
    confidence: EvidenceState
    version: int
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Organization Model ----------

class OrganizationModelCreate(BaseModel):
    name: str
    purpose: Optional[str] = None
    structure_notes: Optional[str] = None
    confidence: EvidenceState = EvidenceState.HYPOTHESIZED


class OrganizationModelOut(BaseModel):
    id: str
    name: str
    purpose: Optional[str]
    structure_notes: Optional[str]
    confidence: EvidenceState
    version: int
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Candidate Capability ----------

class CandidateCapabilityCreate(BaseModel):
    name: str
    description: str
    supporting_pattern_id: Optional[str] = None
    evidence_summary: Optional[str] = None
    status: str = "candidate"


class CandidateCapabilityOut(BaseModel):
    id: str
    name: str
    description: str
    supporting_pattern_id: Optional[str]
    evidence_summary: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Relationship ----------

class RelationshipCreate(BaseModel):
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    relationship_type: str


class RelationshipOut(BaseModel):
    id: str
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    relationship_type: str


# ---------- Model Build Request (Day 6) ----------

class ModelBuildRequest(BaseModel):
    """
    Request body for POST /models/build. The caller picks which
    patterns should feed into the new future model - the engine
    doesn't guess which patterns "belong together", that's still a
    human/orchestration decision at this stage.
    """
    pattern_ids: list[str]
    name: Optional[str] = None
