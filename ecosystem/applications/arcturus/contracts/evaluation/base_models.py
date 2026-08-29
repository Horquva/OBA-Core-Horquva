from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
from enum import Enum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext,
    ArcturusValidationError,
)

# ---------------------------------------------------------------------------
# 1. EVIDENCE CONTRACT
# ---------------------------------------------------------------------------

class EvidenceContract(BaseModel):
    """
    Evidence submitted to the Validation & Evaluation Platform.
    Every evidence item must trace back to a SimulationContext.
    """
    context: SimulationContext
    source_execution_id: str = Field(..., description="Execution/run this evidence came from")
    observed_value: Any = Field(..., description="The raw measurement or outcome being evaluated")
    expected_value: Optional[Any] = Field(
        default=None, description="Pre-simulation prediction, if one was defined"
    )
    collected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# 2. VALIDATION RULE CONTRACT
# ---------------------------------------------------------------------------

class ValidationRuleContract(BaseModel):
    """
    A single validation rule (Logic, Industry Pattern, Internal Consistency,
    Expected Outcome) as defined in the Week 2 Validation Architecture.
    """
    rule_id: str
    category: str = Field(..., description="logic | industry_pattern | internal_consistency | expected_outcome")
    description: str
    hard_fail: bool = Field(
        ..., description="True if failing this rule rejects immediately (Logic, Internal Consistency)"
    )


# ---------------------------------------------------------------------------
# 3. VALIDATION RUN
# ---------------------------------------------------------------------------

class ValidationRun(BaseModel):
    """
    Represents one execution of the validation lifecycle for a piece of evidence.
    """
    run_id: UUID = Field(default_factory=uuid4)
    context: SimulationContext
    evidence: EvidenceContract
    rules_applied: list[ValidationRuleContract] = Field(default_factory=list)
    status: str = Field(default="pending", description="pending | passed | failed | flagged")


# ---------------------------------------------------------------------------
# 4. VALIDATION RESULT CONTRACT
# ---------------------------------------------------------------------------

class ValidationResultContract(BaseModel):
    """
    Final structured output of a ValidationRun, handed off toward
    Simulation Intelligence once accepted.
    """
    run_id: UUID
    context: SimulationContext
    passed_rules: list[str] = Field(default_factory=list)
    failed_rules: list[str] = Field(default_factory=list)
    flagged_rules: list[str] = Field(default_factory=list)
    final_status: str = Field(..., description="validated | rejected | inconclusive")
    reason: Optional[str] = Field(default=None, description="Explanation for the final status")
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# 5. VALIDATION STATUS (tri-state)
# ---------------------------------------------------------------------------
class ValidationStatus(str, Enum):
    """
    Tri-state classification. No other value is possible — this is the
    structural guarantee behind the 'never a fake pass' rule.
    """
    VALIDATED = "VALIDATED"
    REJECTED = "REJECTED"
    INCONCLUSIVE = "INCONCLUSIVE"


# ---------------------------------------------------------------------------
# 6. METRIC SCORES
# ---------------------------------------------------------------------------
class MetricScores(BaseModel):
    """Computed quality metrics for one validation run."""
    coverage: float = Field(..., ge=0.0, le=1.0, description="Fraction of expected data present")
    accuracy: float = Field(..., ge=0.0, le=1.0, description="Fraction of accepted artifacts passing quality gates")
    consistency: float = Field(..., ge=0.0, le=1.0, description="Cross-domain consistency score")


# ---------------------------------------------------------------------------
# 7. VALIDATION RESULT (Day 4 — Validation -> Intelligence)
# ---------------------------------------------------------------------------
class ValidationResult(BaseModel):
    """Day 4 outbound handoff: Validation -> Intelligence."""
    context: SimulationContext
    status: ValidationStatus = Field(..., description="Tri-state classification for this corpus")
    reason: str = Field(..., min_length=1, description="Explicit reasoning behind the status")
    flagged_rules: list[str] = Field(default_factory=list, description="Soft-check anomalies that did not cause rejection")
    metrics: MetricScores
    accepted_artifact_count: int = Field(..., ge=0)
    rejected_artifact_count: int = Field(..., ge=0)
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))