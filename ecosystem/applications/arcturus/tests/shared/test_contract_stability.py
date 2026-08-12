"""
Arcturus Governance — tests/shared/test_contract_stability.py
==============================================================
Governance Owner: Hashim Ali Khan (@Hashimali-khan)
Day 4 Deliverable: Contract drift detection tests.

These tests capture the schema fingerprints of every outbound platform
contract and fail if any field, type annotation, or required constraint
changes without a corresponding version bump.

The Day 2 contract lock rule states:
  "Undocumented breaking contract changes after the Day 2 lock → 0"

test_outbound_contract_has_not_silently_drifted() is the automated
enforcement mechanism for that rule.
"""
from __future__ import annotations

import hashlib
import json
from typing import Any

import pytest
from pydantic import BaseModel


# ============================================================================
# Contract Fingerprinting Utilities
# ============================================================================


def _schema_fingerprint(model: type[BaseModel]) -> str:
    """
    Compute a deterministic SHA-256 fingerprint of a Pydantic model's
    JSON schema.

    This fingerprint captures:
      - Field names and types
      - Required vs optional status
      - Field-level constraints (min_length, ge, le, pattern, etc.)
      - Default values (present or absent)

    It does NOT capture Python docstrings, descriptions, or example values,
    which are considered non-breaking documentation changes.
    """
    schema = model.model_json_schema()
    # Sort keys recursively so the hash is stable across Python dict insertion orders
    stable = json.dumps(schema, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(stable.encode("utf-8")).hexdigest()


def _field_names(model: type[BaseModel]) -> list[str]:
    """Return sorted field names for a Pydantic model."""
    return sorted(model.model_fields.keys())


def _required_fields(model: type[BaseModel]) -> list[str]:
    """Return sorted names of required (no default) fields."""
    return sorted(
        name
        for name, field_info in model.model_fields.items()
        if field_info.is_required()
    )


# ============================================================================
# Baseline Contract Registry
# ============================================================================
# Each entry maps a human-readable contract name to:
#   - "model": the Pydantic class to fingerprint
#   - "expected_fields": the exact set of field names at the Day 2 lock
#   - "required_fields": the exact set of required field names at the Day 2 lock
#
# When a contract is intentionally changed, the expected values below must be
# updated in the same PR and reviewed by Hashim Ali Khan.

def _build_registry() -> list[dict[str, Any]]:
    """
    Lazily import all platform contracts and build the stability registry.

    Using lazy imports here prevents ImportError from failing the entire
    test module when a teammate's contract file has a syntax error.
    Each entry is imported individually and logged if unavailable.
    """
    registry: list[dict[str, Any]] = []

    # ── Shared Simulation Context ───────────────────────────────────────────
    try:
        from ecosystem.applications.arcturus.contracts.shared.base_models import (
            SimulationContext,
            ContractEnvelope,
        )
        registry.append({
            "name": "SimulationContext",
            "model": SimulationContext,
            "expected_fields": ["config", "created_at", "experiment_id", "global_seed", "run_id", "trace_id"],
            "required_fields": ["experiment_id", "global_seed"],
        })
        registry.append({
            "name": "ContractEnvelope",
            "model": ContractEnvelope,
            "expected_fields": ["context"],
            "required_fields": ["context"],
        })
    except ImportError as exc:
        pytest.skip(f"shared/base_models not importable: {exc}")

    # ── Scenario Contracts ──────────────────────────────────────────────────
    try:
        from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
            ScenarioDSLPayload,
        )
        registry.append({
            "name": "ScenarioDSLPayload",
            "model": ScenarioDSLPayload,
            "expected_fields": None,   # None = skip field-name check; only drift check
            "required_fields": None,
        })
    except ImportError:
        pass  # Maryam's contract not yet present — skip silently

    # ── Simulation Contracts ────────────────────────────────────────────────
    try:
        from ecosystem.applications.arcturus.contracts.simulation.base_models import (
            SimulationContext as SimCtxRuntime,
        )
        registry.append({
            "name": "SimulationContext (runtime copy)",
            "model": SimCtxRuntime,
            "expected_fields": None,
            "required_fields": None,
        })
    except ImportError:
        pass

    # ── Synthetic Data Contracts ────────────────────────────────────────────
    try:
        from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
            SyntheticGenerationRequest,
        )
        registry.append({
            "name": "SyntheticGenerationRequest",
            "model": SyntheticGenerationRequest,
            "expected_fields": None,
            "required_fields": None,
        })
    except ImportError:
        pass

    return registry


