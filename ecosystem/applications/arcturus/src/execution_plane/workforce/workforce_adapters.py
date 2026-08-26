from __future__ import annotations

from typing import List

from ecosystem.applications.arcturus.contracts.execution.workforce.base_models import (
    AgentAssignmentPayload,
    AgentProfileContract,
    WorkforceAgentRoster,
    WorkforceRoleContract,
)
from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseInstancePayload,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext,
)

from ecosystem.applications.arcturus.src.execution_plane.workforce.workforce_service import (
    WorkforceService,
)


class WorkforceAdapter:
    """
    Adapter layer for the Workforce platform.

    Translates shared contract data into WorkforceService calls
    and converts service results back into shared Workforce contracts.
    """

    def __init__(self, service: WorkforceService | None = None):
        self.service = service or WorkforceService()

    def materialize_agents(
        self,
        context: SimulationContext,
        enterprise_instance_id: str,
        agent_count: int,
    ) -> List[AgentProfileContract]:
        """
        Create workforce agents using the WorkforceService.
        """

        return self.service.materialize_agents(
            context=context,
            enterprise_instance_id=enterprise_instance_id,
            agent_count=agent_count,
        )
    def assign_roles(
        self,
        context: SimulationContext,
        assignment_id: str,
        enterprise_instance_id: str,
        agents: List[AgentProfileContract],
        roles: List[WorkforceRoleContract],
    ) -> AgentAssignmentPayload:
        """
        Assign agents to roles and return the result
        as an AgentAssignmentPayload contract.
        """

        assignments = self.service.assign_roles(
            agents=agents,
            roles=roles,
        )

        return AgentAssignmentPayload(
            context=context,
            assignment_id=assignment_id,
            enterprise_instance_id=enterprise_instance_id,
            assignments=assignments,
        )


    def build_roster(
        self,
        context: SimulationContext,
        enterprise_instance_id: str,
        agents: List[AgentProfileContract],
        roles: List[WorkforceRoleContract],
    ) -> WorkforceAgentRoster:
        """
        Build the final WorkforceAgentRoster contract.
        """

        return self.service.build_roster(
            context=context,
            enterprise_instance_id=enterprise_instance_id,
            agents=agents,
            roles=roles,
        )
    def materialize_from_enterprise(
        self,
        context: SimulationContext,
        enterprise: EnterpriseInstancePayload,
    ) -> List[AgentProfileContract]:
        """ Materialize workforce agents directly from an enterprise instance."""
        return self.service.materialize_from_enterprise(
            context=context,
            enterprise=enterprise,
        )
