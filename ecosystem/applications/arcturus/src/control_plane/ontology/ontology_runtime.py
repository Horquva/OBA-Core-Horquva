from typing import Dict, Any, Optional
from pydantic import ValidationError
import logging

from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
    OntologySnapshotContract,
    DepartmentState,
    EmployeeState,
    CapabilityState
)
from ecosystem.applications.arcturus.contracts.ontology.entity_reference_contract import (
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
        
        # In-memory indices for lightning-fast entity resolution during simulation ticks
        self._departments: Dict[int, DepartmentState] = {}
        self._employees: Dict[int, EmployeeState] = {}
        self._capabilities: Dict[int, CapabilityState] = {}
        # (Additional indices for the remaining entities)

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
            
            # Accessing run_id through the shared 'context' envelope field
            logger.info(f"Loaded Ontology Snapshot v{self.current_state.snapshot_version} for Run: {self.current_state.context.run_id}")
            
            # Hydrate the fast-lookup indices
            self._rebuild_indices()

            # Build the graph and enforce Quality Gate 5 (Acyclic Check)
            self.relationship_engine.build_graph(self.current_state.relationships)

            # Enforce Constitutional Rules (Orphaned capabilities, scopes, etc.)
            self.constraint_engine.validate_state(self.current_state)

            
        except ValidationError as e:
            logger.error("FATAL: Inbound payload violated constitutional schema.")
            # COMPLIANCE: Using the shared error taxonomy instead of base exceptions
            raise ArcturusValidationError(
                message=f"Schema validation failed: {str(e)}", 
                platform_source="Enterprise Ontology"
            ) from e

    def _rebuild_indices(self) -> None:
        """Flushes and rebuilds hash maps whenever the state changes."""
        if not self.current_state:
            return
            
        self._departments = {dept.dept_id: dept for dept in self.current_state.departments}
        self._employees = {emp.employee_id: emp for emp in self.current_state.employees}
        self._capabilities = {cap.cap_id: cap for cap in self.current_state.capabilities}
        # (Hydrate remaining indices...)

    def resolve_entity(self, entity_type: str, entity_id: int) -> EntityReference:
        """
        Validates if an entity exists in the current ontology state.
        Produces the EntityReference payload for the Scenario Engineering Platform.
        """
        is_resolved = False
        notes = None

        if entity_type == "Department":
            is_resolved = entity_id in self._departments
        elif entity_type == "Employee":
            is_resolved = entity_id in self._employees
        elif entity_type == "Capability":
            is_resolved = entity_id in self._capabilities
        else:
            notes = f"Resolution warning: '{entity_type}' is not a recognized constitutional entity."

        if not is_resolved and not notes:
            notes = f"Target {entity_type} [{entity_id}] does not exist in the active enterprise state."

        return EntityReference(
            entity_type=entity_type,
            entity_id=entity_id,
            is_resolved=is_resolved,
            resolution_notes=notes
        )