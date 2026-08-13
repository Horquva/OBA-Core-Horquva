from __future__ import annotations

from typing import List

from ecosystem.applications.arcturus.contracts.execution.workforce.base_models import (
    AgentAssignment,
    AgentProfileContract,
    WorkforceAgentRoster,
    WorkforceRoleContract,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext,
)


class WorkforceService:
    """
    Service responsible for materializing synthetic agents,
    assigning them to roles, and building the workforce roster.
    """

    def materialize_agents(
        self,
        context: SimulationContext,
        enterprise_instance_id: str,
        agent_count: int,
    ) -> List[AgentProfileContract]:
        """
        Create synthetic workforce agents for an enterprise.
        """

        if agent_count < 0:
            raise ValueError("agent_count cannot be negative")

        agents = []

        for index in range(1, agent_count + 1):
            agents.append(
                AgentProfileContract(
                    agent_id=index,
                    name=f"Agent-{index:03d}",
                    role_id=0,
                    status="active",
                )
            )

        return agents

    def assign_roles(
        self,
        agents: List[AgentProfileContract],
        roles: List[WorkforceRoleContract],
    )  -> List[AgentAssignment]:
        """
        Assign available agents to the supplied workforce roles.
        """

        assignments = []

        if not roles:
            return assignments

        role_index = 0

        for agent in agents:
            role = roles[role_index % len(roles)]

            agent.role_id = role.role.role_id

            if agent.agent_id not in role.assigned_agent_ids:
                role.assigned_agent_ids.append(agent.agent_id)

            assignments.append(
                AgentAssignment(
                    agent_id=agent.agent_id,
                    role_id=role.role.role_id,
                )
            )

            role_index += 1

        return assignments

    def build_roster(
        self,
        context: SimulationContext,
        enterprise_instance_id: str,
        agents: List[AgentProfileContract],
        roles: List[WorkforceRoleContract],
    ) -> WorkforceAgentRoster:
        """
        Build the final workforce roster.
        """

        return WorkforceAgentRoster(
            context=context,
            enterprise_instance_id=enterprise_instance_id,
            agents=agents,
            roles=roles,
        )