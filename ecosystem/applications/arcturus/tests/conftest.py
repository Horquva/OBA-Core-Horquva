"""
Arcturus Shared Test Harness — conftest.py
==========================================
Governance Owner: Hashim Ali Khan (@Hashimali-khan)
Day 1 Deliverable: Shared pytest fixtures for the entire Arcturus test suite.

This module is the single source of truth for all shared test fixtures.
Every platform's test suite must import these fixtures rather than
redefining its own copies.

Architectural Law: All fixtures live under ecosystem/applications/arcturus/tests/
and must never import from sibling platform src/ internals directly.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Path Bootstrap — ensures ecosystem root is importable in all test contexts
# ---------------------------------------------------------------------------
_REPO_ROOT = Path(__file__).resolve().parents[4]  # c:/data/Horquva/OBA-Core-Horquva
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

# ---------------------------------------------------------------------------
# Internal imports after path bootstrap
# ---------------------------------------------------------------------------
from ecosystem.applications.arcturus.tests.helpers.simulation_context_factory import (
    build_simulation_context,
    load_codeowners_map,
    seed_fixture as _seed_fixture,
)


# ---------------------------------------------------------------------------
# Shared Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def simulation_context():
    """
    Returns a deterministic SimulationContext for use across all Arcturus tests.

    Scope: session — built once per test run; never rebuilt between tests
    unless explicitly parametrized.
    """
    return build_simulation_context(
        experiment_id="EXP-ARCTURUS-W3",
        global_seed=42,
    )


@pytest.fixture
def seed_fixture():
    """
    Returns the canonical integer seed used for reproducible test runs.

    Scope: function — fresh reference each test (value is stateless).
    """
    return _seed_fixture()


@pytest.fixture(scope="session")
def codeowners_map():
    """
    Returns the parsed CODEOWNERS mapping from the Arcturus .github directory.

    Scope: session — file is stable across the full test run.
    Keys are glob patterns; values are lists of GitHub handles.
    """
    codeowners_path = (
        Path(__file__).resolve().parents[1] / ".github" / "CODEOWNERS"
    )
    return load_codeowners_map(codeowners_path)
