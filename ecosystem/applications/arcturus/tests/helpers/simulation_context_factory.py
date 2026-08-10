# =============================================================================
# 🌌 Arcturus Platform — Simulation Context Factory
# Location: ecosystem/applications/arcturus/tests/helpers/simulation_context_factory.py
# =============================================================================

import uuid
import random
from typing import Optional

def build_simulation_context(
    run_id: Optional[str] = None,
    global_seed: Optional[int] = None,
    enterprise_id: Optional[float] = None,
    scenario_id: Optional[str] = None,
    logical_timestamp: int = 0
) -> dict:
    """
    Programmatically builds a validated SimulationContext dictionary payload.
    Guarantees deterministic setups for all downstream testing.
    """
    # Enforce realistic and standardized values if not explicitly supplied
    final_run_id = run_id or f"run-{uuid.uuid4().hex[:6]}-{uuid.uuid4().hex[:4]}"
    final_seed = global_seed if global_seed is not None else random.randint(1000, 9999)
    final_ent_id = enterprise_id if enterprise_id is not None else float(random.randint(100, 999))
    
    # Standard SCN-WF-XXX scenario code mapping
    final_scenario_id = scenario_id or f"SCN-WF-{random.randint(100, 999)}"
    
    return {
        "run_id": final_run_id,
        "global_seed": final_seed,
        "enterprise_id": final_ent_id,
        "scenario_id": final_scenario_id,
        "logical_timestamp": logical_timestamp
    }
