# =============================================================================
# 🌌 Arcturus Platform — Standalone Compliance Runner (No-Pytest Fallback)
# Location: ecosystem/applications/arcturus/tests/run_tests.py
# =============================================================================

import sys
import os

# Append root to path so we can resolve ecosystem imports correctly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../")))

if __name__ == "__main__":
    print("==========================================================")
    print("🌌 Arcturus Governance - Day 1 Automated Test Runner")
    print("==========================================================")
    
    try:
        from ecosystem.applications.arcturus.tests.test_governance_day1 import (
            test_build_simulation_context_valid,
            test_seed_fixture_determinism,
            test_load_codeowners_map
        )
        
        print("Running: test_build_simulation_context_valid...")
        test_build_simulation_context_valid()
        
        print("Running: test_seed_fixture_determinism...")
        test_seed_fixture_determinism()
        
        print("Running: test_load_codeowners_map...")
        test_load_codeowners_map()
        
        print("All governance tests passed successfully!")
        print("\n🎉 SUCCESS: All Day 1 governance validation tests passed flawlessly!")
        print("==========================================================")
        sys.exit(0)
        
    except Exception as e:
        print(f"\n❌ FAIL: Assertion failed: {e}")
        print("==========================================================")
        sys.exit(1)
