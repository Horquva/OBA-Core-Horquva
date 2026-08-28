"""
Unit tests for src/control_plane/scenarios/scenario_registry.py

Corrected against the real scenario_registry.py + scenario_engine.py source
(first draft had 3 wrong assumptions about register()/get_latest()/
get_version() — see conversation history). Confirmed real behavior:

  - register(compiled: CompiledScenario) -> ScenarioRegistryEntry
      Takes the WHOLE CompiledScenario object (scenario_id/fingerprint are
      read off it internally), not separate positional args. Idempotent on
      identical fingerprint: returns the EXISTING ScenarioRegistryEntry
      unchanged (same object identity), does not overwrite.
  - get_latest(scenario_id) -> CompiledScenario
      Raises ArcturusValidationError (NOT None, NOT KeyError) if
      scenario_id was never registered.
  - get_version(scenario_id, fingerprint) -> CompiledScenario
      Raises ArcturusValidationError (NOT KeyError) if scenario_id or
      fingerprint combo is not found.
  - list_versions(scenario_id) -> list[str]
      Returns FINGERPRINTS (not compiled objects), sorted by
      registered_at (registration order in practice). [] for unknown id.
  - list_scenario_ids() -> list[str]
      Returns scenario_ids SORTED ALPHABETICALLY (not registration order).
  - exists(scenario_id) -> bool  (unchanged from original assumption)

CompiledScenario itself (from scenario_engine.py) is a __slots__ class:
  CompiledScenario(scenario_id, payload, constraints, expectations, fingerprint)
For registry-layer tests we only care about scenario_id/fingerprint, so
payload/constraints/expectations are left as None in fixtures — the
registry never inspects them.

Run with:
  python -m pytest ecosystem/applications/arcturus/tests/scenarios/test_scenario_registry.py -v
"""

import pytest