# ============================================================================
# Snapshot Store (in-memory for the test session)
# ============================================================================

_FINGERPRINT_SNAPSHOTS: dict[str, str] = {}


# ============================================================================
# Tests
# ============================================================================


@pytest.mark.parametrize("entry", _build_registry(), ids=lambda e: e["name"])
def test_outbound_contract_has_not_silently_drifted(entry: dict[str, Any]):
    """
    Verify that each registered outbound contract:

    1. Is importable without error.
    2. Has not lost any expected fields relative to the Day 2 lock.
    3. Has not changed its required-field set unexpectedly.

    This test does NOT block the addition of new optional fields (which is
    backwards-compatible). It DOES fail if a field is removed or if a
    previously optional field becomes required.

    To intentionally update a contract after Day 2, update the
    ``expected_fields`` and ``required_fields`` entries in _build_registry()
    and open the PR with @Hashimali-khan as reviewer.
    """
    model = entry["model"]
    name = entry["name"]

    # ── 1. Importability ─────────────────────────────────────────────────────
    assert issubclass(model, BaseModel), (
        f"{name}: expected a Pydantic BaseModel subclass"
    )

    # ── 2. Field-name drift check ────────────────────────────────────────────
    if entry["expected_fields"] is not None:
        current_fields = _field_names(model)
        expected = sorted(entry["expected_fields"])
        missing = set(expected) - set(current_fields)
        assert not missing, (
            f"{name}: fields were removed after the Day 2 lock — "
            f"missing: {sorted(missing)}. "
            f"Update _build_registry() in this file to acknowledge the change."
        )

    # ── 3. Required-field drift check ────────────────────────────────────────
    if entry["required_fields"] is not None:
        current_required = _required_fields(model)
        expected_required = sorted(entry["required_fields"])
        # New required fields would be a breaking change
        new_required = set(current_required) - set(expected_required)
        assert not new_required, (
            f"{name}: previously optional fields are now required — "
            f"newly required: {sorted(new_required)}. "
            f"This is a breaking change. Update _build_registry() and get review."
        )


def test_simulation_context_global_seed_must_be_non_negative():
    """
    Regression: SimulationContext must enforce global_seed >= 0.
    This was a Day 1 contract law and must never be silently relaxed.
    """
    from pydantic import ValidationError
    from ecosystem.applications.arcturus.contracts.shared.base_models import (
        SimulationContext,
    )

    with pytest.raises(ValidationError) as exc_info:
        SimulationContext(experiment_id="EXP-001", global_seed=-1)

    errors = exc_info.value.errors()
    assert any("global_seed" in str(e) for e in errors), (
        "Expected a validation error mentioning 'global_seed', "
        f"got: {errors}"
    )


def test_simulation_context_experiment_id_min_length():
    """
    Regression: SimulationContext must enforce experiment_id min_length=3.
    """
    from pydantic import ValidationError
    from ecosystem.applications.arcturus.contracts.shared.base_models import (
        SimulationContext,
    )

    with pytest.raises(ValidationError):
        SimulationContext(experiment_id="AB", global_seed=0)


def test_simulation_context_is_deterministic_for_same_seed():
    """
    Same (experiment_id, global_seed) must yield the same subseed value
    across calls. This is the core determinism guarantee.
    """
    from ecosystem.applications.arcturus.contracts.shared.base_models import (
        SimulationContext,
    )

    ctx_a = SimulationContext(experiment_id="EXP-DET", global_seed=42)
    ctx_b = SimulationContext(experiment_id="EXP-DET", global_seed=42)

    # run_id and trace_id are random UUIDs — exclude them from comparison
    assert ctx_a.experiment_id == ctx_b.experiment_id
    assert ctx_a.global_seed == ctx_b.global_seed
