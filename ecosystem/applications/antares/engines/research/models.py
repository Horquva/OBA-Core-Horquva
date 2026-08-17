"""
models.py

This is the canonical data model for the Organizational Futures Platform,
based on the domain objects called out in Part-1 and Part-2 of the roadmap:

    Signal, OrganizationModel, OrganizationalDimension, Impact,
    Pattern, Evidence, Relationship, CandidateCapability

I kept every table pretty flat on purpose. The roadmap keeps repeating
that AI output must not be dumped straight into the "canonical" layer as
fact, so every important row carries an evidence_state field that tracks
where the information sits on the spectrum from
Observed -> Supported -> Inferred -> Hypothesized -> Candidate -> Validated.

Relationship is a generic table (source/target + type) instead of a pile
of foreign keys everywhere, because the roadmap wants relationships like
Signal->Impact, Impact->Pattern, Pattern->Model, Model->Capability, and
even Pattern->Pattern / Model->Model. A generic edge table is the simplest
way to support all of those without rebuilding the schema every time a new
relationship type shows up.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
)
from sqlalchemy.orm import relationship

from app.database import Base


def new_id() -> str:
    """Small helper so every table gets a readable-ish unique id."""
    return uuid.uuid4().hex[:12]


class EvidenceState(str, enum.Enum):
    """
    This is straight from Part-2 of the roadmap: the platform has to be
    able to tell the difference between something that was actually
    observed and something the AI (or a human) is guessing about.
    """
    OBSERVED = "observed"
    SUPPORTED = "supported"
    INFERRED = "inferred"
    HYPOTHESIZED = "hypothesized"
    CANDIDATE = "candidate"
    VALIDATED = "validated"


class DimensionName(str, enum.Enum):
    """
    The ten organizational dimensions listed in Part-3. I'm putting them
    here as an enum AND seeding them as rows in the dimensions table
    (see database seed in main.py) so the API can return them with a
    description attached instead of just a bare string.
    """
    LEADERSHIP = "leadership"
    GOVERNANCE = "governance"
    DECISION_MAKING = "decision_making"
    WORKFORCE = "workforce"
    COLLABORATION = "collaboration"
    ACCOUNTABILITY = "accountability"
    TRUST = "trust"
    ORGANIZATIONAL_MEMORY = "organizational_memory"
    OPERATIONAL_EXECUTION = "operational_execution"
    ORGANIZATIONAL_INTELLIGENCE = "organizational_intelligence"


class PatternStatus(str, enum.Enum):
    """From Part-4: patterns evolve, they don't just get overwritten."""
    CREATED = "created"
    REVISED = "revised"
    STRENGTHENED = "strengthened"
    WEAKENED = "weakened"
    DEPRECATED = "deprecated"


class OrganizationalDimension(Base):
    """
    A lookup table for the 10 dimensions. Storing these as real rows
    (instead of only an enum) means later on someone could add a new
    dimension without touching code, and each dimension can carry a
    short description for the UI.
    """
    __tablename__ = "organizational_dimensions"

    id = Column(String, primary_key=True, default=new_id)
    name = Column(Enum(DimensionName), unique=True, nullable=False)
    description = Column(Text, nullable=True)


class Signal(Base):
    """
    A raw organizational observation coming into the platform.
    e.g. "Company X flattened its management layers and gave teams
    direct decision authority."
    """
    __tablename__ = "signals"

    id = Column(String, primary_key=True, default=new_id)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    source = Column(String, nullable=True)       # where did this come from
    context = Column(Text, nullable=True)         # extra background info
    evidence_state = Column(
        Enum(EvidenceState), default=EvidenceState.OBSERVED, nullable=False
    )
    version = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    evidence_items = relationship("Evidence", back_populates="signal")
    impacts = relationship("Impact", back_populates="signal")


class SignalHistory(Base):
    """
    Added this while finishing up Day 2 - a version counter on Signal is
    fine for knowing THAT something changed, but it doesn't actually keep
    the old content anywhere. That's not real provenance. This table
    snapshots the signal's fields every time it's updated, so later on
    the platform (or a human reviewer) can actually see what it used to
    say, not just that it's on version 3 now.
    """
    __tablename__ = "signal_history"

    id = Column(String, primary_key=True, default=new_id)
    signal_id = Column(String, ForeignKey("signals.id"), nullable=False)
    version = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    evidence_state = Column(Enum(EvidenceState), nullable=False)
    changed_by = Column(String, nullable=True)   # who/what made the change
    change_reason = Column(Text, nullable=True)  # why it changed
    recorded_at = Column(DateTime, default=datetime.utcnow)


