from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseConfigurationPayload,
    EnterpriseTemplatePayload,
    IndustryType,
    ScaleProfile,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext,
)
from ecosystem.applications.arcturus.src.integration.enterprise_chain import (
    EnterpriseChain,
)


def main() -> None:
    context = SimulationContext(
        experiment_id="enterprise-chain-test",
        global_seed=42,
    )

    template = EnterpriseTemplatePayload(
        context=context,
        template_id="template-saas-1",
        template_name="Test SaaS Enterprise",
        industry_type=IndustryType.SAAS,
        scale_profile=ScaleProfile.MEDIUM,
        default_business_units=[
            "Engineering",
            "Product",
            "Sales",
            "Operations",
        ],
        default_org_depth=4,
    )

    config = EnterpriseConfigurationPayload(
        context=context,
        config_id="config-saas-1",
        template_id=template.template_id,
        org_name="Chain Test Enterprise",
    )

    chain = EnterpriseChain()

    instance = chain.execute(
        template=template,
        config=config,
    )

    print("========== ENTERPRISE CHAIN TEST ==========")
    print(f"Organization: {instance.organization.org_name}")
    print(f"Organization ID: {instance.organization.org_id}")
    print(f"Divisions: {len(instance.divisions)}")
    print(f"Departments: {len(instance.departments)}")
    print(f"Teams: {len(instance.teams)}")
    print(f"Roles: {len(instance.roles)}")
    print(f"Structurally valid: {instance.is_structurally_valid}")
    print(f"Validation errors: {instance.validation_errors}")
    print("========== TEST COMPLETE ==========")

    assert instance.organization.org_name == "Chain Test Enterprise"
    assert instance.is_structurally_valid
    assert len(instance.divisions) > 0
    assert len(instance.departments) > 0
    assert len(instance.teams) > 0
    assert len(instance.roles) > 0


if __name__ == "__main__":
    main()