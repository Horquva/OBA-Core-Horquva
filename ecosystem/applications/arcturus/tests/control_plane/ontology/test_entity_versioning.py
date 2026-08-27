import pytest
import uuid
from ecosystem.applications.arcturus.src.control_plane.ontology.ontology_controller import OntologyController

def test_multi_tick_state_evolution():
    """
    Day 5 Integrity Check: Verifies safe mutation of frozen entities and version bumping.
    """
    controller = OntologyController()
    
    # FIXED: Added parent Organization and Division to satisfy the ConstraintEngine
    mock_payload = {
        "context": {
            "run_id": str(uuid.uuid4()),
            "experiment_id": "exp-001",
            "global_seed": 42,
            "tick": 1
        },
        "snapshot_version": "1.0",
        "organizations": [
            {"org_id": 1, "org_name": "Horquva Base"}
        ],
        "divisions": [
            {"div_id": 1, "div_name": "Applied Sciences", "org_id": 1}
        ],
        "departments": [
            {"dept_id": 99, "div_id": 1, "dept_name": "AI Research", "readiness_score": 1.0, "cost": 50000.0}
        ]
    }
    
    controller.bootstrap_domain(mock_payload)
    
    initial_version = controller.get_entity_version("Department", 99)
    assert initial_version == "1.0"
    
    new_version = controller.evolve_entity_state(
        entity_type="Department", 
        entity_id=99, 
        new_state_data={"readiness_score": 0.45}
    )
    
    assert new_version == "1.1"
    assert controller.get_entity_version("Department", 99) == "1.1"
    
    updated_dept = controller.runtime.resolve_entity("Department", 99)
    assert updated_dept.readiness_score == 0.45