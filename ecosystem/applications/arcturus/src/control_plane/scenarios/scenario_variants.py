r"""
Scenario Engineering Platform — Variants
Owner: Maryam Yaqoob

Part-4 gap closure: no "variant" concept existed anywhere in this
platform's code before this file (confirmed via repository grep — zero
matches for "variant" in scenario_engine.py / scenario_adapters.py).

Purpose: generate a controlled variant of an existing ScenarioDSLPayload
by overriding a subset of its `variables`, while preserving traceable
lineage back to the base scenario (base scenario_id + base fingerprint),
per Part 4 §3 ("each variant can be associated with the available base
Scenario, version, experiment, parameter configuration, seed/config").

ASSUMPTION FLAGGED: the spec does not define a dedicated Pydantic
contract for variant lineage in contracts/control/scenarios/base_models.py
(that file only has ScenarioDSLPayload / ScenarioConstraintContract /
ScenarioExpectationContract). Rather than silently add a new shared
contract that Maaz/Amina would also need to consume (a cross-cutting
change outside this platform's Day-2 boundary), I've kept
VariantLineage as a local, platform-owned dataclass for now. If Runtime
or Validation need to consume lineage directly as a typed contract, that
should be raised with Hashim/Maaz explicitly before adding it to the
shared contracts module (per §2.1 "No Coupling Without Contract" — a
new shared contract should be a deliberate, reviewed addition, not a
silent one).

A variant's own `scenario_id` is derived deterministically from the base
scenario_id plus a variant_label, matching the existing
SCENARIO_ID_PATTERN (^SCN-[A-Z]{2}-\d{3}$) is NOT guaranteed by this
scheme — see _derive_variant_id() docstring for the exact assumption.

No cross-platform imports: only this platform's own contracts and
its own src/ (scenario_engine.py).
"""

from __future__ import annotations

from dataclasses import dataclass

from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
    ScenarioDSLPayload,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_engine import (
    CompiledScenario,
)

PLATFORM_SOURCE = "scenario_engineering"


@dataclass(frozen=True)
class VariantLineage:
    """
    Traceable link from a variant back to its base scenario.

    Kept local/platform-owned rather than a shared Pydantic contract —
    see module docstring "ASSUMPTION FLAGGED" section.
    """

    base_scenario_id: str
    base_fingerprint: str
    variant_scenario_id: str
    variant_label: str
    parameter_overrides: dict[str, object]


def _derive_variant_id(base_scenario_id: str, variant_label: str) -> str:
    """
    Derive a variant's scenario_id from its base.

    ASSUMPTION: ScenarioDSLPayload.scenario_id is constrained to the
    pattern ^SCN-[A-Z]{2}-\d{3}$ (e.g. 'SCN-WF-004'). A variant cannot
    simply append a suffix like '-A' without breaking that pattern, and
    there is no existing convention in the spec or codebase for how a
    variant's ID should look. Until this is confirmed with the team,
    this function does NOT invent a new scenario_id — it keeps the
    variant under the SAME scenario_id as its base (this is intentional:
    a variant is a different *configuration* of the same scenario, not a
    different scenario identity). Lineage/distinction between variants of
    the same scenario_id is carried instead by `variant_label` and the
    compiled fingerprint (which will differ because `variables` differ).
    """
    return base_scenario_id


def generate_variant(
    base_payload: ScenarioDSLPayload,
    base_compiled: CompiledScenario,
    variant_label: str,
    parameter_overrides: dict[str, object],
) -> tuple[ScenarioDSLPayload, VariantLineage]:
    """
    Produce a new ScenarioDSLPayload that is identical to base_payload
    except for the given `parameter_overrides` merged into `variables`.

    Does NOT invent unsupported parameters: every key in
    parameter_overrides must already exist in base_payload.variables,
    per Part 4 §1 ("Do not invent unsupported parameters solely for the
    test"). Raises ArcturusValidationError if an override key is not
    already a known variable on the base scenario.

    Returns (variant_payload, lineage) — the caller is responsible for
    running variant_payload back through ScenarioEngine.compile_scenario()
    to obtain a new CompiledScenario/fingerprint for this variant.
    """
    if not variant_label or not variant_label.strip():
        raise ArcturusValidationError(
            f"variant of scenario '{base_payload.scenario_id}' must have a "
            f"non-empty variant_label",
            PLATFORM_SOURCE,
        )

    unknown_keys = set(parameter_overrides.keys()) - set(base_payload.variables.keys())
    if unknown_keys:
        raise ArcturusValidationError(
            f"variant of scenario '{base_payload.scenario_id}' references "
            f"parameter(s) not present on the base scenario: "
            f"{sorted(unknown_keys)}",
            PLATFORM_SOURCE,
        )

    merged_variables = dict(base_payload.variables)
    merged_variables.update(parameter_overrides)

    variant_scenario_id = _derive_variant_id(base_payload.scenario_id, variant_label)

    variant_payload = base_payload.model_copy(
        update={"variables": merged_variables, "scenario_id": variant_scenario_id}
    )

    lineage = VariantLineage(
        base_scenario_id=base_payload.scenario_id,
        base_fingerprint=base_compiled.fingerprint,
        variant_scenario_id=variant_scenario_id,
        variant_label=variant_label,
        parameter_overrides=dict(parameter_overrides),
    )

    return variant_payload, lineage


__all__ = ["VariantLineage", "generate_variant"]