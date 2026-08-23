"""
Capability Validation Service
Roadmap Reference: PART-5 — Build Capability Validation Services + Cross-Platform Integration

This is the single entry point other Antares platforms use to interact
with Capability Validation. It is intentionally the ONLY public surface —
internal engine/model modules should not be called directly by other services.

Zara's boundary (enforced here):
- Accepts capability objects from upstream discovery platforms.
- Does NOT perform discovery.
- Does NOT operationalize validated capabilities.
- Returns machine-readable, explainable results only.
"""

from __future__ import annotations

from app.models.capability import Capability
from app.models.assessment import ValidationResult, ValidationState
from app.engine.assessment_engine import AssessmentEngine
from app.engine.decision_engine import DecisionEngine, CapabilityDecisionRecord


class CapabilityValidationService:
    """
    In-memory reference implementation of the validation service surface.
    In production this would be backed by the shared Antares data layer
    (data/ + registry/capability-registry, capability-lifecycle-registry).
    """

    def __init__(self):
        self._assessment_engine = AssessmentEngine()
        self._decision_engine = DecisionEngine()
        self._capabilities: dict[str, Capability] = {}
        self._results: dict[str, ValidationResult] = {}
        self._records: dict[str, CapabilityDecisionRecord] = {}

    # ---- Intake -------------------------------------------------------

    def submit_capability(self, capability: Capability) -> dict:
        """Capability submission endpoint."""
        self._capabilities[capability.capability_id] = capability
        if capability.capability_id not in self._records:
            self._records[capability.capability_id] = CapabilityDecisionRecord(
                capability_id=capability.capability_id
            )
        return {"capability_id": capability.capability_id, "status": "RECEIVED"}

    # ---- Validation initiation & retrieval -----------------------------

    def initiate_validation(self, capability_id: str) -> ValidationResult:
        """Validation initiation endpoint — runs assessment + decision."""
        capability = self._require_capability(capability_id)
        record = self._records[capability_id]

        # Structural pre-check. Capabilities that fail it never enter
        # review at all, so UNDER_REVIEW is only recorded for capabilities
        # that actually reach the assessment pipeline.
        if capability.required_fields_present():
            result = self._assessment_engine.assess(capability)
            result = self._decision_engine.decide(result)
            self._results[capability_id] = result
            self._decision_engine.record_decision(record, result)
            return result

        self._decision_engine.mark_under_review(record, capability_id)

        result = self._assessment_engine.assess(capability)
        result = self._decision_engine.decide(result)

        self._results[capability_id] = result
        self._decision_engine.record_decision(record, result)
        return result

    def get_assessment(self, capability_id: str) -> ValidationResult:
        """Assessment retrieval endpoint."""
        return self._require_result(capability_id)

    def get_status(self, capability_id: str) -> ValidationState:
        """Validation status endpoint."""
        return self._require_result(capability_id).state

    def get_decision_reasoning(self, capability_id: str) -> dict:
        """Decision reasoning endpoint — full explainable trace."""
        result = self._require_result(capability_id)
        return result.to_dict()

    def get_validation_history(self, capability_id: str) -> list[dict]:
        """Validation history endpoint — traceable across revisions."""
        record = self._records.get(capability_id)
        if not record:
            return []
        return [
            {
                "timestamp": e.timestamp.isoformat(),
                "state": e.state.value,
                "overall_score": round(e.overall_score, 3),
                "recommendation": e.recommendation,
            }
            for e in record.history
        ]

    # ---- Evidence & revision -------------------------------------------

    def submit_evidence(self, capability_id: str, evidence_reference) -> dict:
        """Evidence submission endpoint."""
        capability = self._require_capability(capability_id)
        capability.evidence_references.append(evidence_reference)
        return {"capability_id": capability_id, "evidence_count": len(capability.evidence_references)}

    def request_revision(self, capability_id: str, updated_fields: dict) -> dict:
        """
        Revision workflow endpoint.
        Capability -> Assessment -> Revision Required -> Updated Capability
        -> Reassessment -> Validation Decision (history preserved).
        """
        capability = self._require_capability(capability_id)
        for field_name, value in updated_fields.items():
            if hasattr(capability, field_name):
                setattr(capability, field_name, value)
        # Re-run the full pipeline; previous history entry is preserved, not overwritten.
        return self.initiate_validation(capability_id).to_dict()

    # ---- Reporting -------------------------------------------------------

    def get_validation_report(self, capability_id: str) -> dict:
        """Human-readable validation report endpoint."""
        capability = self._require_capability(capability_id)
        result = self._require_result(capability_id)
        return {
            "capability_name": capability.capability_name,
            "capability_id": capability_id,
            "state": result.state.value,
            "overall_score": round(result.overall_score, 3),
            "recommendation": result.recommendation,
            "strengths": [s for f in result.findings for s in f.strengths],
            "weaknesses": [w for f in result.findings for w in f.weaknesses],
            "risks": result.risks,
            "missing_information": result.missing_information,
        }

    # ---- Internal helpers --------------------------------------------

    def _require_capability(self, capability_id: str) -> Capability:
        if capability_id not in self._capabilities:
            raise KeyError(f"Unknown capability_id: {capability_id}")
        return self._capabilities[capability_id]

    def _require_result(self, capability_id: str) -> ValidationResult:
        if capability_id not in self._results:
            raise KeyError(f"No assessment has been run yet for capability_id: {capability_id}")
        return self._results[capability_id]
