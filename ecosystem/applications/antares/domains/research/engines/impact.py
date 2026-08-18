"""
Organizational impact engine (roadmap Part-3, task 4).

Produces a structured record per organizational dimension — never a paragraph.
An impact record answers four questions in machine-readable form:

    which dimension · which direction · how severe · over what horizon
"""

from __future__ import annotations

from typing import Any

from ..domain import taxonomy
from ..domain.models import (
    ImpactDirection,
    LifecycleState,
    OrganizationalImpact,
)
from ..storage import Repository
from .ingestion import ValidationError


#: Default direction/severity per theme+dimension pair. This is the platform's
#: prior, not its verdict — an analyst can override any value, and the override
#: is what gets stored and audited.
THEME_IMPACT_PRIORS: dict[str, dict[str, tuple[ImpactDirection, int, int]]] = {
    # theme -> dimension -> (direction, severity 1-5, horizon months)
    "human_ai_collaboration": {
        "workforce": (ImpactDirection.RESHAPES, 4, 18),
        "human_ai_collaboration": (ImpactDirection.INCREASES, 5, 12),
        "collaboration": (ImpactDirection.RESHAPES, 3, 18),
    },
    "distributed_leadership": {
        "leadership": (ImpactDirection.RESHAPES, 4, 24),
        "decision_making": (ImpactDirection.INCREASES, 3, 18),
        "accountability": (ImpactDirection.RESHAPES, 4, 24),
    },
    "ai_assisted_decision_making": {
        "decision_making": (ImpactDirection.RESHAPES, 5, 12),
        "organizational_intelligence": (ImpactDirection.INCREASES, 4, 12),
    },
    "organizational_memory": {
        "organizational_memory": (ImpactDirection.INCREASES, 4, 24),
        "organizational_intelligence": (ImpactDirection.INCREASES, 3, 24),
    },
    "adaptive_governance": {
        "governance": (ImpactDirection.RESHAPES, 5, 18),
        "accountability": (ImpactDirection.INCREASES, 4, 18),
        "trust": (ImpactDirection.INCREASES, 3, 24),
    },
    "autonomous_coordination": {
        "autonomous_coordination": (ImpactDirection.INCREASES, 5, 18),
        "operational_execution": (ImpactDirection.RESHAPES, 4, 12),
    },
    "continuous_organizational_learning": {
        "workforce": (ImpactDirection.INCREASES, 3, 24),
        "organizational_intelligence": (ImpactDirection.INCREASES, 3, 24),
    },
    "trust_first_design": {
        "trust": (ImpactDirection.INCREASES, 4, 24),
        "governance": (ImpactDirection.RESHAPES, 3, 24),
        "accountability": (ImpactDirection.INCREASES, 3, 18),
    },
}


class ImpactEngine:
    def __init__(self, repo: Repository) -> None:
        self.repo = repo

    def analyze(self, signal_id: str, overrides: list[dict[str, Any]] | None = None,
                actor: str = "system") -> list[OrganizationalImpact]:
        signal = self.repo.get_signal(signal_id)
        if not signal:
            raise ValidationError(f"Unknown signal '{signal_id}'")
        if not self.repo.evidence_for(signal_id):
            raise ValidationError(
                "Refusing to analyze impact: signal has no evidence. "
                "Impact without evidence is opinion, not intelligence."
            )

        produced: dict[str, OrganizationalImpact] = {}

        for theme in signal.themes:
            for dimension, (direction, severity, horizon) in THEME_IMPACT_PRIORS.get(theme, {}).items():
                produced[dimension] = OrganizationalImpact(
                    signal_id=signal_id,
                    dimension=taxonomy.validate_dimension(dimension),
                    direction=direction,
                    severity=severity,
                    horizon_months=horizon,
                    rationale=f"Derived from theme '{taxonomy.FUTURE_THEMES[theme]['label']}' prior.",
                )

        # analyst overrides replace the prior entirely
        for override in overrides or []:
            dim = taxonomy.validate_dimension(override["dimension"])
            produced[dim] = OrganizationalImpact(
                signal_id=signal_id,
                dimension=dim,
                direction=ImpactDirection(override["direction"]),
                severity=int(override["severity"]),
                horizon_months=int(override.get("horizon_months", 18)),
                rationale=override.get("rationale", f"Analyst override by {actor}."),
            )

        for impact in produced.values():
            self.repo.save_impact(impact, actor)

        if signal.state == LifecycleState.EVIDENCE_CAPTURED and produced:
            signal.transition(LifecycleState.IMPACT_ANALYZED,
                              note=f"{len(produced)} dimensions analyzed", actor=actor)
            self.repo.save_signal(signal, actor)

        return list(produced.values())

    def impact_profile(self, signal_id: str) -> dict[str, Any]:
        """Aggregate view used by the dashboard and downstream platforms."""
        impacts = self.repo.impacts_for(signal_id)
        if not impacts:
            return {"signal_id": signal_id, "dimensions": [], "breadth": 0, "max_severity": 0}
        return {
            "signal_id": signal_id,
            "dimensions": [
                {
                    "dimension": i.dimension,
                    "direction": i.direction.value,
                    "severity": i.severity,
                    "horizon_months": i.horizon_months,
                    "rationale": i.rationale,
                }
                for i in sorted(impacts, key=lambda x: -x.severity)
            ],
            "breadth": len(impacts),
            "max_severity": max(i.severity for i in impacts),
            "nearest_horizon_months": min(i.horizon_months for i in impacts),
        }
