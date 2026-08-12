"""
Scenario Engineering Platform — Engine
Owner: Maryam Yaqoob

Day 2: ScenarioEngine performs structural/local validation and compiles the
three canonical scenario contracts (ScenarioDSLPayload, ScenarioConstraintContract,
ScenarioExpectationContract) into a single, deterministic, executable unit.

Scope boundary (per docs/scenario_engineering_platform_spec.md Part-1,
"Deferred to later parts: scenario lifecycle state machine... Part-2/4"):

  This engine performs NO ontology entity-existence checks. `participants`,
  `organizational_scope`, and `preconditions` are validated only for
  structural well-formedness (non-empty, correctly typed, no duplicates).
  Real entity resolution against Hamza's OntologySnapshotContract is
  deferred to Day 6-7 adapter integration, once Hamza's (Ontology) and
  Ajwa's (Enterprise) real contracts are wired in.

No cross-platform imports: this module only touches the Scenario
Engineering Platform's own contracts and the shared base contracts.
"""

from __future__ import annotations

import hashlib
from typing import Any

from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
    ScenarioConstraintContract,
    ScenarioDSLPayload,
    ScenarioExpectationContract,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
)

PLATFORM_SOURCE = "scenario_engineering"


class CompiledScenario:
    """
    Immutable result of compiling a ScenarioDSLPayload plus its associated
    constraint/expectation contracts into a single executable unit for the
    Simulation Runtime.
    """

    __slots__ = (
        "scenario_id",
        "payload",
        "constraints",
        "expectations",
        "fingerprint",
    )

    def __init__(
        self,
        scenario_id: str,
        payload: ScenarioDSLPayload,
        constraints: ScenarioConstraintContract | None,
        expectations: ScenarioExpectationContract | None,
        fingerprint: str,
    ) -> None:
        self.scenario_id = scenario_id
        self.payload = payload
        self.constraints = constraints
        self.expectations = expectations
        self.fingerprint = fingerprint

    def __repr__(self) -> str:  # pragma: no cover - debug convenience only
        return (
            f"CompiledScenario(scenario_id={self.scenario_id!r}, "
            f"fingerprint={self.fingerprint[:12]}...)"
        )


