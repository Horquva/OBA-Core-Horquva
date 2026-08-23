"""
Day 0 — Architecture Alignment, Simulation Intelligence Platform.

Defines the Gemini-facing output contract ahead of any feature work, per
the Week 4 blueprint alignment: this is *not* implementation, only the
shape every downstream consumer (Frontend, orchestrator) can build
against starting Day 1, even though the service that produces it doesn't
land until Day 5.

Ownership note: this file lives under contracts/evaluation/ alongside
Amina's ValidationResult contracts (contracts/evaluation/base_models.py).
The two are separate owned files sharing a folder — flagged to Amina/
Hashim before this landed.
"""

from __future__ import annotations

from pydantic import ConfigDict, Field

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ContractEnvelope,
    SimulationContext,
)


class StructuredAssessment(ContractEnvelope):
    """
    Outbound Intelligence artifact: Gemini's evidence-grounded assessment
    of a validated simulation run.

    Anti-hallucination boundary, enforced structurally, not just by
    prompt instruction: evidence_citations requires at least one
    artifact_id. A StructuredAssessment with zero citations cannot be
    constructed — "No Validated Evidence -> No Trusted Assessment" is a
    contract-level invariant, not just a service-level convention.
    """

    model_config = ConfigDict(extra="forbid")

    context: SimulationContext

    assessment_summary: str = Field(
        ...,
        min_length=1,
        description="Executive summary of findings.",
    )

    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description=(
            "Model confidence in this assessment, grounded in the "
            "strength/volume of the validated evidence it was built from."
        ),
    )

    risk_factors: list[str] = Field(
        default_factory=list,
        description="Organizational risks surfaced by the evidence.",
    )

    recommendations: list[str] = Field(
        default_factory=list,
        description="Suggested actions grounded in the evidence.",
    )

    evidence_citations: list[str] = Field(
        ...,
        min_length=1,
        description=(
            "Synthetic artifact IDs supporting this claim. Required and "
            "non-empty: an assessment with no citations is not trusted "
            "output and must not be constructed."
        ),
    )


GEMINI_SYSTEM_PROMPT = """
You are an Arcturus Simulation Intelligence Agent.
You will be provided with VALIDATED synthetic evidence (artifacts and metrics) from a workforce simulation.
Analyze the organizational health and risks.
CRITICAL: You must cite specific artifact_ids from the evidence provided. Do not hallucinate data.
"""


__all__ = ["StructuredAssessment", "GEMINI_SYSTEM_PROMPT"]