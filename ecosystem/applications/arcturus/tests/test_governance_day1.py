# =============================================================================
# 🌌 Arcturus Platform — Day 1 Automated Compliance Test Suite
# Location: ecosystem/applications/arcturus/tests/test_governance_day1.py
# =============================================================================

import sys
import random

# Lightweight test assertions for running in environments without pytest
def test_build_simulation_context_valid():
    from ecosystem.applications.arcturus.tests.simulation_context_factory import build_simulation_context
    context = build_simulation_context(global_seed=42)
    assert context["global_seed"] == 42
    assert "run_id" in context
    assert context["scenario_id"].startswith("SCN-WF-")
    print("PASS: test_build_simulation_context_valid")

def test_seed_fixture_determinism():
    from ecosystem.applications.arcturus.tests.conftest import seed_fixture
    # Reset seed using our fixture
    seed_val = seed_fixture()
    assert seed_val == 42
    first_rand = random.random()
    
    # Re-reset and assert identical float selection (determinism check)
    seed_fixture()
    second_rand = random.random()
    assert first_rand == second_rand
    print("PASS: test_seed_fixture_determinism")

def test_load_codeowners_map():
    from ecosystem.applications.arcturus.tests.conftest import load_codeowners_map
    owners = load_codeowners_map()
    assert len(owners) > 0
    # Assert path styling correctness
    for path in owners.keys():
        assert path.startswith("/") or path.startswith("*")
    print("PASS: test_load_codeowners_map")
