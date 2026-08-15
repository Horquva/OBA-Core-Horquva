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


class WorkforceChain:
    """
    Day 5 Workforce integration-chain wrapper.

    This layer works only with shared Workforce contracts.
    It does not import or depend directly on another
    platform implementation.
    """

    def run(
        self,
        context: SimulationContext,
        enterprise_instance_id: str,
        assignment_id: str,
        agents: List[AgentProfileContract],
        assignments: AgentAssignmentPayload,
        roster: WorkforceAgentRoster,
    ) -> dict:
        """
        Package validated Workforce outputs for the
        downstream integration chain.
        """

        if assignments.enterprise_instance_id != enterprise_instance_id:
            raise ValueError(
                "Assignment payload enterprise_instance_id does not match "
                "the Workforce chain enterprise_instance_id."
            )

        if roster.enterprise_instance_id != enterprise_instance_id:
            raise ValueError(
                "Roster enterprise_instance_id does not match "
                "the Workforce chain enterprise_instance_id."
            )

        if assignments.assignment_id != assignment_id:
            raise ValueError(
                "Assignment payload assignment_id does not match "
                "the Workforce chain assignment_id."
            )

        return {
            "context": context,
            "enterprise_instance_id": enterprise_instance_id,
            "assignment_id": assignment_id,
            "agents": agents,
            "assignment_payload": assignments,
            "roster": roster,
        }