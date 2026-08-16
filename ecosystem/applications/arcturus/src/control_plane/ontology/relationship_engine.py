from typing import List, Dict, Set
import logging

# Importing your local contract and the shared error taxonomy
from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import RelationshipState
from ecosystem.applications.arcturus.contracts.shared.base_models import ArcturusValidationError

logger = logging.getLogger(__name__)

class RelationshipEngine:
    """
    Manages the structural graph of the synthetic enterprise.
    Enforces directed acyclic graph (DAG) constraints and resolves connections.
    """
    def __init__(self):
        # Adjacency list for lightning-fast graph traversal during clock ticks
        self._graph: Dict[int, List[RelationshipState]] = {}
        
    def build_graph(self, relationships: List[RelationshipState]) -> None:
        """
        Hydrates the in-memory graph from the snapshot payload and validates it.
        """
        self._graph.clear()
        for rel in relationships:
            if rel.source_entity_id not in self._graph:
                self._graph[rel.source_entity_id] = []
            self._graph[rel.source_entity_id].append(rel)
            
        # Enforce Quality Gate 5 immediately upon building
        self._validate_acyclic()
        logger.info(f"Relationship graph successfully built with {len(relationships)} edges.")

    def _validate_acyclic(self) -> None:
        """
        Detects circular dependencies to prevent simulation freezes.
        Satisfies Quality Gate 5: Acyclic Hierarchy Assertion.
        """
        visited: Set[int] = set()
        recursion_stack: Set[int] = set()

        def has_cycle(node_id: int) -> bool:
            visited.add(node_id)
            recursion_stack.add(node_id)

            for edge in self._graph.get(node_id, []):
                neighbor = edge.target_entity_id
                if neighbor not in visited:
                    if has_cycle(neighbor):
                        return True
                elif neighbor in recursion_stack:
                    return True
                    
            recursion_stack.remove(node_id)
            return False

        for node in list(self._graph.keys()):
            if node not in visited:
                if has_cycle(node):
                    raise ArcturusValidationError(
                        message=f"Circular dependency detected at entity ID {node}. Organizational hierarchy must be acyclic.",
                        platform_source="Enterprise Ontology"
                    )

    def get_children(self, parent_id: int, relationship_type: str = None) -> List[int]:
        """Retrieves downstream entities, optionally filtered by relationship type."""
        edges = self._graph.get(parent_id, [])
        if relationship_type:
            return [edge.target_entity_id for edge in edges if edge.relationship_type == relationship_type]
        return [edge.target_entity_id for edge in edges]