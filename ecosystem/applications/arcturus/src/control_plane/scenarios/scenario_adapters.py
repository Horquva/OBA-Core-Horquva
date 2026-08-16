"""
Scenario Engineering Platform — Adapters
Owner: Maryam Yaqoob

Anti-Corruption Layer (ACL) for the Scenario Engineering Platform.

Wraps ScenarioEngine so downstream platforms never touch CompiledScenario
(an internal engine type) directly. Each adapter method assembles a plain,
transport-safe payload from this platform's own canonical contracts
(ScenarioDSLPayload, ScenarioConstraintContract, ScenarioExpectationContract)
plus the compiled/derived state produced by ScenarioEngine.

Outbound consumers:
  - Muhammad Maaz Khan (Simulation Runtime & Experiment) -> to_runtime_dispatch()
  - Amina Khan (Validation & Evaluation)                 -> to_validation_handoff()

Known open item (see contracts/control/scenarios/base_models.py module
docstring): Maaz's local ScenarioDSLPayload stub in
contracts/simulation/base_models.py carries a top-level `seed` field and an
`extra_fields` dict that do not appear in the canonical contract defined by
this platform. That mismatch has NOT been reconciled with Maaz. To avoid
silently coupling to a possibly-stale stub, to_runtime_dispatch() below
deliberately returns a plain dict rather than instantiating his local
contract class. Once reconciled, this should be revisited.

Architectural law: this module imports ONLY from this platform's own
contracts, the shared contracts, and scenario_engine.py (same platform). It
must never import another platform's src/ internals directly (§2.1).
"""

from __future__ import annotations

from typing import Any

from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
    ScenarioConstraintContract,
    ScenarioDSLPayload,
    ScenarioExpectationContract,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_engine import (
    CompiledScenario,
    ScenarioEngine,
)

PLATFORM_SOURCE = "scenario_engineering"


class ScenarioAdapter:
    """
    Adapter / ACL layer for the Scenario Engineering Platform.

    Wraps a ScenarioEngine instance and exposes only plain, serializable
    payload shapes to downstream platforms -- never the internal
    CompiledScenario object.
    """

    def __init__(self, engine: ScenarioEngine | None = None) -> None:
        self.engine = engine or ScenarioEngine()

    # ------------------------------------------------------------------
    # Compilation entry point
    # ------------------------------------------------------------------

    def compile(
        self,
        payload: ScenarioDSLPayload,
        constraints: ScenarioConstraintContract | None = None,
        expectations: ScenarioExpectationContract | None = None,
    ) -> CompiledScenario:
        """Thin passthrough to ScenarioEngine.compile_scenario()."""
        return self.engine.compile_scenario(payload, constraints, expectations)

    # ------------------------------------------------------------------
    # Outbound to Muhammad Maaz Khan (Simulation Runtime & Experiment)
    # ------------------------------------------------------------------

    def to_runtime_dispatch(self, compiled: CompiledScenario) -> dict[str, Any]:
        """
        Build the outbound dispatch payload consumed by the Simulation
        Runtime to initialize a run.

        Deliberately a plain dict (see module docstring) -- Maaz's local
        ScenarioDSLPayload stub has not been reconciled with the canonical
        contract shape defined by this platform.
        """
        payload = compiled.payload
        constraints = compiled.constraints

        return {
            "scenario_id": compiled.scenario_id,
            "fingerprint": compiled.fingerprint,
            "trigger_event": payload.trigger_event,
            "participants": list(payload.participants),
            "organizational_scope": list(payload.organizational_scope),
            "preconditions": self.engine.evaluate_preconditions(payload),
            "variables": dict(payload.variables),
            "constraints": list(constraints.constraints) if constraints else [],
            "hard_limits": dict(constraints.hard_limits) if constraints else {},
        }

    # ------------------------------------------------------------------
    # Outbound to Amina Khan (Validation & Evaluation)
    # ------------------------------------------------------------------

    def to_validation_handoff(self, compiled: CompiledScenario) -> dict[str, Any]:
        """
        Build the outbound baseline-expectation payload consumed by the
        Validation & Evaluation Platform to score an executed run.

        Raises ArcturusValidationError if the compiled scenario was built
        without an expectations contract -- Validation cannot score a run
        against an undefined baseline.
        """
        if compiled.expectations is None:
            raise ArcturusValidationError(
                f"scenario '{compiled.scenario_id}' was compiled without "
                "expectations; cannot build a validation handoff payload",
                PLATFORM_SOURCE,
            )

        outcome = self.engine.build_expected_outcome(
            compiled.payload, compiled.expectations
        )
        outcome["fingerprint"] = compiled.fingerprint
        return outcome

    # ------------------------------------------------------------------
    # Generic serialization (persistence / API responses)
    # ------------------------------------------------------------------

    @staticmethod
    def serialize(compiled: CompiledScenario) -> dict[str, Any]:
        """Flat, JSON-safe representation of a CompiledScenario."""
        return {
            "scenario_id": compiled.scenario_id,
            "fingerprint": compiled.fingerprint,
            "payload": compiled.payload.model_dump(mode="json"),
            "constraints": (
                compiled.constraints.model_dump(mode="json")
                if compiled.constraints
                else None
            ),
            "expectations": (
                compiled.expectations.model_dump(mode="json")
                if compiled.expectations
                else None
            ),
        }
