"""
Future-Signal Intelligence — domain models.

Covers roadmap Part-1 (platform contract, lifecycle) and Part-2 (domain objects).

Design rules enforced here:
  * every object has a deterministic identifier (same input -> same id)
  * every object carries provenance and timestamps
  * lifecycle transitions are explicit and validated, never implicit
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Any


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def utc_now() -> str:
    """ISO-8601 UTC timestamp. All timestamps in the platform use this."""
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def normalize_text(text: str) -> str:
    """Lowercase, strip punctuation and collapse whitespace.

    Used for deterministic ids and for deduplication, so two engineers
    describing the same organizational development land on the same key.
    """
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def deterministic_id(prefix: str, *parts: str) -> str:
    """Stable id derived from content, not from a random uuid.

    Deterministic ids mean re-ingesting the same evidence twice does not
    silently create two records — which is a provenance requirement.
    """
    joined = "|".join(normalize_text(p) for p in parts if p)
    digest = hashlib.sha256(joined.encode("utf-8")).hexdigest()[:16]
    return f"{prefix}_{digest}"


# --------------------------------------------------------------------------
# Lifecycle state machine (Part-1, task 3)
# --------------------------------------------------------------------------

class LifecycleState(str, Enum):
    DISCOVERED = "DISCOVERED"
    EVIDENCE_CAPTURED = "EVIDENCE_CAPTURED"
    IMPACT_ANALYZED = "IMPACT_ANALYZED"
    CORRELATED = "CORRELATED"
    PATTERN_CANDIDATE = "PATTERN_CANDIDATE"
    PATTERN_CONFIRMED = "PATTERN_CONFIRMED"
    VALIDATION_REQUIRED = "VALIDATION_REQUIRED"
    VALIDATED = "VALIDATED"
    OPERATIONALIZABLE = "OPERATIONALIZABLE"
    REJECTED = "REJECTED"


#: Allowed forward transitions. Anything not listed is refused.
ALLOWED_TRANSITIONS: dict[LifecycleState, set[LifecycleState]] = {
    LifecycleState.DISCOVERED: {LifecycleState.EVIDENCE_CAPTURED, LifecycleState.REJECTED},
    LifecycleState.EVIDENCE_CAPTURED: {LifecycleState.IMPACT_ANALYZED, LifecycleState.REJECTED},
    LifecycleState.IMPACT_ANALYZED: {LifecycleState.CORRELATED, LifecycleState.REJECTED},
    LifecycleState.CORRELATED: {LifecycleState.PATTERN_CANDIDATE, LifecycleState.REJECTED},
    LifecycleState.PATTERN_CANDIDATE: {LifecycleState.PATTERN_CONFIRMED, LifecycleState.REJECTED},
    LifecycleState.PATTERN_CONFIRMED: {LifecycleState.VALIDATION_REQUIRED, LifecycleState.REJECTED},
    LifecycleState.VALIDATION_REQUIRED: {LifecycleState.VALIDATED, LifecycleState.REJECTED},
    LifecycleState.VALIDATED: {LifecycleState.OPERATIONALIZABLE, LifecycleState.REJECTED},
    LifecycleState.OPERATIONALIZABLE: set(),
    LifecycleState.REJECTED: set(),
}


class LifecycleError(Exception):
    """Raised when code tries to make an illegal lifecycle jump."""


def assert_transition(current: LifecycleState, target: LifecycleState) -> None:
    if target not in ALLOWED_TRANSITIONS[current]:
        raise LifecycleError(
            f"Illegal transition {current.value} -> {target.value}. "
            f"Allowed: {sorted(s.value for s in ALLOWED_TRANSITIONS[current]) or 'none (terminal state)'}"
        )


# --------------------------------------------------------------------------
# Supporting value objects
# --------------------------------------------------------------------------

class SourceType(str, Enum):
    PEER_REVIEWED = "PEER_REVIEWED"
    INDUSTRY_REPORT = "INDUSTRY_REPORT"
    VENDOR_PUBLICATION = "VENDOR_PUBLICATION"
    NEWS = "NEWS"
    PRACTITIONER_BLOG = "PRACTITIONER_BLOG"
    INTERNAL_OBSERVATION = "INTERNAL_OBSERVATION"
    SOCIAL = "SOCIAL"


#: Source reliability weights. Deterministic, reviewable, and tunable —
#: never produced by a model at runtime.
SOURCE_RELIABILITY: dict[SourceType, float] = {
    SourceType.PEER_REVIEWED: 1.00,
    SourceType.INDUSTRY_REPORT: 0.85,
    SourceType.INTERNAL_OBSERVATION: 0.75,
    SourceType.NEWS: 0.60,
    SourceType.VENDOR_PUBLICATION: 0.50,
    SourceType.PRACTITIONER_BLOG: 0.40,
    SourceType.SOCIAL: 0.25,
}


class EvidenceStatus(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    VERIFIED = "VERIFIED"
    DISPUTED = "DISPUTED"
    OUTDATED = "OUTDATED"
    RETRACTED = "RETRACTED"


class ImpactDirection(str, Enum):
    INCREASES = "INCREASES"
    DECREASES = "DECREASES"
    RESHAPES = "RESHAPES"
    NO_EFFECT = "NO_EFFECT"


class Trajectory(str, Enum):
    EMERGING = "EMERGING"
    ACCELERATING = "ACCELERATING"
    STABLE = "STABLE"
    DECLINING = "DECLINING"
    FRAGMENTED = "FRAGMENTED"
    CONVERGING = "CONVERGING"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


@dataclass
class SourceProvenance:
    """Where a piece of evidence came from. Required on every EvidenceItem."""
    source_name: str
    source_type: SourceType
    source_url: str = ""
    published_at: str = ""          # ISO date of the original publication
    retrieved_at: str = field(default_factory=utc_now)
    retrieved_by: str = "unspecified"

    @property
    def reliability(self) -> float:
        return SOURCE_RELIABILITY[self.source_type]


@dataclass
class ConfidenceScore:
    """A score plus the factor breakdown that produced it.

    The breakdown exists so a human reviewer can argue with the number.
    A bare float is not auditable.
    """
    value: float                      # 0.0 - 1.0
    factors: dict[str, float] = field(default_factory=dict)
    method: str = "weighted_factor_v1"
    computed_at: str = field(default_factory=utc_now)

    @property
    def band(self) -> str:
        if self.value >= 0.75:
            return "HIGH"
        if self.value >= 0.50:
            return "MEDIUM"
        if self.value >= 0.25:
            return "LOW"
        return "INSUFFICIENT"


# --------------------------------------------------------------------------
# Core entities
# --------------------------------------------------------------------------

@dataclass
class EvidenceItem:
    title: str
    excerpt: str
    provenance: SourceProvenance
    signal_id: str = ""
    status: EvidenceStatus = EvidenceStatus.UNVERIFIED
    observed_at: str = ""             # when the described thing happened
    id: str = ""
    created_at: str = field(default_factory=utc_now)

    def __post_init__(self) -> None:
        if not self.id:
            self.id = deterministic_id(
                "ev", self.title, self.provenance.source_name, self.provenance.source_url
            )
        if not self.observed_at:
            self.observed_at = self.provenance.published_at or self.created_at

    @property
    def weight(self) -> float:
        """Effective strength of this evidence item."""
        status_multiplier = {
            EvidenceStatus.VERIFIED: 1.0,
            EvidenceStatus.UNVERIFIED: 0.6,
            EvidenceStatus.DISPUTED: 0.3,
            EvidenceStatus.OUTDATED: 0.2,
            EvidenceStatus.RETRACTED: 0.0,
        }[self.status]
        return round(self.provenance.reliability * status_multiplier, 4)


@dataclass
class OrganizationalImpact:
    """Structured impact on ONE organizational dimension.

    Deliberately not a paragraph — Part-3 requires a structured record.
    """
    signal_id: str
    dimension: str                    # must be in taxonomy.ORGANIZATIONAL_DIMENSIONS
    direction: ImpactDirection
    severity: int                     # 1 (marginal) .. 5 (structural)
    horizon_months: int               # when the effect is expected to be felt
    rationale: str = ""
    id: str = ""
    created_at: str = field(default_factory=utc_now)

    def __post_init__(self) -> None:
        if not 1 <= self.severity <= 5:
            raise ValueError("severity must be between 1 and 5")
        if not self.id:
            self.id = deterministic_id("imp", self.signal_id, self.dimension)


@dataclass
class SignalRelationship:
    source_signal_id: str
    target_signal_id: str
    relation: str                     # SUPPORTS | CONTRADICTS | SIMILAR_TO | PRECEDES
    strength: float = 0.0
    explanation: str = ""
    id: str = ""
    created_at: str = field(default_factory=utc_now)

    def __post_init__(self) -> None:
        if not self.id:
            self.id = deterministic_id(
                "rel", self.source_signal_id, self.target_signal_id, self.relation
            )


@dataclass
class EmergingSignal:
    title: str
    description: str
    themes: list[str] = field(default_factory=list)       # taxonomy theme codes
    dimensions: list[str] = field(default_factory=list)   # taxonomy dimensions
    organizations: list[str] = field(default_factory=list)
    state: LifecycleState = LifecycleState.DISCOVERED
    id: str = ""
    normalized_key: str = ""
    created_at: str = field(default_factory=utc_now)
    updated_at: str = field(default_factory=utc_now)
    history: list[dict[str, Any]] = field(default_factory=list)
    version: int = 1

    def __post_init__(self) -> None:
        if not self.normalized_key:
            self.normalized_key = normalize_text(self.title)
        if not self.id:
            self.id = deterministic_id("sig", self.normalized_key)
        if not self.history:
            self.history = [{"at": self.created_at, "state": self.state.value, "note": "discovered"}]

    def transition(self, target: LifecycleState, note: str = "", actor: str = "system") -> None:
        assert_transition(self.state, target)
        self.state = target
        self.updated_at = utc_now()
        self.version += 1
        self.history.append(
            {"at": self.updated_at, "state": target.value, "note": note, "actor": actor}
        )


@dataclass
class FuturePatternCandidate:
    """A recurring, evidence-backed organizational pattern proposed for review."""
    name: str
    theme: str
    signal_ids: list[str]
    dimensions: list[str]
    confidence: ConfidenceScore
    explanation: dict[str, Any] = field(default_factory=dict)
    contradictions: list[dict[str, Any]] = field(default_factory=list)
    trajectory: Trajectory = Trajectory.INSUFFICIENT_DATA
    state: LifecycleState = LifecycleState.PATTERN_CANDIDATE
    id: str = ""
    created_at: str = field(default_factory=utc_now)

    def __post_init__(self) -> None:
        if not self.id:
            self.id = deterministic_id("pat", self.theme)


@dataclass
class IntelligenceArtifact:
    """The machine-readable output other Antares platforms consume (Part-6)."""
    pattern_id: str
    payload: dict[str, Any]
    schema_version: str = "fsi.intelligence.v1"
    id: str = ""
    created_at: str = field(default_factory=utc_now)

    def __post_init__(self) -> None:
        if not self.id:
            self.id = deterministic_id("art", self.pattern_id, self.schema_version)

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2, default=str)
