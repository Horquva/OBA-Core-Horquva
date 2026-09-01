import pytest
import uuid
from ecosystem.applications.arcturus.src.control_plane.ontology.ontology_controller import OntologyController
from ecosystem.applications.arcturus.contracts.shared.base_models import ArcturusValidationError

def get_base_payload():
    """Helper to generate a structurally valid payload for mutation testing."""
    return {
        "context": {
            "run_id": str(uuid.uuid4()),
            "experiment_id": "exp-fail-test",
            "global_seed": 42,
            "tick": 1
        },
        "snapshot_version": "1.0",
        "organizations": [{"org_id": 1, "org_name": "Horquva Base"}],
        "divisions": [{"div_id": 1, "div_name": "Applied Sciences", "org_id": 1}],
        "departments": [{"dept_id": 99, "div_id": 1, "dept_name": "AI Research", "readiness_score": 1.0, "cost": 50000.0}],
        "relationships": []
    }

def test_failure_invalid_types():
    """Verifies that invalid data types trigger a schema validation failure."""
    controller = OntologyController()
    payload = get_base_payload()
    
    # Intentionally corrupt the float field with a string
    payload["departments"][0]["cost"] = "invalid_string_cost"
    
    with pytest.raises(ArcturusValidationError) as exc_info:
        controller.bootstrap_domain(payload)
    
    assert "Schema validation failed" in str(exc_info.value.message)

def test_failure_orphaned_hierarchy():
    """Verifies that the ConstraintEngine rejects entities referencing missing parents."""
    controller = OntologyController()
    payload = get_base_payload()
    
    # Assign the department to a division that does not exist
    payload["departments"][0]["div_id"] = 9999
    
    with pytest.raises(ArcturusValidationError) as exc_info:
        controller.bootstrap_domain(payload)
        
    assert "Constraint Violation" in str(exc_info.value.message)

def test_failure_circular_relationship():
    """Verifies that Quality Gate 5 prevents cyclical dependencies in the DAG."""
    controller = OntologyController()
    payload = get_base_payload()
    
    # Introduce an infinite loop A -> B -> C -> A
    payload["relationships"] = [
        {"source_entity_id": 1, "target_entity_id": 2, "relationship_type": "Dependency"},
        {"source_entity_id": 2, "target_entity_id": 3, "relationship_type": "Dependency"},
        {"source_entity_id": 3, "target_entity_id": 1, "relationship_type": "Dependency"}
    ]
    
    with pytest.raises(ArcturusValidationError):
        controller.bootstrap_domain(payload)