"""
Future-Signal Intelligence service facade (roadmap Part-6).

This is the single object other Antares platforms talk to. Engines stay
internal; only this surface is a published contract.

Cross-platform position:
    Technology Intelligence -> [Future-Signal Intelligence] -> Organizational Futures
    -> Capability Validation -> Capability Operationalization
    -> Knowledge Operationalization -> OBA
"""

from __future__ import annotations

from dataclasses import asdict
from typing import Any

from .domain.models import (
    IntelligenceArtifact,
    LifecycleState,
    Trajectory,
    utc_now,
)
from .engines.contradictions import ContradictionEngine
from .engines.impact import ImpactEngine
from .engines.ingestion import IngestionEngine, ValidationError
from .engines.patterns import PatternEngine, RelationshipEngine
from .engines.trajectory import TrajectoryEngine
from .storage import Repository

SCHEMA_VERSION = "fsi.intelligence.v1"


class FutureSignalService:
    def __init__(self, db_path: str = "fsi.db") -> None:
        self.repo = Repository(db_path)
        self.ingestion = IngestionEngine(self.repo)
        self.impact = ImpactEngine(self.repo)
        self.relationships = RelationshipEngine(self.repo)
        self.patterns = PatternEngine(self.repo)
        self.trajectory = TrajectoryEngine(self.repo)
        self.contradictions = ContradictionEngine(self.repo)

    # -- write side --------------------------------------------------------
    def submit_signal(self, payload: dict[str, Any], actor: str = "system") -> dict[str, Any]:
        result = self.ingestion.ingest_signal(payload, actor)
        return {
            "signal": asdict(result.signal),
            "created": result.created,
            "warnings": result.warnings,
        }

    def add_evidence(self, signal_id: str, payload: dict[str, Any],
                     actor: str = "system") -> dict[str, Any]:
        return asdict(self.ingestion.attach_evidence(signal_id, payload, actor))

    def analyze_impact(self, signal_id: str, overrides=None, actor: str = "system") -> dict[str, Any]:
        self.impact.analyze(signal_id, overrides, actor)
        return self.impact.impact_profile(signal_id)

    def run_intelligence_cycle(self, actor: str = "system") -> dict[str, Any]:
        """Correlate -> detect patterns -> score trajectories. Idempotent."""
        rels = self.relationships.correlate_all(actor)
        candidates = self.patterns.detect(actor)
        for candidate in candidates:
            traj, _ = self.trajectory.pattern_trajectory(candidate.id)
            candidate.trajectory = traj
            self.repo.save_pattern(candidate)
        return {
            "relationships_created": len(rels),
            "pattern_candidates": len(candidates),
            "convergence_clusters": len(self.trajectory.convergence()),
            "ran_at": utc_now(),
        }

    # -- human review gate -------------------------------------------------
    def confirm_pattern(self, pattern_id: str, reviewer: str, note: str = "") -> dict[str, Any]:
        """Human review gate. No pattern reaches Antares without passing here."""
        pattern = self.repo.get_pattern(pattern_id)
        if not pattern:
            raise ValidationError(f"Unknown pattern '{pattern_id}'")
        pattern.state = LifecycleState.PATTERN_CONFIRMED
        self.repo.save_pattern(pattern)
        self.repo.log("pattern", pattern_id, "HUMAN_CONFIRM", reviewer, note)
        return asdict(pattern)

    def validate_pattern(self, pattern_id: str, reviewer: str, note: str = "") -> IntelligenceArtifact:
        """Promote a confirmed pattern to a machine-readable intelligence artifact."""
        pattern = self.repo.get_pattern(pattern_id)
        if not pattern:
            raise ValidationError(f"Unknown pattern '{pattern_id}'")
        if pattern.state != LifecycleState.PATTERN_CONFIRMED:
            raise ValidationError(
                f"Pattern must be PATTERN_CONFIRMED before validation "
                f"(currently {pattern.state.value})."
            )
        high = [c for c in pattern.contradictions if c.get("severity") == "HIGH"]
        if high:
            raise ValidationError(
                f"{len(high)} unresolved HIGH-severity contradictions block validation."
            )

        pattern.state = LifecycleState.VALIDATED
        self.repo.save_pattern(pattern)
        self.repo.log("pattern", pattern_id, "HUMAN_VALIDATE", reviewer, note)

        artifact = IntelligenceArtifact(
            pattern_id=pattern.id,
            schema_version=SCHEMA_VERSION,
            payload=self.intelligence_contract(pattern.id, reviewer),
        )
        self.repo.save_artifact(artifact)
        return artifact

    # -- read side / published contract ------------------------------------
    def intelligence_contract(self, pattern_id: str, reviewer: str = "") -> dict[str, Any]:
        """The exact shape downstream Antares platforms consume."""
        pattern = self.repo.get_pattern(pattern_id)
        if not pattern:
            raise ValidationError(f"Unknown pattern '{pattern_id}'")
        traj, traj_detail = self.trajectory.pattern_trajectory(pattern_id)

        return {
            "schema_version": SCHEMA_VERSION,
            "identity": {
                "pattern_id": pattern.id,
                "name": pattern.name,
                "theme": pattern.theme,
                "lifecycle_state": pattern.state.value,
                "generated_at": utc_now(),
            },
            "evidence": pattern.explanation.get("supporting_evidence", []),
            "organizational_impact": {
                "affected_dimensions": pattern.dimensions,
                "per_signal": [self.impact.impact_profile(sid) for sid in pattern.signal_ids],
            },
            "relationships": [
                asdict(r) for sid in pattern.signal_ids
                for r in self.repo.relationships_for(sid)
            ],
            "pattern_candidates": {
                "signal_ids": pattern.signal_ids,
                "why_detected": pattern.explanation.get("why_detected"),
                "open_questions": pattern.explanation.get("open_questions", []),
            },
            "confidence": {
                "value": pattern.confidence.value,
                "band": pattern.confidence.band,
                "factors": pattern.confidence.factors,
                "method": pattern.explanation.get("scoring_method"),
            },
            "trajectory": {"value": traj.value, "detail": traj_detail},
            "provenance": {
                "produced_by": "future-signal-intelligence",
                "owner": "Emerging Organizational Intelligence & Future-Signal Engineering",
                "human_reviewer": reviewer,
                "audit_trail": self.repo.audit_trail(pattern.id),
            },
            "contradictions": pattern.contradictions,
            "downstream_consumers": [
                "organizational-futures",
                "capability-validation",
                "knowledge-operationalization",
            ],
        }

    def dashboard_snapshot(self) -> dict[str, Any]:
        """Everything the Part-8 dashboard needs, in one call."""
        signals = self.repo.list_signals()
        patterns = self.repo.list_patterns()
        signal_rows = []
        for s in signals:
            traj, detail = self.trajectory.signal_trajectory(s.id)
            evidence = self.repo.evidence_for(s.id)
            signal_rows.append({
                "id": s.id,
                "title": s.title,
                "description": s.description,
                "state": s.state.value,
                "themes": s.themes,
                "dimensions": s.dimensions,
                "organizations": s.organizations,
                "evidence_count": len(evidence),
                "evidence_strength": round(
                    sum(e.weight for e in evidence) / len(evidence), 3) if evidence else 0.0,
                "trajectory": traj.value,
                "trajectory_series": detail.get("series", []),
                "impact": self.impact.impact_profile(s.id),
                "history": s.history,
            })
        return {
            "generated_at": utc_now(),
            "counts": {
                "signals": len(signals),
                "patterns": len(patterns),
                "artifacts": len(self.repo.list_artifacts()),
                "contradictions": sum(len(p.contradictions) for p in patterns),
            },
            "signals": signal_rows,
            "patterns": [
                {
                    "id": p.id, "name": p.name, "theme": p.theme,
                    "state": p.state.value,
                    "confidence": p.confidence.value,
                    "band": p.confidence.band,
                    "factors": p.confidence.factors,
                    "trajectory": p.trajectory.value,
                    "dimensions": p.dimensions,
                    "signal_ids": p.signal_ids,
                    "explanation": p.explanation,
                    "contradictions": p.contradictions,
                }
                for p in patterns
            ],
            "convergence": self.trajectory.convergence(),
        }

    def close(self) -> None:
        self.repo.close()
