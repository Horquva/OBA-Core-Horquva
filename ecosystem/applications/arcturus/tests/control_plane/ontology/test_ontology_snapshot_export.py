import pytest
import uuid
from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import OntologySnapshotContract

def test_snapshot_immutability_and_export():
    """
    Day 5 Integrity Check: Verifies the export format and frozen constraints.
    Ensures downstream platforms cannot accidentally corrupt the state in memory.
    """
    # FIXED: Provided valid UUID and missing context fields
    payload = {
        "context": {
            "run_id": str(uuid.uuid4()),
            "experiment_id": "exp-001",
            "global_seed": 42,
            "tick": 1
        },
        "snapshot_version": "1.0",
        "organizations": [{"org_id": 1, "org_name": "Horquva"}]
    }
    
    snapshot = OntologySnapshotContract(**payload)
    
    exported_data = snapshot.model_dump()
    assert exported_data["organizations"][0]["org_name"] == "Horquva"
    assert exported_data["snapshot_version"] == "1.0"
    
    with pytest.raises(Exception):
        snapshot.snapshot_version = "2.0"
        
    with pytest.raises(Exception):
        snapshot.organizations = []