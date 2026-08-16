from __future__ import annotations

from typing import Any

from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseInstancePayload,
)


class EnterpriseAdapter:
    """
    Adapter for translating an EnterpriseInstancePayload into a
    downstream-consumable representation.

    The adapter does not redefine enterprise entities. It consumes the
    canonical EnterpriseInstancePayload and exposes a stable dictionary
    representation for downstream platforms.
    """

    def to_downstream(self, instance: EnterpriseInstancePayload) -> dict[str, Any]:
        """
        Translate an EnterpriseInstancePayload into a downstream payload.
        """
        return {
            "instance_id": instance.instance_id,
            "config_id": instance.config_id,
            "organization": instance.organization.model_dump(),
            "divisions": [
                division.model_dump()
                for division in instance.divisions
            ],
            "departments": [
                department.model_dump()
                for department in instance.departments
            ],
            "teams": [
                team.model_dump()
                for team in instance.teams
            ],
            "roles": [
                role.model_dump()
                for role in instance.roles
            ],
            "is_structurally_valid": instance.is_structurally_valid,
            "validation_errors": list(instance.validation_errors),
        }