from src.control_plane.scenarios.scenario_registry import (
    ScenarioRegistry,
    ScenarioRegistryEntry,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_engine import (
    CompiledScenario,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def registry():
    """Fresh, empty in-memory registry for each test."""
    return ScenarioRegistry()


def _compiled(scenario_id: str, fingerprint: str) -> CompiledScenario:
    """
    Minimal CompiledScenario stand-in for registry-layer tests.
    payload/constraints/expectations are None — ScenarioRegistry never
    reads them, only .scenario_id and .fingerprint.
    """
    return CompiledScenario(
        scenario_id=scenario_id,
        payload=None,
        constraints=None,
        expectations=None,
        fingerprint=fingerprint,
    )


SCN_A = "SCN-HR-001"
SCN_B = "SCN-OP-002"


# ---------------------------------------------------------------------------
# register() + exists()
# ---------------------------------------------------------------------------

class TestRegisterAndExists:

    def test_register_returns_entry_wrapping_compiled(self, registry):
        compiled = _compiled(SCN_A, "fp-aaa111")
        entry = registry.register(compiled)
        assert isinstance(entry, ScenarioRegistryEntry)
        assert entry.compiled is compiled
        assert entry.registered_at is not None

    def test_exists_false_before_registration(self, registry):
        assert registry.exists(SCN_A) is False

    def test_exists_true_after_registration(self, registry):
        registry.register(_compiled(SCN_A, "fp-aaa111"))
        assert registry.exists(SCN_A) is True

    def test_register_different_scenario_ids_are_independent(self, registry):
        registry.register(_compiled(SCN_A, "fp-aaa111"))
        registry.register(_compiled(SCN_B, "fp-bbb222"))
        assert registry.exists(SCN_A) is True
        assert registry.exists(SCN_B) is True

    def test_register_same_fingerprint_twice_returns_same_entry(self, registry):
        """Re-registering the exact same fingerprint is idempotent: the
        ORIGINAL entry is returned unchanged, even if a structurally
        different (but same-fingerprint) CompiledScenario is passed in."""
        first = _compiled(SCN_A, "fp-aaa111")
        second = _compiled(SCN_A, "fp-aaa111")  # distinct object, same fingerprint

        entry1 = registry.register(first)
        entry2 = registry.register(second)

        assert entry1 is entry2
        assert entry2.compiled is first  # original wins, not the re-registered one
        assert len(registry.list_versions(SCN_A)) == 1

    def test_register_new_fingerprint_creates_new_entry(self, registry):
        entry1 = registry.register(_compiled(SCN_A, "fp-aaa111"))
        entry2 = registry.register(_compiled(SCN_A, "fp-bbb222"))
        assert entry1 is not entry2
        assert len(registry.list_versions(SCN_A)) == 2


# ---------------------------------------------------------------------------
# get_latest()
# ---------------------------------------------------------------------------

class TestGetLatest:

    def test_get_latest_unregistered_raises(self, registry):
        with pytest.raises(ArcturusValidationError):
            registry.get_latest("SCN-ZZ-999")

    def test_get_latest_single_version(self, registry):
        compiled = _compiled(SCN_A, "fp-aaa111")
        registry.register(compiled)
        assert registry.get_latest(SCN_A) is compiled

    def test_get_latest_returns_most_recent_version(self, registry):
        registry.register(_compiled(SCN_A, "fp-aaa111"))
        newest = _compiled(SCN_A, "fp-bbb222")
        registry.register(newest)
        assert registry.get_latest(SCN_A) is newest
        assert registry.get_latest(SCN_A).fingerprint == "fp-bbb222"


# ---------------------------------------------------------------------------
# get_version()
# ---------------------------------------------------------------------------

class TestGetVersion:

    def test_get_version_returns_matching_historical_entry(self, registry):
        first = _compiled(SCN_A, "fp-aaa111")
        second = _compiled(SCN_A, "fp-bbb222")
        registry.register(first)
        registry.register(second)

        assert registry.get_version(SCN_A, "fp-aaa111") is first
        assert registry.get_version(SCN_A, "fp-bbb222") is second

    def test_get_version_unknown_fingerprint_raises(self, registry):
        registry.register(_compiled(SCN_A, "fp-aaa111"))
        with pytest.raises(ArcturusValidationError):
            registry.get_version(SCN_A, "fp-does-not-exist")

    def test_get_version_unknown_scenario_id_raises(self, registry):
        with pytest.raises(ArcturusValidationError):
            registry.get_version("SCN-ZZ-999", "fp-aaa111")


# ---------------------------------------------------------------------------
# list_versions() -> list[str] of fingerprints
# ---------------------------------------------------------------------------

class TestListVersions:

    def test_list_versions_unknown_scenario_returns_empty_list(self, registry):
        assert registry.list_versions("SCN-ZZ-999") == []

    def test_list_versions_returns_fingerprints_in_registration_order(self, registry):
        registry.register(_compiled(SCN_A, "fp-aaa111"))
        registry.register(_compiled(SCN_A, "fp-bbb222"))
        registry.register(_compiled(SCN_A, "fp-ccc333"))

        versions = registry.list_versions(SCN_A)
        assert versions == ["fp-aaa111", "fp-bbb222", "fp-ccc333"]

    def test_list_versions_does_not_leak_across_scenario_ids(self, registry):
        registry.register(_compiled(SCN_A, "fp-aaa111"))
        registry.register(_compiled(SCN_B, "fp-bbb222"))
        assert registry.list_versions(SCN_A) == ["fp-aaa111"]
        assert registry.list_versions(SCN_B) == ["fp-bbb222"]


# ---------------------------------------------------------------------------
# list_scenario_ids() -> sorted alphabetically, NOT registration order
# ---------------------------------------------------------------------------

class TestListScenarioIds:

    def test_list_scenario_ids_empty_registry(self, registry):
        assert registry.list_scenario_ids() == []

    def test_list_scenario_ids_returns_sorted_distinct_ids(self, registry):
        # Register B (SCN-OP-002) BEFORE A (SCN-HR-001) deliberately, to
        # prove the result is alphabetically sorted, not insertion order.
        registry.register(_compiled(SCN_B, "fp-ccc333"))
        registry.register(_compiled(SCN_A, "fp-aaa111"))
        registry.register(_compiled(SCN_A, "fp-bbb222"))  # same id, 2nd version

        ids = registry.list_scenario_ids()
        assert ids == [SCN_A, SCN_B]  # sorted: "SCN-HR-001" < "SCN-OP-002"
        assert len(ids) == 2  # no duplicates even though SCN_A has 2 versions


# ---------------------------------------------------------------------------
# Isolation between ScenarioRegistry instances (this registry is NOT the
# module-level singleton used by scenario_chain.py — that's tested
# separately in the scenario_chain wiring tests, open item #3)
# ---------------------------------------------------------------------------

class TestInstanceIsolation:

    def test_two_registry_instances_do_not_share_state(self):
        reg1 = ScenarioRegistry()
        reg2 = ScenarioRegistry()
        reg1.register(_compiled(SCN_A, "fp-aaa111"))
        assert reg1.exists(SCN_A) is True
        assert reg2.exists(SCN_A) is False
