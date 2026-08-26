from __future__ import annotations

from typing import Dict, List

from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseInstancePayload,
)

from ecosystem.applications.arcturus.contracts.execution.workforce.base_models import (
    AgentAssignment,
    AgentProfileContract,
    AvailabilityWindow,
    WorkforceAgentRoster,
    WorkforceRoleContract,
    WorkerCapability,
)

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
    SimulationContext,
)


class WorkforceService:
    """
    Service responsible for materializing synthetic workers,
    assigning them to enterprise roles, and building workforce rosters.
    """

    def materialize_from_enterprise(
        self,
        context: SimulationContext,
        enterprise: EnterpriseInstancePayload,
    ) -> List[AgentProfileContract]:
        """
        Materialize workers from an EnterpriseInstancePayload.
        """

        if not enterprise.departments and not enterprise.teams and not enterprise.roles:
            raise ArcturusValidationError(
                "Enterprise structure is empty; cannot materialize workforce.",
                "Workforce",
            )

        if not enterprise.is_structurally_valid:
            raise ArcturusValidationError(
                "Enterprise structure has not passed structural validation.",
                "Workforce",
            )

        agents: List[AgentProfileContract] = []

        roles = enterprise.roles

        for index, role in enumerate(roles, start=1):
            agents.append(
                AgentProfileContract(
                    agent_id=index,
                    name=f"Agent-{index:03d}",
                    role_id=role.role_id,
                    status="active",
                    capabilities=[],
                    availability=AvailabilityWindow(
                        start_hour=9,
                        end_hour=17,
                    ),
                    manager_id=None,
                    workload_capacity=1.0,
                    experiment_id=context.experiment_id,
                )
            )

        # Establish a simple deterministic manager/report hierarchy.
        if agents:
            for index, agent in enumerate(agents):
                if index > 0:
                    agent.manager_id = agents[0].agent_id

        return agents

    def materialize_agents(
        self,
        context: SimulationContext,
        enterprise_instance_id: str,
        agent_count: int,
    ) -> List[AgentProfileContract]:
        """
        Preserve the existing Day 1-5 API.

        Creates deterministic workers for callers that only have
        an enterprise instance ID and an explicit worker count.
        """

        if agent_count < 0:
            raise ValueError("agent_count cannot be negative")

        return [
            AgentProfileContract(
                agent_id=index,
                name=f"Agent-{index:03d}",
                role_id=0,
                status="active",
                capabilities=[],
                availability=AvailabilityWindow(),
                manager_id=None if index == 1 else 1,
                workload_capacity=1.0,
                experiment_id=context.experiment_id,
            )
            for index in range(1, agent_count + 1)
        ]

    @staticmethod
    def _has_required_capabilities(
        agent: AgentProfileContract,
        role: WorkforceRoleContract,
    ) -> bool:
        """
        Check whether the worker satisfies the Workforce-owned
        capability requirements of the role.
        """

        if not role.required_capability_ids:
            return True

        available = {
            capability.capability_id
            for capability in agent.capabilities
        }

        return all(
            capability_id in available
            for capability_id in role.required_capability_ids
        )

    def assign_roles(
        self,
        agents: List[AgentProfileContract],
        roles: List[WorkforceRoleContract],
    ) -> List[AgentAssignment]:
        """
        Assign workers to compatible roles using deterministic
        round-robin balancing.

        Workers are assigned only to roles whose capability
        requirements they satisfy. Among compatible roles, the
        role with the fewest current assignments is selected.
        Ties are resolved by the original role order.
        """

        assignments: List[AgentAssignment] = []

        if not roles:
            return assignments

        # Start from the assignments already present on each role.
        role_loads: Dict[int, int] = {
            role.role.role_id: len(role.assigned_agent_ids)
            for role in roles
        }

        for agent in agents:
            compatible_roles = [
                role
                for role in roles
                if self._has_required_capabilities(agent, role)
            ]

            if not compatible_roles:
                assignments.append(
                    AgentAssignment(
                        agent_id=agent.agent_id,
                        role_id=0,
                        status="BLOCKED",
                        reason=(
                            "No compatible role capability requirements "
                            "were satisfied."
                        ),
                    )
                )
                continue

            # Select the least-loaded compatible role.
            # min() preserves the original role order when loads tie,
            # making the assignment deterministic.
            selected_role = min(
                compatible_roles,
                key=lambda role: role_loads[role.role.role_id],
            )

            role_id = selected_role.role.role_id

            agent.role_id = role_id

            if agent.agent_id not in selected_role.assigned_agent_ids:
                selected_role.assigned_agent_ids.append(agent.agent_id)
                role_loads[role_id] += 1

            assignments.append(
                AgentAssignment(
                    agent_id=agent.agent_id,
                    role_id=role_id,
                    status="ASSIGNED",
                )
            )

        return assignments

    def build_roster(
        self,
        context: SimulationContext,
        enterprise_instance_id: str,
        agents: List[AgentProfileContract],
        roles: List[WorkforceRoleContract],
    ) -> WorkforceAgentRoster:
        """Build the final WorkforceAgentRoster."""

        for agent in agents:
            if agent.experiment_id != context.experiment_id:
                raise ArcturusValidationError(
                    "Worker belongs to a different experiment.",
                    "Workforce",
                )

        return WorkforceAgentRoster(
            context=context,
            enterprise_instance_id=enterprise_instance_id,
            agents=agents,
            roles=roles,
        )