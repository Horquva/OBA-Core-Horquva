from typing import Dict, Any, Optional, List
from pydantic import ValidationError
import logging

from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
    OntologySnapshotContract,
    EntityReference
)
from ecosystem.applications.arcturus.contracts.shared.base_models import ArcturusValidationError

from ecosystem.applications.arcturus.src.control_plane.ontology.relationship_engine import RelationshipEngine
from ecosystem.applications.arcturus.src.control_plane.ontology.constraint_engine import ConstraintEngine

logger = logging.getLogger(__name__)

class OntologyRuntime:
    """
    Core execution engine for the Enterprise Ontology Platform.
    Maintains the live domain state, handles deterministic transitions, 
    and resolves entities for downstream platforms.
    """
    
    def __init__(self):
        # The immutable, versioned domain state for the current clock tick
        self.current_state: Optional[OntologySnapshotContract] = None
        
        # In-memory indices for lightning-fast entity resolution
        self._entity_indices: Dict[str, Dict[int, Any]] = {}

        # Instantiate the Relationship Engine
        self.relationship_engine = RelationshipEngine()
        self.constraint_engine = ConstraintEngine(self.relationship_engine)

    def load_snapshot(self, payload: dict[str, Any]) -> None:
        """
        Ingests a JSON/Dict payload and validates it against the strict Part-3 Pydantic schema.
        """
        try:
            # Validates against ContractEnvelope-wrapped snapshot
            self.current_state = OntologySnapshotContract(**payload)
            
            # run_id is now accessed directly from the hardened contract
            logger.info(f"Loaded Ontology Snapshot v{self.current_state.snapshot_version} for Run: {self.current_state.run_id}")
            
            # Hydrate the fast-lookup indices
            self._rebuild_indices()

            # Build the graph and enforce Quality Gate 5 (Acyclic Check)
            self.relationship_engine.build_graph(self.current_state.relationships)

            # Enforce Constitutional Rules (Orphaned capabilities, scopes, etc.)
            self.constraint_engine.validate_state(self.current_state)
            
        except ValidationError as e:
            logger.error("FATAL: Inbound payload violated constitutional schema.")
            raise ArcturusValidationError(
                message=f"Schema validation failed: {str(e)}", 
                platform_source="Enterprise Ontology"
            ) from e

    def _rebuild_indices(self) -> None:
        """Flushes and rebuilds hash maps for ALL entities whenever the state changes."""
        if not self.current_state:
            return
            
        self._entity_indices = {
            "Organization": {org.org_id: org for org in self.current_state.organizations},
            "Division": {div.div_id: div for div in self.current_state.divisions},
            "Department": {dept.dept_id: dept for dept in self.current_state.departments},
            "Team": {team.team_id: team for team in self.current_state.teams},
            "Employee": {emp.employee_id: emp for emp in self.current_state.employees},
            "Role": {role.role_id: role for role in self.current_state.roles},
            "Capability": {cap.cap_id: cap for cap in self.current_state.capabilities},
            "Process": {proc.process_id: proc for proc in self.current_state.processes},
            "Workflow": {wf.workflow_id: wf for wf in self.current_state.workflows},
            "Policy": {pol.policy_id: pol for pol in self.current_state.policies},
            "Decision": {dec.decision_id: dec for dec in self.current_state.decisions},
            "Event": {ev.event_id: ev for ev in self.current_state.events},
            "Goal": {goal.goal_id: goal for goal in self.current_state.goals},
            "Knowledge": {know.knowledge_id: know for know in self.current_state.knowledge},
            "Risk": {risk.risk_id: risk for risk in self.current_state.risks},
            "Asset": {asset.asset_id: asset for asset in self.current_state.assets},
            "Resource": {res.resource_id: res for res in self.current_state.resources},
        }

    def resolve_entity(self, entity_type: str, entity_id: int) -> Any:
        """
        Directly retrieves an entity from the runtime. 
        Raises ArcturusValidationError if missing.
        """
        if not self.current_state:
            raise ArcturusValidationError(
                message="Cannot resolve entity: No ontology snapshot loaded.",
                platform_source="Enterprise Ontology"
            )
            
        if entity_type not in self._entity_indices:
            raise ArcturusValidationError(
                message=f"Unknown entity type requested: {entity_type}",
                platform_source="Enterprise Ontology"
            )
            
        entity = self._entity_indices[entity_type].get(entity_id)
        if not entity:
            raise ArcturusValidationError(
                message=f"Target {entity_type} [{entity_id}] does not exist in the active enterprise state.",
                platform_source="Enterprise Ontology"
            )
            
        return entity

    # --------------------------------------
    # GRAPH TRAVERSAL METHODS
    # --------------------------------------
    
    def get_children_by_relationship(self, source_id: int, relationship_type: Optional[str] = None) -> List[int]:
        """Traverses the explicit relationship edges defined in the snapshot graph."""
        if not self.current_state:
            return []
            
        return [
            rel.target_entity_id for rel in self.current_state.relationships 
            if rel.source_entity_id == source_id 
            and (relationship_type is None or rel.relationship_type == relationship_type)
        ]