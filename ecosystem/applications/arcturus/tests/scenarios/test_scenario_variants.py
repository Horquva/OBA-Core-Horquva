"""
Unit tests for src/control_plane/scenarios/scenario_variants.py

Written directly against the real scenario_variants.py source (module
docstring + generate_variant() + _derive_variant_id() confirmed by file
inspection, not assumed). Confirmed real behavior:

  - generate_variant(base_payload, base_compiled, variant_label,
    parameter_overrides) -> tuple[ScenarioDSLPayload, VariantLineage]
      * Raises ArcturusValidationError if variant_label is empty or
        whitespace-only (checked via `not label or not label.strip()`,
        the label itself is NOT stripped before being stored).
      * Raises ArcturusValidationError if any parameter_overrides key is
        not already present in base_payload.variables ("does not invent
        unsupported parameters").
      * Merges parameter_overrides into a COPY of base_payload.variables
        (base_payload itself is never mutated â€” .model_copy(update=...)).
      * variant_scenario_id == base_scenario_id ALWAYS (per
        _derive_variant_id(): a variant is a different *configuration* of
        the same scenario_id, not a new identity â€” distinguished instead
        by variant_label + differing fingerprint).
      * VariantLineage.base_fingerprint is read off base_compiled.fingerprint
        (base_compiled is never otherwise inspected by generate_variant).
      * VariantLineage.parameter_overrides is a defensive copy
        (dict(parameter_overrides)), not the same dict object passed in.

ScenarioDSLPayload/SimulationContext shapes confirmed from
contracts/control/scenarios/base_models.py and contracts/shared/base_models.py.
CompiledScenario shape (a __slots__ class) confirmed from scenario_engine.py.

Run with:
  python -m pytest ecosystem/applications/arcturus/tests/scenarios/test_scenario_variants.py -v
"""

import pytest

