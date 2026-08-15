from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseConfigurationPayload,
    EnterpriseTemplatePayload,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext,
)
from ecosystem.applications.arcturus.src.enterprise.enterprise_generator import (
    EnterpriseGenerator,
)
from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    IndustryType,
    ScaleProfile,
)


def main() -> None:
    # ---------------------------------------------------------
    # 1. Create the simulation context
    # ---------------------------------------------------------

    context = SimulationContext(
        experiment_id="enterprise-test",
        global_seed=12345,
    )

    # ---------------------------------------------------------
    # 2. Create a generic enterprise template
    # ---------------------------------------------------------

    template = EnterpriseTemplatePayload(
        context=context,
        template_id="TPL-001",
        template_name="Generic Enterprise Template",
        industry_type=IndustryType.SAAS,
        scale_profile=ScaleProfile.MEDIUM,
        default_business_units=[
            "Engineering",
            "Finance",
            "Sales",
            "Operations",
        ],
        default_org_depth=4,
        governance_complexity="hierarchical",
    )

    # ---------------------------------------------------------
    # 3. Create an enterprise configuration
    # ---------------------------------------------------------

    config = EnterpriseConfigurationPayload(
        context=context,
        config_id="CFG-001",
        template_id="TPL-001",
        org_name="Test Enterprise",
        department_count_override=4,
        team_size_range=[5, 10],
    )

    # ---------------------------------------------------------
    # 4. Generate the enterprise
    # ---------------------------------------------------------

    generator = EnterpriseGenerator()

    instance = generator.generate(
        template=template,
        config=config,
    )

    # ---------------------------------------------------------
    # 5. Display the result
    # ---------------------------------------------------------

    print("\n========== ENTERPRISE GENERATION TEST ==========")

    print(f"Organization: {instance.organization.org_name}")
    print(f"Organization ID: {instance.organization.org_id}")

    print(f"Divisions: {len(instance.divisions)}")
    print(f"Departments: {len(instance.departments)}")
    print(f"Teams: {len(instance.teams)}")
    print(f"Roles: {len(instance.roles)}")

    print(f"Structurally valid: {instance.is_structurally_valid}")

    print("\nValidation errors:")

    if instance.validation_errors:
        for error in instance.validation_errors:
            print(f" - {error}")
    else:
        print(" None")

    print("\n========== TEST COMPLETE ==========")


if __name__ == "__main__":
    main()