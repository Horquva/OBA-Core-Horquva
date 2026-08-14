from __future__ import annotations

from typing import List

from ecosystem.applications.arcturus.contracts.execution.workforce.base_models import (
    AgentAssignmentPayload,
    AgentProfileContract,
    WorkforceAgentRoster,
    WorkforceRoleContract,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext,
)
from ecosystem.applications.arcturus.src.execution_plane.workforce.workforce_adapters import (
    WorkforceAdapter,
)


class WorkforceChain:
    """
    Day 5 integration wrapper for the Workforce platform.

    Connects the Workforce adapter to the cross-platform
    Arcturus integration chain.
    """

    def __init__(self, adapter: WorkforceAdapter | None = None):
        self.adapter = adapter or WorkforceAdapter()

    def run(
        self,
        context: SimulationContext,
        enterprise_instance_id: str,
        assignment_id: str,
        agent_count: int,
        roles: List[WorkforceRoleContract],
    ) -> dict:
        """
        Execute the Workforce integration slice.

        The chain:
            1. Materializes workforce agents.
            2. Assigns agents to roles.
            3. Builds the workforce roster.
            4. Returns the contracts required by downstream platforms.
        """

        agents: List[AgentProfileContract] = self.adapter.materialize_agents(
            context=context,
            enterprise_instance_id=enterprise_instance_id,
            agent_count=agent_count,
        )

        assignment_payload: AgentAssignmentPayload = self.adapter.assign_roles(
            context=context,
            assignment_id=assignment_id,
            enterprise_instance_id=enterprise_instance_id,
            agents=agents,
            roles=roles,
        )

        roster: WorkforceAgentRoster = self.adapter.build_roster(
            context=context,
            enterprise_instance_id=enterprise_instance_id,
            agents=agents,
            roles=roles,
        )

        return {
            "assignment_payload": assignment_payload,
            "roster": roster,
        }