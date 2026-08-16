from __future__ import annotations

from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseConfigurationPayload,
    EnterpriseInstancePayload,
    EnterpriseTemplatePayload,
)
from ecosystem.applications.arcturus.src.enterprise.enterprise_generator import (
    EnterpriseGenerator,
)
from ecosystem.applications.arcturus.src.enterprise.enterprise_adapters import (
    EnterpriseAdapter,
)


class EnterpriseChain:
    """
    Day 5 integration wrapper for the Synthetic Enterprise platform.

    Converts:
        EnterpriseTemplatePayload
        +
        EnterpriseConfigurationPayload

    into:
        EnterpriseInstancePayload

    The chain delegates generation to EnterpriseGenerator and uses
    EnterpriseAdapter to prepare the generated instance for downstream
    consumption.
    """

    def __init__(self) -> None:
        self.generator = EnterpriseGenerator()
        self.adapter = EnterpriseAdapter()

    def execute(
        self,
        template: EnterpriseTemplatePayload,
        config: EnterpriseConfigurationPayload,
    ) -> EnterpriseInstancePayload:
        """
        Generate a synthetic enterprise instance.
        """
        return self.generator.generate(
            template=template,
            config=config,
        )

    def execute_for_downstream(
        self,
        template: EnterpriseTemplatePayload,
        config: EnterpriseConfigurationPayload,
    ) -> dict:
        """
        Generate the enterprise instance and translate it into the
        downstream representation.
        """
        instance = self.execute(
            template=template,
            config=config,
        )

        return self.adapter.to_downstream(instance)


def run_enterprise_chain(
    template: EnterpriseTemplatePayload,
    config: EnterpriseConfigurationPayload,
) -> EnterpriseInstancePayload:
    """
    Execute the Synthetic Enterprise integration chain.

    This is the public function exported for Day 5 platform integration.
    """
    chain = EnterpriseChain()

    return chain.execute(
        template=template,
        config=config,
    )