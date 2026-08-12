# =============================================================================
# 🌌 Arcturus Platform — Day 1 Automated Compliance Test Suite
# Location: ecosystem/applications/arcturus/tests/test_governance_day1.py
# =============================================================================

import random
from pathlib import Path
from ecosystem.applications.arcturus.tests.helpers.simulation_context_factory import (
    build_simulation_context,
    seed_fixture,
    load_codeowners_map,
)


def test_build_simulation_context_valid():
    context = build_simulation_context(global_seed=42)
    assert context.global_seed == 42
    assert context.run_id is not None
    assert context.experiment_id == "EXP-ARCTURUS-W3"


def test_seed_fixture_determinism():
    seed_val = seed_fixture()
    assert seed_val == 42
    random.seed(seed_val)
    first_rand = random.random()

    random.seed(seed_fixture())
    second_rand = random.random()
    assert first_rand == second_rand


def test_load_codeowners_map():
    codeowners_path = Path(__file__).parents[1] / ".github" / "CODEOWNERS"
    owners = load_codeowners_map(codeowners_path)
    assert len(owners) > 0
    for path in owners.keys():
        assert path.startswith("/") or path.startswith("*")

