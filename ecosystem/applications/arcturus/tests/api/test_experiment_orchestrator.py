import pytest
from uuid import uuid4

from ecosystem.applications.arcturus.contracts.experiment.base_models import ExperimentConfig
from ecosystem.applications.arcturus.src.integration.experiment_orchestrator import ExperimentOrchestrator

def test_orchestrator_builds_valid_context():
    experiment_id = str(uuid4())
    config = ExperimentConfig(global_seed=123)
    orchestrator = ExperimentOrchestrator(experiment_id, config)
    
    context = orchestrator.build_context()
    
    assert context.experiment_id == experiment_id
    assert context.global_seed == 123
    assert str(context.run_id) == orchestrator.run_id

def test_orchestrator_completes_with_stub_platforms():
    experiment_id = str(uuid4())
    config = ExperimentConfig(global_seed=42)
    orchestrator = ExperimentOrchestrator(experiment_id, config)
    
    results = orchestrator.run_pipeline()
    
    assert results["status"] == "PIPELINE_COMPLETED"
    assert orchestrator.stage == "COMPLETED"
    
    # Even if downstream platforms aren't merged, stubs should prevent failure
    assert "ontology" in results
    assert "enterprise" in results
    assert "workforce" in results
