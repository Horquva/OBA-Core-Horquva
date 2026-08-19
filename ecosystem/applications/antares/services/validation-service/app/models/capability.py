"""
Capability Validation Platform — Capability Intake Model
Owner: Zara Fatima (Capability Validation Platform)
Roadmap Reference: PART-2 — Capability Intake

This module defines the structured capability object that enters the
Capability Validation Platform from upstream Antares platforms
(Technology Intelligence / Organizational Futures / Trust & Governance).

IMPORTANT (non-overlap boundary):
This model does NOT perform discovery, does NOT operationalize capabilities,
and does NOT grant constitutional approval. It only structures the intake
so it can be validated.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
import uuid


class SubmissionStatus(str, Enum):
    """Initial intake status, before assessment begins."""
    RECEIVED = "RECEIVED"
    INCOMPLETE = "INCOMPLETE"
    READY_FOR_ASSESSMENT = "READY_FOR_ASSESSMENT"


class ReadinessLevel(str, Enum):
    """Self-declared readiness from the source platform (not a judgement)."""
    EARLY_SIGNAL = "EARLY_SIGNAL"
    CANDIDATE = "CANDIDATE"
    MATURE_CANDIDATE = "MATURE_CANDIDATE"


@dataclass
class EvidenceReference:
    """Pointer to evidence stored in the shared evidence-registry."""
    evidence_id: str
    source: str                 # e.g. "research-artifact-registry", "signal-registry"
    description: str
    url_or_locator: Optional[str] = None


@dataclass
class Capability:
    """
    Structured candidate capability entering Capability Validation.

    Fields map directly to PART-1's Business Capability Model:
    Identity, Organizational Problem, Proposed Value, Target Organization,
    Expected Outcome, Evidence, Business Impact, Organizational Impact,
    Reusability, Explainability, Dependencies, Risks,
    Constitutional Alignment, OBA Compatibility, Validation State.
    """

    # --- Identity ---
    capability_id: str = field(default_factory=lambda: f"CAP-{uuid.uuid4().hex[:10].upper()}")
    capability_name: str = ""
    description: str = ""

    # --- Organizational context ---
    organizational_problem: str = ""
    target_organization: str = ""
    expected_value: str = ""
    expected_outcome: str = ""

    # --- Provenance ---
    source_platform: str = ""   # e.g. "Organizational Futures", "Trust & Verification"
    submitted_by: str = ""

    # --- Structural attributes ---
    dependencies: list[str] = field(default_factory=list)
    risks: list[str] = field(default_factory=list)
    evidence_references: list[EvidenceReference] = field(default_factory=list)

    # --- Declared readiness (not yet assessed) ---
    initial_readiness: ReadinessLevel = ReadinessLevel.EARLY_SIGNAL

    # --- Intake state ---
    submission_status: SubmissionStatus = SubmissionStatus.RECEIVED
    submitted_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    # --- Constitutional / OBA hooks (data only, not decided here) ---
    constitutional_notes: Optional[str] = None
    oba_compatibility_notes: Optional[str] = None

    def required_fields_present(self) -> list[str]:
        """
        Returns a list of MISSING required fields.
        Empty list == structurally complete intake (does not mean valid).
        """
        required = {
            "capability_name": self.capability_name,
            "description": self.description,
            "organizational_problem": self.organizational_problem,
            "target_organization": self.target_organization,
            "expected_value": self.expected_value,
            "source_platform": self.source_platform,
        }
        return [name for name, value in required.items() if not value or not value.strip()]

    def is_structurally_complete(self) -> bool:
        return len(self.required_fields_present()) == 0

    def to_dict(self) -> dict:
        return {
            "capability_id": self.capability_id,
            "capability_name": self.capability_name,
            "description": self.description,
            "organizational_problem": self.organizational_problem,
            "target_organization": self.target_organization,
            "expected_value": self.expected_value,
            "expected_outcome": self.expected_outcome,
            "source_platform": self.source_platform,
            "submitted_by": self.submitted_by,
            "dependencies": self.dependencies,
            "risks": self.risks,
            "evidence_references": [e.__dict__ for e in self.evidence_references],
            "initial_readiness": self.initial_readiness.value,
            "submission_status": self.submission_status.value,
            "submitted_at": self.submitted_at.isoformat(),
            "constitutional_notes": self.constitutional_notes,
            "oba_compatibility_notes": self.oba_compatibility_notes,
        }
