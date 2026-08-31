"""
Scenario Engineering Platform — Controller
Owner: Maryam Yaqoob

Day 4: ScenarioController is the single coherent entry point tying together
ScenarioEngine + ScenarioAdapter + ScenarioRegistry + ScenarioLifecycleManager
+ scenario_variants, mirroring ontology_controller.py's pattern (plain
Python class, no FastAPI, instantiated as a module-level singleton).

ASSUMPTIONS FLAGGED (not yet confirmed with Hashim):

1. Naming: "scenario_controller.py" is read as the src/-side plain
   controller (this file), mirroring ontology_controller.py, with the
   FastAPI router living separately in api/routers/scenarios.py
   (mirroring api/routers/ontology.py). If Hashim meant the ROUTER file
   itself should be named scenario_controller.py, only the router's
   filename changes -- this controller class is unaffected.

2. compile_and_register()'s lifecycle bootstrap only fires the FIRST time
   a given scenario_id is compiled (checked via registry.exists() BEFORE
   calling register()). A later recompile of an existing scenario_id --
   including a variant sharing its base scenario_id, see
   scenario_variants.py's module docstring on why variants keep the same
   scenario_id -- does NOT reset or re-run lifecycle bootstrap. This means
   a variant and its base scenario currently share ONE lifecycle track.
   If variants should get independent lifecycle tracking, that is a
   design change requiring Hashim's/Maaz's input, not just mine.

3. ArcturusValidationError's constructor signature -- (message: str,
   platform_source: str) -- is inferred from its consistent call pattern
   across scenario_engine.py / scenario_adapters.py / scenario_registry.py
   / scenario_lifecycle.py / scenario_variants.py /
   scenario_context_resolver.py. Not independently confirmed against
   contracts/shared/base_models.py itself, which has not been pasted on
   this branch as of this file being written.

4. Context resolution (resolve_scenario_context() /
   verify_workflow_compatibility() from scenario_context_resolver.py) is
   DEFERRED from this controller for now -- it depends on Ajwa's
   EnterpriseInstancePayload and Javeria's WorkflowDefinitionContract,
   neither of which has been independently verified on this branch.
   Add resolve_context() / check_workflow_compatibility() wrapping those
   two functions once those contracts are confirmed.

No cross-platform imports beyond what the wrapped modules already import
(this file only imports its own platform's contracts and its own src/).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
    ScenarioConstraintContract,
    ScenarioDSLPayload,
    ScenarioExpectationContract,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_adapters import (
    ScenarioAdapter,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_engine import (
    CompiledScenario,
    ScenarioEngine,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_lifecycle import (
    ScenarioLifecycleManager,
    ScenarioLifecycleState,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_registry import (
    ScenarioRegistry,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_variants import (
    VariantLineage,
    generate_variant,
)

PLATFORM_SOURCE = "scenario_engineering"


class ScenarioController:
    """
    Single coherent entry point for the Scenario Engineering Platform's
    control plane. Ties together compilation (engine/adapter), storage
    (registry), and state tracking (lifecycle) into one object, mirroring
    ontology_controller.py's pattern. Plain Python -- no FastAPI here;
    api/routers/scenarios.py wraps this class for HTTP.
    """

    def __init__(self) -> None:
        self.engine = ScenarioEngine()
        self.adapter = ScenarioAdapter(self.engine)
        self.registry = ScenarioRegistry()
        self.lifecycle = ScenarioLifecycleManager()

    # ------------------------------------------------------------------
    # Compile + register
    # ------------------------------------------------------------------

    def compile_and_register(
        self,
        payload: ScenarioDSLPayload,
        constraints: ScenarioConstraintContract | None = None,
        expectations: ScenarioExpectationContract | None = None,
    ) -> CompiledScenario:
        """
        Compile `payload` (plus optional constraints/expectations) via the
        adapter and register the result in the registry (idempotent per
        fingerprint -- see ScenarioRegistry.register()).

        The FIRST time a given scenario_id is compiled, this also
        bootstraps its lifecycle: start() -> DEFINED, then an immediate
        transition to VALIDATED (since compile_scenario() already
        performed that structural validation as part of producing a
        CompiledScenario). See module docstring ASSUMPTION 2 for what
        "first time" means here and its interaction with variants.
        """
        is_first_compile = not self.registry.exists(payload.scenario_id)

        compiled = self.adapter.compile(payload, constraints, expectations)
        self.registry.register(compiled)

        if is_first_compile:
            self.lifecycle.start(payload.scenario_id)
            self.lifecycle.transition(
                payload.scenario_id, ScenarioLifecycleState.VALIDATED
            )

        return compiled

    # ------------------------------------------------------------------
    # Lookups (delegate to registry)
    # ------------------------------------------------------------------

    def get_latest(self, scenario_id: str) -> CompiledScenario:
        return self.registry.get_latest(scenario_id)

    def get_version(self, scenario_id: str, fingerprint: str) -> CompiledScenario:
        return self.registry.get_version(scenario_id, fingerprint)

    def list_versions(self, scenario_id: str) -> list[str]:
        return self.registry.list_versions(scenario_id)

    def list_scenario_ids(self) -> list[str]:
        return self.registry.list_scenario_ids()

    # ------------------------------------------------------------------
    # Outbound payloads (against latest registered version)
    # ------------------------------------------------------------------

    def get_serialized(self, scenario_id: str) -> dict[str, Any]:
        compiled = self.registry.get_latest(scenario_id)
        return self.adapter.serialize(compiled)

    def get_runtime_dispatch(self, scenario_id: str) -> dict[str, Any]:
        compiled = self.registry.get_latest(scenario_id)
        return self.adapter.to_runtime_dispatch(compiled)

    def get_validation_handoff(self, scenario_id: str) -> dict[str, Any]:
        compiled = self.registry.get_latest(scenario_id)
        return self.adapter.to_validation_handoff(compiled)

    def get_preconditions(self, scenario_id: str) -> list[str]:
        compiled = self.registry.get_latest(scenario_id)
        return self.engine.evaluate_preconditions(compiled.payload)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def get_lifecycle_state(self, scenario_id: str) -> ScenarioLifecycleState:
        return self.lifecycle.current_state(scenario_id)

    def get_lifecycle_history(
        self, scenario_id: str
    ) -> list[tuple[ScenarioLifecycleState, datetime]]:
        return self.lifecycle.history(scenario_id)

    def advance_lifecycle(
        self, scenario_id: str, to_state: ScenarioLifecycleState
    ) -> ScenarioLifecycleState:
        """
        Explicit, externally-driven lifecycle transition (e.g. READY,
        ACTIVATED, ACTIVE, COMPLETED, FAILED, TERMINATED). Nothing in
        this controller auto-drives these from Runtime today -- a caller
        (API consumer, or a future Runtime callback) must call this
        explicitly.
        """
        return self.lifecycle.transition(scenario_id, to_state)

    # ------------------------------------------------------------------
    # Variants
    # ------------------------------------------------------------------

    def create_variant(
        self,
        scenario_id: str,
        variant_label: str,
        parameter_overrides: dict[str, object],
    ) -> tuple[CompiledScenario, VariantLineage]:
        """
        Generate and register a variant of the latest registered version
        of `scenario_id`. The variant keeps the SAME scenario_id as its
        base (see scenario_variants.py module docstring) and is
        distinguished by fingerprint + VariantLineage.variant_label.

        Because the variant shares its base's scenario_id, and that
        scenario_id already exists in the registry, compile_and_register()
        will NOT re-bootstrap lifecycle for it (see module docstring
        ASSUMPTION 2) -- the variant is tracked under the base's existing
        lifecycle.
        """
        base_compiled = self.registry.get_latest(scenario_id)
        variant_payload, lineage = generate_variant(
            base_compiled.payload, base_compiled, variant_label, parameter_overrides
        )
        variant_compiled = self.compile_and_register(variant_payload)
        return variant_compiled, lineage


scenario_controller = ScenarioController()

__all__ = ["ScenarioController", "scenario_controller"]
