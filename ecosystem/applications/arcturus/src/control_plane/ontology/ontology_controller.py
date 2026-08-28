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
        self._entity_versions: Dict[str, Dict[int, str]] = {}
        
        # Maps entity types to their attribute names in the snapshot
        self._list_map = {
            "Organization": "organizations", "Division": "divisions",
            "Department": "departments", "Team": "teams",
            "Employee": "employees", "Role": "roles",
            "Capability": "capabilities", "Process": "processes",
            "Workflow": "workflows", "Policy": "policies",
            "Decision": "decisions", "Event": "events",
            "Goal": "goals", "Knowledge": "knowledge",
            "Risk": "risks", "Asset": "assets", "Resource": "resources"
        }
        
        # Maps entity types to their primary key ID fields
        self._id_field_map = {
            "Organization": "org_id", "Division": "div_id", "Department": "dept_id",
            "Team": "team_id", "Employee": "employee_id", "Role": "role_id",
            "Capability": "cap_id", "Process": "process_id", "Workflow": "workflow_id",
            "Policy": "policy_id", "Decision": "decision_id", "Event": "event_id",
            "Goal": "goal_id", "Knowledge": "knowledge_id", "Risk": "risk_id",
            "Asset": "asset_id", "Resource": "resource_id"
        }

    def bootstrap_domain(self, payload: Dict[str, Any]) -> str:
            self.runtime.load_snapshot(payload)
            self._initialize_versions()
            logger.info("Ontology Controller successfully bootstrapped domain state.")
            return str(self.runtime.current_state.context.run_id)

    def _initialize_versions(self) -> None:
        if not self.runtime.current_state:
            return
        for entity_type, entity_dict in self.runtime._entity_indices.items():
            self._entity_versions[entity_type] = {
                entity_id: "1.0" for entity_id in entity_dict.keys()
            }

    def evolve_entity_state(self, entity_type: str, entity_id: int, new_state_data: Dict[str, Any]) -> str:
        """Bumps the semantic version of an entity and safely mutates the frozen state."""
        entity = self.runtime.resolve_entity(entity_type, entity_id)
        
        if entity_type not in self._entity_versions or entity_id not in self._entity_versions[entity_type]:
            raise ArcturusValidationError(
                message=f"Cannot evolve state: {entity_type} [{entity_id}] has no tracked lifecycle.",
                platform_source="Enterprise Ontology"
            )

        # 1. Bump the semantic version
        current_version = self._entity_versions[entity_type][entity_id]
        major, minor = current_version.split(".")
        new_version = f"{major}.{int(minor) + 1}"
        self._entity_versions[entity_type][entity_id] = new_version
        
        # 2. Safely mutate the state using Pydantic's model_copy
        updated_entity = entity.model_copy(update=new_state_data)
        
        # 3. Swap it into the target snapshot list
        list_name = self._list_map[entity_type]
        id_field = self._id_field_map[entity_type]
        current_list = getattr(self.runtime.current_state, list_name)
        
        new_list = [
            updated_entity if getattr(item, id_field) == entity_id else item 
            for item in current_list
        ]
        
        # 4. Clone the snapshot with the updated list and inject back into runtime
        new_snapshot = self.runtime.current_state.model_copy(update={list_name: new_list})
        self.runtime.current_state = new_snapshot
        self.runtime._rebuild_indices()
        
        logger.info(f"🔄 Lifecycle Evolution: {entity_type} [{entity_id}] transitioned to v{new_version}")
        return new_version

    def get_entity_version(self, entity_type: str, entity_id: int) -> str:
        if entity_type in self._entity_versions and entity_id in self._entity_versions[entity_type]:
            return self._entity_versions[entity_type][entity_id]
        return "1.0"

    def export_snapshot(self) -> dict:
        """Export the current ontology snapshot as a dictionary."""
        if self.runtime.current_state:
            return self.runtime.current_state.model_dump()
        return {}

ontology_controller = OntologyController()