class ScenarioEngine:
    """
    Day 2 engine: structural compilation, local precondition validation,
    and expected-outcome assembly for canonical scenario contracts.

    Does NOT score outcomes (that is Amina's Validation & Evaluation
    boundary) and does NOT check ontology entity existence (deferred to
    Day 6-7, see module docstring).
    """

    def compile_scenario(
        self,
        payload: ScenarioDSLPayload,
        constraints: ScenarioConstraintContract | None = None,
        expectations: ScenarioExpectationContract | None = None,
    ) -> CompiledScenario:
        """
        Validate structural consistency across the supplied scenario
        contracts and produce a single deterministic CompiledScenario.

        Raises ArcturusValidationError on any structural defect, including
        a scenario_id mismatch between the payload and its constraint or
        expectation contracts.
        """
        self._validate_payload(payload)

        if constraints is not None:
            self._validate_cross_reference(
                payload.scenario_id, constraints.scenario_id, "ScenarioConstraintContract"
            )
            self._validate_constraints(constraints)

        if expectations is not None:
            self._validate_cross_reference(
                payload.scenario_id, expectations.scenario_id, "ScenarioExpectationContract"
            )
            self._validate_expectations(expectations)

        fingerprint = self._build_fingerprint(payload, constraints, expectations)

        return CompiledScenario(
            scenario_id=payload.scenario_id,
            payload=payload,
            constraints=constraints,
            expectations=expectations,
            fingerprint=fingerprint,
        )

    def evaluate_preconditions(self, payload: ScenarioDSLPayload) -> list[str]:
        """
        Structural/local validation of `preconditions` only. Does NOT check
        whether referenced entities actually exist in the ontology — that
        check is deferred to Day 6-7 (see module docstring).

        Returns the normalized (stripped, de-duplicated) precondition list
        on success. Raises ArcturusValidationError on any structural
        defect: missing list, empty/non-string entries, or duplicates.
        """
        if not payload.preconditions:
            raise ArcturusValidationError(
                f"scenario '{payload.scenario_id}' has no preconditions defined",
                PLATFORM_SOURCE,
            )

        normalized: list[str] = []
        seen: set[str] = set()
        for index, condition in enumerate(payload.preconditions):
            if not isinstance(condition, str) or not condition.strip():
                raise ArcturusValidationError(
                    f"scenario '{payload.scenario_id}' precondition[{index}] is empty or non-string",
                    PLATFORM_SOURCE,
                )
            cleaned = condition.strip()
            if cleaned.lower() in seen:
                raise ArcturusValidationError(
                    f"scenario '{payload.scenario_id}' has a duplicate precondition: '{cleaned}'",
                    PLATFORM_SOURCE,
                )
            seen.add(cleaned.lower())
            normalized.append(cleaned)

        return normalized

    def build_expected_outcome(
        self,
        payload: ScenarioDSLPayload,
        expectations: ScenarioExpectationContract,
    ) -> dict[str, Any]:
        """
        Assemble a single structured "expected outcome" view for a scenario
        by combining its identity with its expectation contract. Purely
        local assembly — no scoring, no ontology lookups (Amina's
        Validation & Evaluation platform owns scoring against this).
        """
        self._validate_cross_reference(
            payload.scenario_id, expectations.scenario_id, "ScenarioExpectationContract"
        )
        self._validate_expectations(expectations)

        return {
            "scenario_id": payload.scenario_id,
            "trigger_event": payload.trigger_event,
            "success_criteria": list(expectations.success_criteria),
            "failure_conditions": list(expectations.failure_conditions),
            "expected_outcomes": list(expectations.expected_outcomes),
            "metrics": list(expectations.metrics),
            "termination_conditions": list(expectations.termination_conditions),
        }

    # ------------------------------------------------------------------
    # Private validation helpers
    # ------------------------------------------------------------------

    def _validate_payload(self, payload: ScenarioDSLPayload) -> None:
        if not payload.participants:
            raise ArcturusValidationError(
                f"scenario '{payload.scenario_id}' has no participants defined",
                PLATFORM_SOURCE,
            )
        if not payload.organizational_scope:
            raise ArcturusValidationError(
                f"scenario '{payload.scenario_id}' has no organizational_scope defined",
                PLATFORM_SOURCE,
            )
        # Full structural check (including duplicate detection); result is
        # discarded here since compile_scenario() only needs pass/fail.
        self.evaluate_preconditions(payload)

    def _validate_constraints(self, constraints: ScenarioConstraintContract) -> None:
        for key, value in constraints.hard_limits.items():
            if not isinstance(key, str) or not key.strip():
                raise ArcturusValidationError(
                    f"scenario '{constraints.scenario_id}' has a hard_limits key that is empty or non-string",
                    PLATFORM_SOURCE,
                )
            if isinstance(value, bool):
                continue
            if not isinstance(value, (int, float)):
                raise ArcturusValidationError(
                    f"scenario '{constraints.scenario_id}' hard_limits['{key}'] must be numeric or boolean",
                    PLATFORM_SOURCE,
                )

    def _validate_expectations(self, expectations: ScenarioExpectationContract) -> None:
        if not expectations.success_criteria:
            raise ArcturusValidationError(
                f"scenario '{expectations.scenario_id}' has no success_criteria defined",
                PLATFORM_SOURCE,
            )
        if not expectations.termination_conditions:
            raise ArcturusValidationError(
                f"scenario '{expectations.scenario_id}' has no termination_conditions defined",
                PLATFORM_SOURCE,
            )

    def _validate_cross_reference(
        self, expected_id: str, actual_id: str, contract_name: str
    ) -> None:
        if expected_id != actual_id:
            raise ArcturusValidationError(
                f"{contract_name}.scenario_id '{actual_id}' does not match "
                f"ScenarioDSLPayload.scenario_id '{expected_id}'",
                PLATFORM_SOURCE,
            )

    def _build_fingerprint(
        self,
        payload: ScenarioDSLPayload,
        constraints: ScenarioConstraintContract | None,
        expectations: ScenarioExpectationContract | None,
    ) -> str:
        """
        Deterministic fingerprint over the compiled scenario's structural
        content. Deliberately excludes context.run_id/trace_id/created_at
        (which change on every run and must not affect the fingerprint of
        an otherwise-identical scenario definition).
        """
        parts: list[str] = [
            payload.scenario_id,
            payload.description,
            payload.trigger_event,
            "|".join(sorted(payload.participants)),
            "|".join(sorted(payload.organizational_scope)),
            "|".join(sorted(p.strip().lower() for p in payload.preconditions)),
        ]
        if constraints is not None:
            parts.append("|".join(sorted(constraints.constraints)))
            parts.append(
                "|".join(f"{k}={v}" for k, v in sorted(constraints.hard_limits.items()))
            )
        if expectations is not None:
            parts.append("|".join(sorted(expectations.success_criteria)))
            parts.append("|".join(sorted(expectations.failure_conditions)))
            parts.append("|".join(sorted(expectations.termination_conditions)))

        digest_input = "::".join(parts).encode("utf-8")
        return hashlib.sha256(digest_input).hexdigest()