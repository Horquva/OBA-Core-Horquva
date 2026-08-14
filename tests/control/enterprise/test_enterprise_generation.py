"""
Pytest tests for the Synthetic Enterprise Platform.

Covers:
- Enterprise generation from a template + configuration
- Structural validation
- Deterministic generation using the same seed
"""

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext,
)
from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseConfigurationPayload,
    EnterpriseTemplatePayload,
    IndustryType,
    ScaleProfile,
)
from ecosystem.applications.arcturus.src.enterprise.enterprise_generator import (
    EnterpriseGenerator,
)


def _context(seed: int = 42) -> SimulationContext:
    return SimulationContext(
        experiment_id="enterprise-pytest",
        global_seed=seed,
    )


def _saas_template(
    context: SimulationContext,
) -> EnterpriseTemplatePayload:
    return EnterpriseTemplatePayload(
        context=context,
        template_id="tpl-saas",
        template_name="SaaS Startup",
        industry_type=IndustryType.SAAS,
        scale_profile=ScaleProfile.SMALL,
        default_business_units=[
            "Engineering",
            "Product",
            "Sales",
            "HR",
        ],
        default_org_depth=4,
    )


def _hospital_template(
    context: SimulationContext,
) -> EnterpriseTemplatePayload:
    return EnterpriseTemplatePayload(
        context=context,
        template_id="tpl-hospital",
        template_name="Regional Hospital",
        industry_type=IndustryType.HOSPITAL,
        scale_profile=ScaleProfile.LARGE,
        default_business_units=[
            "Clinical",
            "Administration",
            "Compliance",
            "Patient Services",
        ],
        default_org_depth=5,
    )


def test_saas_enterprise_generation():
    context = _context(seed=1)
    template = _saas_template(context)

    config = EnterpriseConfigurationPayload(
        context=context,
        config_id="cfg-saas-1",
        template_id=template.template_id,
        org_name="Test SaaS Enterprise",
    )

    instance = EnterpriseGenerator().generate(
        template,
        config,
    )

    assert instance.is_structurally_valid, instance.validation_errors
    assert instance.organization.org_name == "Test SaaS Enterprise"
    assert len(instance.divisions) == 4
    assert len(instance.departments) >= 4
    assert len(instance.teams) >= 4
    assert len(instance.roles) >= 1


def test_hospital_enterprise_generation():
    context = _context(seed=7)
    template = _hospital_template(context)

    config = EnterpriseConfigurationPayload(
        context=context,
        config_id="cfg-hospital-1",
        template_id=template.template_id,
        org_name="Test Regional Hospital",
    )

    instance = EnterpriseGenerator().generate(
        template,
        config,
    )

    assert instance.is_structurally_valid, instance.validation_errors
    assert instance.organization.org_name == "Test Regional Hospital"


def test_generation_is_deterministic():
    context = _context(seed=99)
    template = _saas_template(context)

    config = EnterpriseConfigurationPayload(
        context=context,
        config_id="cfg-deterministic",
        template_id=template.template_id,
        org_name="Determinism Test Enterprise",
    )

    generator = EnterpriseGenerator()

    instance_a = generator.generate(template, config)
    instance_b = generator.generate(template, config)

    assert (
        instance_a.model_dump(exclude={"context"})
        == instance_b.model_dump(exclude={"context"})
    )