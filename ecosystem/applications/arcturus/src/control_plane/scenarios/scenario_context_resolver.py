"""
Scenario Engineering Platform — Context Resolver
Owner: Maryam Yaqoob

Part-2 gap closure (Real Arcturus Context Integration).

Prior state (see scenario_engine.py module docstring): participants,
organizational_scope, and preconditions were validated ONLY for
structural well-formedness (non-empty, correctly typed strings). No
check was made against real Enterprise/Ontology data. This module adds
that check, using Ajwa's real EnterpriseInstancePayload
(contracts/enterprise/base_models.py) and the ontology entity types it
re-exports from Hamza's platform (OrganizationState, DivisionState,
DepartmentState, TeamState, RoleState).

ASSUMPTION FLAGGED (important): ScenarioDSLPayload.participants and
.organizational_scope are free-text strings (e.g. 'HR Lead',
'Leadership'), while Ajwa/Hamza's real entities are identified by
integer IDs (role_id, dept_id, div_id) with separate human-readable name
fields (role_title, dept_name, div_name). There is no existing, agreed
convention in the spec for how a scenario string should map to a real
entity ID. I have implemented this as a NAME MATCH: a
participant/scope string resolves if it exactly matches (case-sensitive)
an existing role_title / dept_name / div_name in the supplied
EnterpriseInstancePayload. This is a reasonable interpretation, not a
confirmed contract — it should be validated with Ajwa/Hamza, especially
around case-sensitivity and whether team-level or org-level scope
strings should also be supported (currently: Division and Department
only for scope; Role only for participants — Team and Organization
level scope are NOT currently matched, flagged as a gap below).

Also flagged: EnterpriseInstancePayload.is_structurally_valid defaults
to False and is only set True by Ajwa's Day 3-5 constraint engine. This
resolver treats an enterprise instance with is_structurally_valid=False
as usable for name resolution (the names still exist), but callers
should be aware resolution against a not-yet-validated instance may
later be invalidated upstream — see resolve_scenario_context(strict=...).

No cross-platform src/ imports (only contracts, per §2.1): this module
imports Ajwa's contracts/enterprise/base_models.py and Javeria's
contracts/execution/workflows/base_models.py, which is the intended use
of shared contracts (consuming another platform's *contract*, never
their *src/*).
"""

from __future__ import annotations

from dataclasses import dataclass

from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
    ScenarioDSLPayload,
)
from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseInstancePayload,
)
from ecosystem.applications.arcturus.contracts.execution.workflows.base_models import (
    WorkflowDefinitionContract,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
)

PLATFORM_SOURCE = "scenario_engineering"


@dataclass(frozen=True)
class ResolvedEntity:
    """One participant/scope string, resolved (or not) against real data."""

    entity_type: str  # "Division" | "Department" | "Role" | "Unknown"
    label: str  # the original string from the scenario payload
    entity_id: int  # real ID if resolved, -1 if not
    is_resolved: bool
    resolution_notes: str | None = None


@dataclass(frozen=True)
class ScenarioContextResolution:
    """Result of resolving one scenario against one enterprise instance."""

    scenario_id: str
    enterprise_instance_id: str
    resolved_scope: list[ResolvedEntity]
    resolved_participants: list[ResolvedEntity]

    @property
    def all_resolved(self) -> bool:
        return all(
            e.is_resolved for e in self.resolved_scope + self.resolved_participants
        )

    @property
    def unresolved(self) -> list[ResolvedEntity]:
        return [
            e
            for e in self.resolved_scope + self.resolved_participants
            if not e.is_resolved
        ]


