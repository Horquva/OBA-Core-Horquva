from __future__ import annotations

from typing import List

from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseConfigurationPayload,
    EnterpriseInstancePayload,
    EnterpriseTemplatePayload,
)
from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
    DepartmentState,
    DivisionState,
    OrganizationState,
    RoleState,
    TeamState,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
)


class EnterpriseGenerator:
    """
    Core local generator for the Synthetic Enterprise Platform.

    Converts:
        EnterpriseTemplatePayload
        +
        EnterpriseConfigurationPayload

    into:
        EnterpriseInstancePayload

    The generator creates a generic enterprise structure rather than
    generating a company for one specific industry or size.
    """

    def generate(
        self,
        template: EnterpriseTemplatePayload,
        config: EnterpriseConfigurationPayload,
    ) -> EnterpriseInstancePayload:
        """
        Generate a structurally valid enterprise instance.

        The generation is deterministic for the same global_seed,
        template, and configuration.
        """

        self._validate_inputs(template, config)

        context = config.context
        seed = context.global_seed

        # ---------------------------------------------------------
        # 1. Determine business units / divisions
        # ---------------------------------------------------------

        business_units = (
            config.custom_business_units
            if config.custom_business_units
            else template.default_business_units
        )

        if not business_units:
            business_units = self._default_business_units(
                template.industry_type.value
            )

        # ---------------------------------------------------------
        # 2. Determine department count
        # ---------------------------------------------------------

        department_count = config.department_count_override

        if department_count is None:
            department_count = max(
                len(business_units),
                self._default_department_count(template.scale_profile.value),
            )

        if department_count < 1:
            raise ArcturusValidationError(
                "Department count must be at least 1.",
                "SyntheticEnterprise",
            )

        # ---------------------------------------------------------
        # 3. Create organization
        # ---------------------------------------------------------

        organization = OrganizationState(
            org_id=self._make_id(seed, 1),
            org_name=config.org_name,
            leader=None,
        )

        # ---------------------------------------------------------
        # 4. Create divisions
        # ---------------------------------------------------------

        divisions: List[DivisionState] = []

        for index, business_unit in enumerate(business_units, start=1):
            divisions.append(
                DivisionState(
                    div_id=self._make_id(seed, 100 + index),
                    div_name=business_unit,
                    org_id=organization.org_id,
                )
            )

        # ---------------------------------------------------------
        # 5. Create departments
        # ---------------------------------------------------------

        departments: List[DepartmentState] = []

        for index in range(department_count):
            division = divisions[index % len(divisions)]

            department_name = self._department_name(
                index=index,
                industry=template.industry_type.value,
            )

            departments.append(
                DepartmentState(
                    dept_id=self._make_id(seed, 200 + index),
                    div_id=division.div_id,
                    dept_name=department_name,
                    readiness_score=1.0,
                    cost=None,
                )
            )

        # ---------------------------------------------------------
        # 6. Create teams
        # ---------------------------------------------------------

        teams: List[TeamState] = []

        team_min, team_max = self._team_size_range(
            config.team_size_range
        )

        for index, department in enumerate(departments):
            team_size = self._deterministic_team_size(
                seed=seed,
                index=index,
                minimum=team_min,
                maximum=team_max,
            )

            teams.append(
                TeamState(
                    team_id=self._make_id(seed, 300 + index),
                    dept_id=department.dept_id,
                    total_employees=team_size,
                )
            )

        # ---------------------------------------------------------
        # 7. Create generic roles
        # ---------------------------------------------------------

        roles: List[RoleState] = []

        role_titles = [
            "Department Manager",
            "Team Lead",
            "Specialist",
        ]

        for index, title in enumerate(role_titles):
            roles.append(
                RoleState(
                    role_id=self._make_id(seed, 400 + index),
                    role_title=title,
                    access_level=float(index + 1),
                )
            )

        # ---------------------------------------------------------
        # 8. Structural validation
        # ---------------------------------------------------------

        validation_errors = self._validate_structure(
            organization=organization,
            divisions=divisions,
            departments=departments,
            teams=teams,
            roles=roles,
        )

        is_valid = len(validation_errors) == 0

        # ---------------------------------------------------------
        # 9. Return EnterpriseInstancePayload
        # ---------------------------------------------------------

        return EnterpriseInstancePayload(
            context=context,
            instance_id=f"ENT-{config.config_id}",
            config_id=config.config_id,
            organization=organization,
            divisions=divisions,
            departments=departments,
            teams=teams,
            roles=roles,
            is_structurally_valid=is_valid,
            validation_errors=validation_errors,
        )

    # =============================================================
    # INPUT VALIDATION
    # =============================================================

    def _validate_inputs(
        self,
        template: EnterpriseTemplatePayload,
        config: EnterpriseConfigurationPayload,
    ) -> None:

        if config.template_id != template.template_id:
            raise ArcturusValidationError(
                "Configuration template_id does not match the supplied template.",
                "SyntheticEnterprise",
            )

        if not config.org_name.strip():
            raise ArcturusValidationError(
                "Organization name cannot be empty.",
                "SyntheticEnterprise",
            )

        if config.team_size_range is not None:
            if len(config.team_size_range) != 2:
                raise ArcturusValidationError(
                    "team_size_range must contain exactly [min, max].",
                    "SyntheticEnterprise",
                )

            minimum, maximum = config.team_size_range

            if minimum < 1 or maximum < minimum:
                raise ArcturusValidationError(
                    "team_size_range must satisfy 1 <= min <= max.",
                    "SyntheticEnterprise",
                )

    # =============================================================
    # STRUCTURAL VALIDATION
    # =============================================================

    def _validate_structure(
        self,
        organization: OrganizationState,
        divisions: List[DivisionState],
        departments: List[DepartmentState],
        teams: List[TeamState],
        roles: List[RoleState],
    ) -> List[str]:

        errors: List[str] = []

        organization_ids = {organization.org_id}
        division_ids = {division.div_id for division in divisions}
        department_ids = {department.dept_id for department in departments}
        team_ids = {team.team_id for team in teams}
        role_ids = {role.role_id for role in roles}

        # ---------------------------------------------------------
        # Organization -> Division
        # ---------------------------------------------------------

        for division in divisions:
            if division.org_id not in organization_ids:
                errors.append(
                    f"Division {division.div_id} references "
                    f"unknown organization {division.org_id}."
                )

        # ---------------------------------------------------------
        # Division -> Department
        # ---------------------------------------------------------

        for department in departments:
            if department.div_id not in division_ids:
                errors.append(
                    f"Department {department.dept_id} references "
                    f"unknown division {department.div_id}."
                )

        # ---------------------------------------------------------
        # Department -> Team
        # ---------------------------------------------------------

        for team in teams:
            if team.dept_id not in department_ids:
                errors.append(
                    f"Team {team.team_id} references "
                    f"unknown department {team.dept_id}."
                )

        # ---------------------------------------------------------
        # Duplicate ID checks
        # ---------------------------------------------------------

        if len(division_ids) != len(divisions):
            errors.append("Duplicate division IDs detected.")

        if len(department_ids) != len(departments):
            errors.append("Duplicate department IDs detected.")

        if len(team_ids) != len(teams):
            errors.append("Duplicate team IDs detected.")

        if len(role_ids) != len(roles):
            errors.append("Duplicate role IDs detected.")

        return errors

    # =============================================================
    # DETERMINISTIC HELPERS
    # =============================================================

    @staticmethod
    def _make_id(seed: int, offset: int) -> int:
        """
        Generate deterministic positive integer IDs.
        """
        return (seed * 1000) + offset

    @staticmethod
    def _deterministic_team_size(
        seed: int,
        index: int,
        minimum: int,
        maximum: int,
    ) -> int:

        if minimum == maximum:
            return minimum

        span = maximum - minimum + 1
        return minimum + ((seed + index) % span)

    @staticmethod
    def _team_size_range(
        team_size_range: list[int] | None,
    ) -> tuple[int, int]:

        if team_size_range is None:
            return 5, 10

        return team_size_range[0], team_size_range[1]

    @staticmethod
    def _default_department_count(scale: str) -> int:

        defaults = {
            "small": 3,
            "medium": 5,
            "large": 8,
            "enterprise_scale": 12,
        }

        return defaults.get(scale, 3)

    @staticmethod
    def _default_business_units(industry: str) -> list[str]:

        defaults = {
            "startup": [
                "Product",
                "Engineering",
                "Operations",
            ],
            "enterprise_saas": [
                "Engineering",
                "Product",
                "Sales",
                "Customer Success",
                "Operations",
            ],
            "manufacturing": [
                "Production",
                "Engineering",
                "Quality",
                "Supply Chain",
                "Operations",
            ],
            "hospital": [
                "Clinical Services",
                "Nursing",
                "Administration",
                "Pharmacy",
            ],
            "university": [
                "Academic Affairs",
                "Research",
                "Student Services",
                "Administration",
            ],
            "government_agency": [
                "Administration",
                "Operations",
                "Policy",
                "Public Services",
            ],
            "financial_institution": [
                "Banking",
                "Risk",
                "Compliance",
                "Technology",
                "Operations",
            ],
            "retail_enterprise": [
                "Stores",
                "Merchandising",
                "Supply Chain",
                "Sales",
                "Operations",
            ],
        }

        return defaults.get(
            industry,
            ["Operations", "Administration"],
        )

    @staticmethod
    def _department_name(
        index: int,
        industry: str,
    ) -> str:

        common_departments = [
            "Human Resources",
            "Finance",
            "Operations",
            "Information Technology",
            "Administration",
            "Strategy",
            "Legal",
            "Customer Services",
        ]

        industry_departments = {
            "hospital": [
                "Emergency Services",
                "Clinical Care",
                "Medical Records",
            ],
            "university": [
                "Admissions",
                "Academic Services",
                "Research Administration",
            ],
            "manufacturing": [
                "Production",
                "Quality Control",
                "Procurement",
            ],
        }

        choices = industry_departments.get(
            industry,
            common_departments,
        )

        return choices[index % len(choices)]