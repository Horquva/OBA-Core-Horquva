from typing import List, Optional
from uuid import UUID

from ecosystem.applications.arcturus.schemas.ontology.ontology_schemas import (
    BootstrapResponse,
    GraphTraversalResponse
)
from ecosystem.applications.arcturus.contracts.ontology.entity_reference_contract import EntityReference

class OntologyAdapter:
    """
    Anti-Corruption Layer (ACL) for the Enterprise Ontology.
    Transforms internal state and runtime outputs into strict, contract-compliant outbound shapes.
    """
    
    @staticmethod
    def format_bootstrap_response(run_id: UUID) -> BootstrapResponse:
        """Packages the successful bootstrap confirmation for Ajwa's platform."""
        return BootstrapResponse(
            status="success",
            message="Ontology initialized and DAG constraints verified.",
            run_id=run_id
        )
        
    @staticmethod
    def format_graph_traversal(parent_id: int, children: List[int], rel_type: Optional[str] = None) -> GraphTraversalResponse:
        """Packages the acyclic graph traversal array for Maaz's runtime."""
        return GraphTraversalResponse(
            parent_id=parent_id,
            relationship_type=rel_type,
            children_ids=children
        )