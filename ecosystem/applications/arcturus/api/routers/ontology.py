from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
import logging

from ecosystem.applications.arcturus.contracts.shared.base_models import ArcturusValidationError
from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import EntityReference
from ecosystem.applications.arcturus.src.control_plane.ontology.ontology_runtime import OntologyRuntime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ontology", tags=["Enterprise Ontology"])

# Instantiate your core engine to maintain state during the simulation
ontology_service = OntologyRuntime()

@router.post("/bootstrap")
async def bootstrap_ontology(payload: Dict[str, Any]):
    """
    Ingests the OntologySnapshotContract.
    Unblocks the Enterprise Template Generator by accepting the base structural state.
    """
    try:
        ontology_service.load_snapshot(payload)
        return {
            "status": "success", 
            "message": "Ontology initialized and DAG constraints verified.",
            # UPDATED: run_id is now accessed directly at the root level
            "run_id": str(ontology_service.current_state.run_id) 
        }
    except ArcturusValidationError as e:
        logger.error(f"Bootstrap failed: {e.message}")
        raise HTTPException(
            status_code=422, 
            detail={"error": e.message, "source": e.platform_source}
        )

@router.get("/resolve/{entity_type}/{entity_id}")
async def resolve_structural_entity(entity_type: str, entity_id: int):
    """
    Exposes the entity resolution logic.
    Unblocks the Scenario Engine (Maryam) to verify target existence.
    """
    if not ontology_service.current_state:
        raise HTTPException(
            status_code=400, 
            detail={"error": "Ontology state not initialized. Cannot resolve entities.", "source": "Enterprise Ontology"}
        )
        
    try:
        # UPDATED: Resolve the entity and package it into the strict EntityReference contract
        entity = ontology_service.resolve_entity(entity_type, entity_id)
        reference = EntityReference(
            entity_id=entity_id,
            entity_type=entity_type,
            version="1.0"
        )
        return reference.model_dump()
    except ArcturusValidationError as e:
        raise HTTPException(
            status_code=404,
            detail={"error": e.message, "source": e.platform_source}
        )

@router.get("/graph/children/{parent_id}")
async def get_entity_children(parent_id: int, relationship_type: Optional[str] = None) -> List[int]:
    """
    Traverses the acyclic graph to find downstream entities.
    Unblocks the Runtime Engine (Maaz) for structural queries during simulation ticks.
    """
    if not ontology_service.current_state:
        raise HTTPException(
            status_code=400, 
            detail={"error": "Ontology state not initialized.", "source": "Enterprise Ontology"}
        )
    
    try:
        # UPDATED: Use the runtime's safe traversal method
        children_ids = ontology_service.get_children_by_relationship(
            source_id=parent_id, 
            relationship_type=relationship_type
        )
        return children_ids
    except Exception as e:
        logger.error(f"Graph traversal failed for node {parent_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Internal graph traversal error", "source": "Enterprise Ontology"}
        )