import json
from pathlib import Path
import pytest
from ecosystem.applications.arcturus.src.integration.experiment_orchestrator import ExperimentOrchestrator
from ecosystem.applications.arcturus.contracts.experiment.base_models import ExperimentConfig

@pytest.fixture
def minimal_corpus():
    fixture_path = Path(__file__).parent / "fixtures" / "minimal_corpus.json"
    with open(fixture_path, "r") as f:
        return json.load(f)

def test_full_pipeline_execution(minimal_corpus):
    """
    Validates the end-to-end integration of the Orchestrator with all platform controllers.
    Ensures that removing the stubbed 'try/except' blocks successfully executes the pipeline.
    """
    config = ExperimentConfig(
        name="E2E Pipeline Test",
        global_seed=42,
        ontology_config={},
        enterprise_config={},
        workforce_config={},
        workflow_config={},
        scenario_config={},
        runtime_config={},
        evaluation_config={},
        synthetic_data_config={}
    )
    
    orchestrator = ExperimentOrchestrator(experiment_id="TEST-E2E-001", config=config)
    results = orchestrator.run_pipeline()
    
    assert orchestrator.stage == "COMPLETED", f"Pipeline failed: {results.get('error')}"
    assert results["status"] == "PIPELINE_COMPLETED"
    
    # Verify all stages produced output
    assert "ontology" in results
    assert "enterprise" in results
    assert "workforce" in results
    assert "workflow" in results
    assert "scenario" in results
    assert "runtime" in results
    assert "synthetic_data" in results
    assert "validation" in results