def resolve_organizational_scope(
    payload: ScenarioDSLPayload, enterprise: EnterpriseInstancePayload
) -> list[ResolvedEntity]:
    """
    Resolve each organizational_scope string against real Division and
    Department names in `enterprise`. Team-level and Organization-level
    scope strings are NOT currently matched (see module docstring
    "ASSUMPTION FLAGGED" — flagged as a known limitation, not silently
    dropped: unmatched strings simply come back unresolved).
    """
    division_by_name = {d.div_name: d for d in enterprise.divisions}
    department_by_name = {
        d.dept_name: d for d in enterprise.departments if d.dept_name
    }

    resolved: list[ResolvedEntity] = []
    for scope_label in payload.organizational_scope:
        if scope_label in division_by_name:
            div = division_by_name[scope_label]
            resolved.append(
                ResolvedEntity("Division", scope_label, div.div_id, True)
            )
        elif scope_label in department_by_name:
            dept = department_by_name[scope_label]
            resolved.append(
                ResolvedEntity("Department", scope_label, dept.dept_id, True)
            )
        else:
            resolved.append(
                ResolvedEntity(
                    "Unknown",
                    scope_label,
                    -1,
                    False,
                    f"'{scope_label}' does not match any division or "
                    f"department name in enterprise instance "
                    f"'{enterprise.instance_id}'",
                )
            )
    return resolved


def resolve_participants(
    payload: ScenarioDSLPayload, enterprise: EnterpriseInstancePayload
) -> list[ResolvedEntity]:
    """
    Resolve each participant string against real Role titles in
    `enterprise`. Does NOT invent participant records — an unmatched
    string is reported as unresolved, never silently accepted.
    """
    role_by_title = {r.role_title: r for r in enterprise.roles}

    resolved: list[ResolvedEntity] = []
    for participant_label in payload.participants:
        if participant_label in role_by_title:
            role = role_by_title[participant_label]
            resolved.append(
                ResolvedEntity("Role", participant_label, role.role_id, True)
            )
        else:
            resolved.append(
                ResolvedEntity(
                    "Unknown",
                    participant_label,
                    -1,
                    False,
                    f"'{participant_label}' does not match any role_title "
                    f"in enterprise instance '{enterprise.instance_id}'",
                )
            )
    return resolved


def resolve_scenario_context(
    payload: ScenarioDSLPayload,
    enterprise: EnterpriseInstancePayload,
    *,
    strict: bool = True,
) -> ScenarioContextResolution:
    """
    Resolve both participants and organizational_scope for `payload`
    against `enterprise`.

    If strict=True (default), raises ArcturusValidationError when any
    entity fails to resolve — this is the "no invented participant
    records" / "no silently create duplicate enterprise truth"
    enforcement point required by Part 2. Pass strict=False only for
    diagnostic/reporting use (e.g. building a gap report), never as part
    of the real compile/dispatch path.
    """
    resolution = ScenarioContextResolution(
        scenario_id=payload.scenario_id,
        enterprise_instance_id=enterprise.instance_id,
        resolved_scope=resolve_organizational_scope(payload, enterprise),
        resolved_participants=resolve_participants(payload, enterprise),
    )

    if strict and not resolution.all_resolved:
        unresolved_labels = [e.label for e in resolution.unresolved]
        raise ArcturusValidationError(
            f"scenario '{payload.scenario_id}' references entities not "
            f"found in enterprise instance '{enterprise.instance_id}': "
            f"{unresolved_labels}",
            PLATFORM_SOURCE,
        )

    return resolution


def verify_workflow_compatibility(
    payload: ScenarioDSLPayload,
    workflow: WorkflowDefinitionContract,
    enterprise: EnterpriseInstancePayload,
) -> None:
    """
    Part 2 §5 (Workflow compatibility): verify that a WorkflowDefinitionContract
    (Javeria's platform) was built against the SAME enterprise instance this
    scenario is targeting. Does not validate anything about workflow
    activities/policies themselves — that remains Javeria's boundary
    (per the spec: "Javeria remains responsible for Workflow
    implementation").

    Raises ArcturusValidationError if organizational_context_ref does not
    match enterprise.instance_id.
    """
    if workflow.organizational_context_ref != enterprise.instance_id:
        raise ArcturusValidationError(
            f"scenario '{payload.scenario_id}' targets enterprise instance "
            f"'{enterprise.instance_id}', but workflow "
            f"'{workflow.workflow_id}' was built against organizational "
            f"context '{workflow.organizational_context_ref}' — scenario "
            f"and workflow are not compatible (different enterprise "
            f"instances)",
            PLATFORM_SOURCE,
        )


__all__ = [
    "ResolvedEntity",
    "ScenarioContextResolution",
    "resolve_organizational_scope",
    "resolve_participants",
    "resolve_scenario_context",
    "verify_workflow_compatibility",
]
