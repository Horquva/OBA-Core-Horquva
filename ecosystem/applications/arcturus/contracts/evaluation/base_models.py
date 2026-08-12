from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
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