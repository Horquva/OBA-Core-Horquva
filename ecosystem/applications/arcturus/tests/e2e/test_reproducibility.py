"""
Day 7: Reproducibility Verification
Verifies that identical seeds produce identical deterministic fingerprints and identical validation outcomes.
"""
from __future__ import annotations

import pytest
import uuid
from datetime import datetime, timezone

from ecosystem.applications.arcturus.contracts.experiment.base_models import ExperimentConfig
from ecosystem.applications.arcturus.src.integration.experiment_orchestrator import ExperimentOrchestrator
from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext

def test_pipeline_reproducibility() -> None:
    # 1. Configuration for both runs
    config1 = ExperimentConfig(
        global_seed=1337,
        scenario_id="SCN-REPRO",
    )
    config2 = ExperimentConfig(
        global_seed=1337,
        scenario_id="SCN-REPRO",
    )
    
    fixed_time = datetime(2025, 1, 1, tzinfo=timezone.utc)
    fixed_uuid = uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    # 2. Execute Run 1
    orchestrator1 = ExperimentOrchestrator(experiment_id="EXP-REPRO-1337", config=config1)
    orchestrator1.run_id = str(fixed_uuid)
    def mock_build_context1() -> SimulationContext:
        return SimulationContext(
            experiment_id=orchestrator1.experiment_id,
            run_id=fixed_uuid,
            trace_id=fixed_uuid,
            global_seed=orchestrator1.config.global_seed,
            created_at=fixed_time,
            config=orchestrator1.config.model_dump()
        )
    orchestrator1.build_context = mock_build_context1  # type: ignore
    results1 = orchestrator1.run_pipeline()
    assert orchestrator1.stage == "COMPLETED"
    
    # 3. Execute Run 2
    orchestrator2 = ExperimentOrchestrator(experiment_id="EXP-REPRO-1337", config=config2)
    orchestrator2.run_id = str(fixed_uuid)
    def mock_build_context2() -> SimulationContext:
        return SimulationContext(
            experiment_id=orchestrator2.experiment_id,
            run_id=fixed_uuid,
            trace_id=fixed_uuid,
            global_seed=orchestrator2.config.global_seed,
            created_at=fixed_time,
            config=orchestrator2.config.model_dump()
        )
    orchestrator2.build_context = mock_build_context2  # type: ignore
    results2 = orchestrator2.run_pipeline()
    assert orchestrator2.stage == "COMPLETED"
    
    # 4. Assert Identity in Generated Synthetic Data Corpa
    corpus1 = results1["synthetic_data"]["corpus"]
    corpus2 = results2["synthetic_data"]["corpus"]
    
    # Fingerprints should perfectly match
    assert corpus1["deterministic_fingerprint"] == corpus2["deterministic_fingerprint"]
    assert corpus1["artifact_count"] == corpus2["artifact_count"]
    
    # 5. Assert Identity in Validation Outcomes
    val1 = results1["validation"]["validation"].final_status
    val2 = results2["validation"]["validation"].final_status
    assert val1 == val2