from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
    ScenarioDSLPayload,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
    SimulationContext,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_engine import (
    CompiledScenario,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_variants import (
    VariantLineage,
    generate_variant,
)


# ---------------------------------------------------------------------------
# Fixtures / builders
# ---------------------------------------------------------------------------

def _context(experiment_id: str = "EXP-VAR-001", seed: int = 7) -> SimulationContext:
    return SimulationContext(experiment_id=experiment_id, global_seed=seed)


def _payload(
    scenario_id: str = "SCN-HR-001",
    variables: dict | None = None,
) -> ScenarioDSLPayload:
    return ScenarioDSLPayload(
        context=_context(),
        scenario_id=scenario_id,
        description="Base scenario for variant tests",
        trigger_event="quarterly_review",
        participants=["HR Lead"],
        organizational_scope=["HR"],
        preconditions=["headcount_freeze_lifted"],
        variables=variables if variables is not None else {
            "severity": 1,
            "duration_days": 30,
        },
    )


def _compiled(
    scenario_id: str = "SCN-HR-001", fingerprint: str = "fp-base-000"
) -> CompiledScenario:
    """
    Minimal CompiledScenario stand-in. generate_variant() only reads
    .fingerprint off base_compiled, so payload/constraints/expectations
    are left None (same convention used in test_scenario_registry.py).
    """
    return CompiledScenario(
        scenario_id=scenario_id,
        payload=None,
        constraints=None,
        expectations=None,
        fingerprint=fingerprint,
    )


# ---------------------------------------------------------------------------
# Happy path: merging overrides, preserving fields, scenario_id behavior
# ---------------------------------------------------------------------------

class TestGenerateVariantHappyPath:

    def test_variant_merges_overrides_into_variables(self):
        base = _payload(variables={"severity": 1, "duration_days": 30})
        variant_payload, _ = generate_variant(
            base, _compiled(), "high_severity", {"severity": 3}
        )
        assert variant_payload.variables == {"severity": 3, "duration_days": 30}

    def test_variant_scenario_id_equals_base_scenario_id(self):
        """Per _derive_variant_id(): a variant is NOT a new scenario_id,
        it stays under the base scenario_id (distinguished by label +
        fingerprint instead)."""
        base = _payload(scenario_id="SCN-HR-001")
        variant_payload, lineage = generate_variant(
            base, _compiled(), "variant_a", {}
        )
        assert variant_payload.scenario_id == "SCN-HR-001"
        assert lineage.variant_scenario_id == "SCN-HR-001"

    def test_variant_preserves_non_variable_fields_unchanged(self):
        base = _payload()
        variant_payload, _ = generate_variant(
            base, _compiled(), "variant_a", {"severity": 5}
        )
        assert variant_payload.description == base.description
        assert variant_payload.trigger_event == base.trigger_event
        assert variant_payload.participants == base.participants
        assert variant_payload.organizational_scope == base.organizational_scope
        assert variant_payload.preconditions == base.preconditions

    def test_empty_parameter_overrides_still_produces_valid_variant(self):
        base = _payload(variables={"severity": 1})
        variant_payload, lineage = generate_variant(
            base, _compiled(), "no_change_variant", {}
        )
        assert variant_payload.variables == {"severity": 1}
        assert lineage.parameter_overrides == {}


# ---------------------------------------------------------------------------
# VariantLineage contents
# ---------------------------------------------------------------------------

class TestVariantLineage:

    def test_lineage_records_base_identity_and_fingerprint(self):
        base = _payload(scenario_id="SCN-HR-001", variables={"severity": 1})
        compiled = _compiled(scenario_id="SCN-HR-001", fingerprint="fp-abc123")
        _, lineage = generate_variant(base, compiled, "peak_load", {"severity": 4})

        assert isinstance(lineage, VariantLineage)
        assert lineage.base_scenario_id == "SCN-HR-001"
        assert lineage.base_fingerprint == "fp-abc123"
        assert lineage.variant_scenario_id == "SCN-HR-001"
        assert lineage.variant_label == "peak_load"
        assert lineage.parameter_overrides == {"severity": 4}

    def test_lineage_parameter_overrides_is_a_defensive_copy(self):
        """Mutating the caller's dict AFTER the call must not affect the
        already-built lineage (generate_variant does dict(parameter_overrides))."""
        base = _payload(variables={"severity": 1})
        overrides = {"severity": 2}
        _, lineage = generate_variant(base, _compiled(), "variant_a", overrides)

        overrides["severity"] = 999
        overrides["new_key"] = "should_not_appear"

        assert lineage.parameter_overrides == {"severity": 2}

    def test_variant_label_is_stored_verbatim_not_stripped(self):
        """The label is validated via .strip() but stored as originally
        given (the code never reassigns variant_label to its stripped form)."""
        base = _payload(variables={})
        _, lineage = generate_variant(base, _compiled(), "  Peak Load  ", {})
        assert lineage.variant_label == "  Peak Load  "


# ---------------------------------------------------------------------------
# Rejection: unknown override keys ("no inventing unsupported parameters")
# ---------------------------------------------------------------------------

class TestRejectsUnknownOverrideKeys:

    def test_unknown_override_key_raises(self):
        base = _payload(variables={"severity": 1})
        with pytest.raises(ArcturusValidationError):
            generate_variant(base, _compiled(), "bad_variant", {"budget": 5000})

    def test_error_message_lists_only_unknown_keys(self):
        base = _payload(variables={"severity": 1, "duration_days": 30})
        with pytest.raises(ArcturusValidationError) as exc_info:
            generate_variant(
                base,
                _compiled(),
                "mixed_variant",
                {"severity": 2, "unknown_param": "x"},
            )
        message = str(exc_info.value)
        assert "unknown_param" in message
        assert "severity" not in message

    def test_multiple_unknown_keys_all_reported(self):
        base = _payload(variables={"severity": 1})
        with pytest.raises(ArcturusValidationError) as exc_info:
            generate_variant(
                base, _compiled(), "variant_a", {"foo": 1, "bar": 2}
            )
        message = str(exc_info.value)
        assert "foo" in message
        assert "bar" in message


# ---------------------------------------------------------------------------
# variant_label validation
# ---------------------------------------------------------------------------

class TestVariantLabelValidation:

    def test_empty_string_label_raises(self):
        base = _payload(variables={})
        with pytest.raises(ArcturusValidationError):
            generate_variant(base, _compiled(), "", {})

    def test_whitespace_only_label_raises(self):
        base = _payload(variables={})
        with pytest.raises(ArcturusValidationError):
            generate_variant(base, _compiled(), "   ", {})

    def test_none_label_raises(self):
        base = _payload(variables={})
        with pytest.raises(ArcturusValidationError):
            generate_variant(base, _compiled(), None, {})  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# Isolation: base_payload must never be mutated
# ---------------------------------------------------------------------------

class TestVariantIsolationFromBase:

    def test_base_payload_variables_not_mutated(self):
        base = _payload(variables={"severity": 1, "duration_days": 30})
        original_variables = dict(base.variables)

        generate_variant(base, _compiled(), "variant_a", {"severity": 9})

        assert base.variables == original_variables

    def test_variant_payload_is_a_distinct_object_from_base(self):
        base = _payload(variables={"severity": 1})
        variant_payload, _ = generate_variant(base, _compiled(), "variant_a", {})
        assert variant_payload is not base
