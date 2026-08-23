import logging
from typing import Dict, Any, Optional

from ecosystem.applications.arcturus.src.control_plane.ontology.ontology_runtime import OntologyRuntime
from ecosystem.applications.arcturus.contracts.shared.base_models import ArcturusValidationError

logger = logging.getLogger(__name__)

class OntologyController:
    """
    Day 1 Deliverable 3: API Controller & Entity Lifecycle Versioning.
    Manages the runtime and provides safe state mutation methods to track entity evolution.
    """
    def __init__(self):
        self.runtime = OntologyRuntime()
        # Tracks individual entity versions: {entity_type: {entity_id: version_string}}
        self._entity_versions: Dict[str, Dict[int, str]] = {}

    def bootstrap_domain(self, payload: Dict[str, Any]) -> str:
        """Ingests the initial snapshot payload, boots the runtime, and sets baseline versions."""
        self.runtime.load_snapshot(payload)
        self._initialize_versions()
        logger.info("Ontology Controller successfully bootstrapped domain state.")
        return str(self.runtime.current_state.run_id)

    def _initialize_versions(self) -> None:
        """Sets baseline version 1.0 for all loaded entities."""
        if not self.runtime.current_state:
            return
        
        for entity_type, entity_dict in self.runtime._entity_indices.items():
            self._entity_versions[entity_type] = {
                entity_id: "1.0" for entity_id in entity_dict.keys()
            }

    def evolve_entity_state(self, entity_type: str, entity_id: int, new_state_data: Dict[str, Any]) -> str:
        """Bumps the semantic version of an entity when a state transition occurs."""
        entity = self.runtime.resolve_entity(entity_type, entity_id)
        
        if entity_type not in self._entity_versions or entity_id not in self._entity_versions[entity_type]:
            raise ArcturusValidationError(
                message=f"Cannot evolve state: {entity_type} [{entity_id}] has no tracked lifecycle.",
                platform_source="Enterprise Ontology"
            )

        current_version = self._entity_versions[entity_type][entity_id]
        major, minor = current_version.split(".")
        new_version = f"{major}.{int(minor) + 1}"
        
        self._entity_versions[entity_type][entity_id] = new_version
        
        logger.info(f"🔄 Lifecycle Evolution: {entity_type} [{entity_id}] transitioned to v{new_version}")
        return new_version

    def get_entity_version(self, entity_type: str, entity_id: int) -> str:
        """Retrieves the current lifecycle version of a tracked entity."""
        if entity_type in self._entity_versions and entity_id in self._entity_versions[entity_type]:
            return self._entity_versions[entity_type][entity_id]
        return "1.0"