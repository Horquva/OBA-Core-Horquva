"""
Day 7: Golden Acceptance Test
Verifies the full pipeline end-to-end execution through ExperimentOrchestrator.
"""
from __future__ import annotations

import pytest
from ecosystem.applications.arcturus.contracts.experiment.base_models import ExperimentConfig
from ecosystem.applications.arcturus.src.integration.experiment_orchestrator import ExperimentOrchestrator

def test_golden_acceptance_pipeline() -> None:
    # 1. Initialize experiment config
    config = ExperimentConfig(
        global_seed=42,
        scenario_id="SCN-TEST-101",
    )
    
    # 2. Instantiate Orchestrator
    orchestrator = ExperimentOrchestrator(experiment_id="EXP-GOLDEN-001", config=config)
    
    # 3. Run Pipeline
    results = orchestrator.run_pipeline()
    
    # 4. Verify Pipeline Completion
    assert orchestrator.stage == "COMPLETED", f"Pipeline failed at stage {orchestrator.stage}: {results.get('error')}"
    assert results["status"] == "PIPELINE_COMPLETED"
    
    # 5. Verify Subsystem Outputs
    # Ontology
    assert "ontology" in results
    assert "ontology_snapshot" in results["ontology"]
    
    # Enterprise
    assert "enterprise" in results
    assert results["enterprise"]["enterprise"].is_structurally_valid
    
    # Workforce
    assert "workforce" in results
    assert "agents" in results["workforce"]
    
    # Workflow
    assert "workflow" in results
    assert len(results["workflow"]["workflows"]) > 0
    
    # Scenario
    assert "scenario" in results
    assert "scenario" in results["scenario"]
    
    # Runtime
    assert "runtime" in results
    assert "status" in results["runtime"]
    
    # Synthetic Data
    assert "synthetic_data" in results
    assert "corpus" in results["synthetic_data"]
    
    # Validation
    assert "validation" in results
    assert results["validation"]["validation"].final_status in ["validated", "rejected", "inconclusive"]
    
    # Intelligence
    assert "intelligence" in results
    assert results["intelligence"]["intelligence_status"] in ["READY", "ASSESSING_UNAVAILABLE", "NO_TRUSTED_EVIDENCE"]
