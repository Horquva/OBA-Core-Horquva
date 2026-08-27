r"""
Scenario Engineering Platform — Registry
Owner: Maryam Yaqoob

Part-1 gap closure: previously no registry existed anywhere in this
platform's code (confirmed via repository grep — no matches for
"registry" in scenario_engine.py / scenario_adapters.py before this file
was added).

Purpose: an in-process, in-memory lookup/tracking store for
CompiledScenario instances, keyed by scenario_id, with version history
by fingerprint (a scenario_id can be recompiled multiple times as its
definition changes — each distinct fingerprint is a distinct version).

Scope boundary (consistent with scenario_engine.py's own documented
boundary): this registry does NOT persist to a database — Hashim's
SQLite `experiments` / `simulation_runs` tables (per Week 4 Day 0 schema)
are the system of record for persistence. This registry is the
in-process working set the Scenario Platform itself uses during a
single process lifetime (e.g. one API server run), and is deliberately
simple until/unless a persistence requirement is confirmed.

No cross-platform imports: this module only touches the Scenario
Engineering Platform's own contracts and its own src/ (scenario_engine.py).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_engine import (
    CompiledScenario,
)

PLATFORM_SOURCE = "scenario_engineering"


@dataclass
class ScenarioRegistryEntry:
    """One recorded version of a compiled scenario."""

    compiled: CompiledScenario
    registered_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class ScenarioRegistry:
    """
    In-memory registry of compiled scenarios.

    Keyed primarily by scenario_id. Each scenario_id can have multiple
    versions over time, distinguished by fingerprint (see
    ScenarioEngine._build_fingerprint — deterministic over structural
    content, excludes run-specific context fields).
    """

    def __init__(self) -> None:
        # scenario_id -> { fingerprint -> ScenarioRegistryEntry }
        self._store: dict[str, dict[str, ScenarioRegistryEntry]] = {}
        # scenario_id -> most recently registered fingerprint
        self._latest: dict[str, str] = {}

    def register(self, compiled: CompiledScenario) -> ScenarioRegistryEntry:
        """
        Register a compiled scenario. If this exact fingerprint has
        already been registered for this scenario_id, the existing entry
        is returned unchanged (idempotent — recompiling identical input
        should not create duplicate history).
        """
        versions = self._store.setdefault(compiled.scenario_id, {})

        if compiled.fingerprint in versions:
            return versions[compiled.fingerprint]

        entry = ScenarioRegistryEntry(compiled=compiled)
        versions[compiled.fingerprint] = entry
        self._latest[compiled.scenario_id] = compiled.fingerprint
        return entry

    def get_latest(self, scenario_id: str) -> CompiledScenario:
        """Return the most recently registered version of scenario_id."""
        if scenario_id not in self._latest:
            raise ArcturusValidationError(
                f"scenario '{scenario_id}' is not registered",
                PLATFORM_SOURCE,
            )
        fingerprint = self._latest[scenario_id]
        return self._store[scenario_id][fingerprint].compiled

    def get_version(self, scenario_id: str, fingerprint: str) -> CompiledScenario:
        """Return a specific historical version by exact fingerprint."""
        versions = self._store.get(scenario_id)
        if not versions or fingerprint not in versions:
            raise ArcturusValidationError(
                f"scenario '{scenario_id}' has no registered version with "
                f"fingerprint '{fingerprint[:12]}...'",
                PLATFORM_SOURCE,
            )
        return versions[fingerprint].compiled

    def list_versions(self, scenario_id: str) -> list[str]:
        """Return all known fingerprints for a scenario_id, oldest first."""
        versions = self._store.get(scenario_id, {})
        return sorted(
            versions.keys(), key=lambda fp: versions[fp].registered_at
        )

    def list_scenario_ids(self) -> list[str]:
        """Return all registered scenario_ids."""
        return sorted(self._store.keys())

    def exists(self, scenario_id: str) -> bool:
        return scenario_id in self._store


__all__ = ["ScenarioRegistry", "ScenarioRegistryEntry"]