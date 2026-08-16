import pytest
from uuid import uuid4
from datetime import datetime, timezone

from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
    OntologySnapshotContract, 
    DepartmentState, 
    CapabilityState, 
    RelationshipState, 
    DivisionState
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext, 
    ArcturusValidationError
)
from ecosystem.applications.arcturus.src.control_plane.ontology.ontology_runtime import OntologyRuntime

# --- FIXTURES ---

@pytest.fixture
def base_context() -> SimulationContext:
    """Provides a valid shared context envelope for testing."""
    return SimulationContext(
        run_id=uuid4(),
        trace_id=uuid4(),
        experiment_id="TEST-DAY4",
        global_seed=42,
        created_at=datetime.now(timezone.utc)
    )

@pytest.fixture
def runtime() -> OntologyRuntime:
    """Provides a fresh instance of the core engine."""
    return OntologyRuntime()

# --- NEGATIVE TESTS & FAILURE INJECTION ---

def test_quality_gate_5_circular_dependency_injection(runtime: OntologyRuntime, base_context: SimulationContext):
    """
    FAILURE INJECTION: Tests that the RelationshipEngine correctly halts execution 
    if a directed acyclic graph (DAG) cycle is detected.
    """
    payload = {
        "context": base_context.model_dump(),
        "snapshot_version": "1.0",
        "organizations": [], "divisions": [], "departments": [], "roles": [], "employees": [], "capabilities": [],
        "relationships": [
            # Injecting a cycle: Dept 1 -> Dept 2 -> Dept 1
            {"source_entity_id": 1, "target_entity_id": 2, "relationship_type": "reports_to"},
            {"source_entity_id": 2, "target_entity_id": 1, "relationship_type": "reports_to"}
        ]
    }
    
    with pytest.raises(ArcturusValidationError) as exc_info:
        runtime.load_snapshot(payload)
        
    assert "Circular dependency detected" in exc_info.value.message
    assert exc_info.value.platform_source == "Enterprise Ontology"

def test_constraint_orphaned_capability_injection(runtime: OntologyRuntime, base_context: SimulationContext):
    """
    FAILURE INJECTION: Tests that the ConstraintEngine catches a Capability 
    that belongs to a non-existent Department.
    """
    payload = {
        "context": base_context.model_dump(),
        "snapshot_version": "1.0",
        "organizations": [], "divisions": [], "departments": [], "roles": [], "employees": [], "relationships": [],
        "capabilities": [
            # Injecting an orphaned capability mapped to department ID 999
            {"cap_id": 101, "dept_id": 999, "readiness_score": 0.8}
        ]
    }
    
    with pytest.raises(ArcturusValidationError) as exc_info:
        runtime.load_snapshot(payload)
        
    assert "Constraint Violation: Capability 101 is orphaned" in exc_info.value.message

def test_constraint_invalid_department_hierarchy(runtime: OntologyRuntime, base_context: SimulationContext):
    """
    FAILURE INJECTION: Tests that a Department cannot reference an invalid Division.
    """
    payload = {
        "context": base_context.model_dump(),
        "snapshot_version": "1.0",
        "organizations": [], "roles": [], "employees": [], "capabilities": [], "relationships": [],
        "divisions": [
            {"div_id": 10, "org_id": 1, "div_name": "Engineering"}
        ],
        "departments": [
            # Injecting a department pointing to division 99 (doesn't exist)
            {"dept_id": 50, "div_id": 99, "dept_name": "Platform Team"}
        ]
    }

    with pytest.raises(ArcturusValidationError) as exc_info:
        runtime.load_snapshot(payload)
        
    assert "references invalid Division 99" in exc_info.value.message

# --- POSITIVE TESTS ---

def test_valid_ontology_resolution(runtime: OntologyRuntime, base_context: SimulationContext):
    """
    Ensures that a structurally valid snapshot loads successfully and entities resolve properly.
    """
    payload = {
        "context": base_context.model_dump(),
        "snapshot_version": "1.0",
        "organizations": [], "roles": [], "employees": [], "capabilities": [], "relationships": [],
        "divisions": [
            {"div_id": 10, "org_id": 1, "div_name": "Engineering"}
        ],
        "departments": [
            {"dept_id": 50, "div_id": 10, "dept_name": "Platform Team"}
        ]
    }
    
    # Should not raise any errors
    runtime.load_snapshot(payload)
    
    resolution = runtime.resolve_entity("Department", 50)
    assert resolution.is_resolved is True
    assert resolution.entity_id == 50