class Evidence(Base):
    """
    Every signal (and eventually pattern/model) should be traceable back
    to something real. This table is intentionally simple for Day 2 -
    just enough to prove the traceability chain works end to end.
    """
    __tablename__ = "evidence"

    id = Column(String, primary_key=True, default=new_id)
    signal_id = Column(String, ForeignKey("signals.id"), nullable=False)
    description = Column(Text, nullable=False)
    source_reference = Column(String, nullable=True)  # URL, doc name, interview, etc.
    evidence_state = Column(
        Enum(EvidenceState), default=EvidenceState.OBSERVED, nullable=False
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    signal = relationship("Signal", back_populates="evidence_items")


class Impact(Base):
    """
    The output of analyzing a signal against the organizational
    dimensions. Part-3 calls this "structured organizational impact
    intelligence".
    """
    __tablename__ = "impacts"

    id = Column(String, primary_key=True, default=new_id)
    signal_id = Column(String, ForeignKey("signals.id"), nullable=False)
    dimension_id = Column(String, ForeignKey("organizational_dimensions.id"), nullable=False)
    description = Column(Text, nullable=False)
    affected_stakeholders = Column(Text, nullable=True)
    risk_notes = Column(Text, nullable=True)
    opportunity_notes = Column(Text, nullable=True)
    confidence = Column(Enum(EvidenceState), default=EvidenceState.INFERRED, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    signal = relationship("Signal", back_populates="impacts")
    dimension = relationship("OrganizationalDimension")

    @property
    def dimension_name(self) -> str | None:
        """
        BUGFIX (pre-integration review): ImpactOut only exposed
        dimension_id (a bare hex string) to API consumers, never the
        actual dimension name like "governance" or "workforce". The
        Day 9 dashboard was rendering raw hex fragments
        (e.g. "dim:0b347622") instead of anything readable, which
        directly works against Part-8's own "make the intelligence
        understandable immediately" requirement. Exposed here as a
        property so schemas.ImpactOut (from_attributes=True) can pick
        it up with no extra query needed - self.dimension is already
        loaded via the relationship above.
        """
        return self.dimension.name.value if self.dimension is not None else None


class Pattern(Base):
    """
    A reusable evolution pattern detected across multiple signals/impacts.
    This is a Part-4 concept - Day 2 just needs the table to exist so
    later parts have somewhere to write to.
    """
    __tablename__ = "patterns"

    id = Column(String, primary_key=True, default=new_id)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(PatternStatus), default=PatternStatus.CREATED, nullable=False)
    confidence = Column(Enum(EvidenceState), default=EvidenceState.HYPOTHESIZED, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OrganizationModel(Base):
    """
    A future organizational model (Part-5). Only a placeholder shape for
    Day 2, but I wanted the table in place now so the relationships table
    below actually has something real to point at.
    """
    __tablename__ = "organization_models"

    id = Column(String, primary_key=True, default=new_id)
    name = Column(String, nullable=False)
    purpose = Column(Text, nullable=True)
    structure_notes = Column(Text, nullable=True)
    confidence = Column(Enum(EvidenceState), default=EvidenceState.HYPOTHESIZED, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class CandidateCapability(Base):
    """
    Candidate capabilities are just candidates - the roadmap is very
    clear this platform does NOT approve them, that belongs to
    Capability Validation. So this table only ever holds proposals.
    """
    __tablename__ = "candidate_capabilities"

    id = Column(String, primary_key=True, default=new_id)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    supporting_pattern_id = Column(String, ForeignKey("patterns.id"), nullable=True)
    evidence_summary = Column(Text, nullable=True)
    status = Column(String, default="candidate", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Relationship(Base):
    """
    Generic edge table so we can express things like:
    Signal -> Impact, Impact -> Pattern, Pattern -> Model, Model -> Capability
    without a separate join table for every single pairing.

    source_type / target_type are just table names as strings
    ("signal", "impact", "pattern", "model", "capability").
    """
    __tablename__ = "relationships"

    id = Column(String, primary_key=True, default=new_id)
    source_type = Column(String, nullable=False)
    source_id = Column(String, nullable=False)
    target_type = Column(String, nullable=False)
    target_id = Column(String, nullable=False)
    relationship_type = Column(String, nullable=False)  # e.g. "supports", "derived_from"
    created_at = Column(DateTime, default=datetime.utcnow)
