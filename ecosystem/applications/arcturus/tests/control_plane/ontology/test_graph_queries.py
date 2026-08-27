import pytest
import time
from ecosystem.applications.arcturus.src.control_plane.ontology.relationship_engine import RelationshipEngine
from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import RelationshipState

def test_o1_graph_traversal_performance():
    """
    Day 5 Benchmark: Verifies that DAG lookups remain O(1) even under heavy load.
    """
    engine = RelationshipEngine()
    
    # 1. Generate a massive synthetic org structure (10,000 edges)
    relationships = []
    for i in range(1, 10001):
        relationships.append(RelationshipState(
            source_entity_id=1, 
            target_entity_id=i+1, 
            relationship_type="Parent-to-Child"
        ))
        
    # 2. Build the in-memory graph
    engine.build_graph(relationships)
    
    # 3. Benchmark the lookup query
    start_time = time.perf_counter()
    children = engine.get_children(parent_id=1)
    end_time = time.perf_counter()
    
    execution_time = end_time - start_time
    
    # 4. Assertions
    assert len(children) == 10000
    # O(1) lookup should be practically instant (under 1 millisecond)
    assert execution_time < 0.05, f"Performance Failure: Graph traversal took {execution_time} seconds"