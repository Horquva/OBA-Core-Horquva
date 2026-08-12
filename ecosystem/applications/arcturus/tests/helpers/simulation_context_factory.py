"""
Arcturus Shared Test Harness — simulation_context_factory.py
=============================================================
Governance Owner: Hashim Ali Khan (@Hashimali-khan)
Day 1 Deliverable: Factory functions to build deterministic SimulationContext
objects for all Arcturus platform test suites.

These helpers ensure:
  - Deterministic, seed-driven context construction across all platforms.
  - A single canonical seed value so tests remain reproducible.
  - A CODEOWNERS parser that governance and compliance tests can rely on.

Architectural Law: This module may import ONLY from:
  - Python standard library
  - pydantic
  - ecosystem.applications.arcturus.contracts.shared.base_models

It must never import from any sibling platform src/ internals.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any
from uuid import uuid4

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# The canonical seed used across the entire Arcturus test suite.
# Every platform subseed is derived from this via SimulationContext.subseed().
_DEFAULT_GLOBAL_SEED: int = 42

_DEFAULT_EXPERIMENT_ID: str = "EXP-ARCTURUS-W3"


# ---------------------------------------------------------------------------
# Public Factory Functions
# ---------------------------------------------------------------------------


def build_simulation_context(
    experiment_id: str = _DEFAULT_EXPERIMENT_ID,
    global_seed: int = _DEFAULT_GLOBAL_SEED,
    config: dict[str, Any] | None = None,
) -> SimulationContext:
    """
    Construct a deterministic SimulationContext for use in Arcturus tests.

    Parameters
    ----------
    experiment_id:
        A stable identifier for the overarching experiment.
        Must be at least 3 characters long (Pydantic constraint).
    global_seed:
        Integer seed used for reproducible entity resolution and state
        transitions across all platform services.
    config:
        Optional dict of run-specific overrides injected into the context.

    Returns
    -------
    SimulationContext
        A validated, fully populated context object.

    Raises
    ------
    pydantic.ValidationError
        If the provided arguments violate the SimulationContext schema.
    """
    return SimulationContext(
        experiment_id=experiment_id,
        global_seed=global_seed,
        config=config or {},
    )


def seed_fixture() -> int:
    """
    Return the canonical integer seed used for reproducible test runs.

    This is intentionally a plain function (not a Pytest fixture) so that
    non-fixture code can call it directly without invoking the Pytest fixture
    machinery.

    Returns
    -------
    int
        The default global seed (42).
    """
    return _DEFAULT_GLOBAL_SEED


def load_codeowners_map(codeowners_path: Path) -> dict[str, list[str]]:
    """
    Parse a GitHub CODEOWNERS file and return a mapping of
    glob pattern → list of GitHub handles.

    Parameters
    ----------
    codeowners_path:
        Absolute or relative path to the CODEOWNERS file.

    Returns
    -------
    dict[str, list[str]]
        Mapping where keys are path patterns and values are sorted lists of
        GitHub handles (e.g. ``["@Hashimali-khan", "@MuhammadHamza-7035"]``).

    Raises
    ------
    FileNotFoundError
        If the CODEOWNERS file does not exist at the supplied path.
    """
    if not codeowners_path.exists():
        raise FileNotFoundError(
            f"CODEOWNERS file not found at: {codeowners_path}"
        )

    result: dict[str, list[str]] = {}
    handle_pattern = re.compile(r"@\S+")

    for raw_line in codeowners_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        # Skip blank lines and comment-only lines
        if not line or line.startswith("#"):
            continue

        parts = line.split()
        if len(parts) < 2:
            # A pattern with no owners — record it with an empty list
            result[parts[0]] = []
            continue

        path_pattern = parts[0]
        owners = [p for p in parts[1:] if handle_pattern.match(p)]
        result[path_pattern] = sorted(owners)

    return result
