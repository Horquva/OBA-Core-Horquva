from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
import logging

from ecosystem.applications.arcturus.contracts.shared.base_models import ArcturusValidationError
from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import EntityReference
from ecosystem.applications.arcturus.src.control_plane.ontology.ontology_controller import ontology_controller

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ontology", tags=["Enterprise Ontology"])

@router.post("/bootstrap")
async def bootstrap_ontology(payload: Dict[str, Any]):
    """
    Ingests the OntologySnapshotContract.
    Unblocks the Enterprise Template Generator by accepting the base structural state.
    """
    try:
        # Route the payload through the controller to handle versioning
        run_id = ontology_controller.bootstrap_domain(payload)
        return {
            "status": "success", 
            "message": "Ontology initialized and DAG constraints verified.",
            "run_id": run_id 
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
    if not ontology_controller.runtime.current_state:
        raise HTTPException(
            status_code=400, 
            detail={"error": "Ontology state not initialized. Cannot resolve entities.", "source": "Enterprise Ontology"}
        )
        
    try:
        # Used the controller's runtime instance
        entity = ontology_controller.runtime.resolve_entity(entity_type, entity_id)
        
        # Get the actual tracked version from the controller
        current_version = ontology_controller.get_entity_version(entity_type, entity_id)
        
        reference = EntityReference(
            entity_id=entity_id,
            entity_type=entity_type,
            version=current_version
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
    if not ontology_controller.runtime.current_state:
        raise HTTPException(
            status_code=400, 
            detail={"error": "Ontology state not initialized.", "source": "Enterprise Ontology"}
        )
    
    try:
        children_ids = ontology_controller.runtime.get_children_by_relationship(
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