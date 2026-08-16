import logging
from typing import Set

from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import OntologySnapshotContract
from ecosystem.applications.arcturus.contracts.shared.base_models import ArcturusValidationError

# Note: We can pass the RelationshipEngine here later if we need to validate complex graph edges
from ecosystem.applications.arcturus.src.control_plane.ontology.relationship_engine import RelationshipEngine

logger = logging.getLogger(__name__)

class ConstraintEngine:
    """
    Enforces organizational and constitutional rules on the enterprise domain.
    Ensures structural validity beyond basic schema types.
    """
    def __init__(self, relationship_engine: RelationshipEngine):
        self.relationship_engine = relationship_engine

    def validate_state(self, state: OntologySnapshotContract) -> None:
        """
        Runs all constitutional constraint checks against the current snapshot.
        If any rule is violated, it halts execution by raising an ArcturusValidationError.
        """
        logger.info("Running enterprise constraint validations...")
        
        self._check_orphaned_capabilities(state)
        self._check_department_hierarchy(state)
        self._check_employee_scope(state)
        
        logger.info("All constitutional constraints passed successfully.")

    def _check_orphaned_capabilities(self, state: OntologySnapshotContract) -> None:
        """
        Rule: A Capability must be owned by exactly one Department. It cannot be orphaned.
        """
        valid_dept_ids: Set[int] = {dept.dept_id for dept in state.departments}
        for cap in state.capabilities:
            if cap.dept_id not in valid_dept_ids:
                raise ArcturusValidationError(
                    message=f"Constraint Violation: Capability {cap.cap_id} is orphaned. Referenced Department {cap.dept_id} does not exist.",
                    platform_source="Enterprise Ontology"
                )

    def _check_department_hierarchy(self, state: OntologySnapshotContract) -> None:
        """
        Rule: A Department must be owned by exactly one Division.
        """
        valid_div_ids: Set[int] = {div.div_id for div in state.divisions}
        for dept in state.departments:
            if dept.div_id not in valid_div_ids:
                raise ArcturusValidationError(
                    message=f"Constraint Violation: Department {dept.dept_id} references invalid Division {dept.div_id}.",
                    platform_source="Enterprise Ontology"
                )

    def _check_employee_scope(self, state: OntologySnapshotContract) -> None:
        """
        Rule: An Employee must belong to a valid organizational scope (e.g., assigned a valid role).
        """
        valid_role_ids: Set[int] = {role.role_id for role in state.roles}
        for emp in state.employees:
            if emp.role_id not in valid_role_ids:
                raise ArcturusValidationError(
                    message=f"Constraint Violation: Employee {emp.employee_id} references invalid Role {emp.role_id}.",
                    platform_source="Enterprise Ontology"
                )