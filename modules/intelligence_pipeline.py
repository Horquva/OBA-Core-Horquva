from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any
import json
from modules.data_models import Entity, GovernancePolicy, AccountabilityLink


class IntelligencePipeline:
    def __init__(self, data: dict):
        self.data = data
        self._entity_cache: dict[str, Entity] = {}
        self._policy_cache: list[GovernancePolicy] = []
        self._link_cache: list[AccountabilityLink] = []
        self._built = False

    def build(self):
        if self._built:
            return
        self._build_entities()
        self._build_policies()
        self._build_links()
        self._built = True

    def _build_entities(self):
        for agent in self.data.get("agents", []):
            self._entity_cache[agent["id"]] = Entity(
                id=agent["id"],
                name=agent["name"],
                type="agent",
                owner=agent.get("owner"),
                department=agent.get("department"),
                criticality=agent.get("criticality", "medium"),
                documented=agent.get("documented", False),
            )
        for tool in self.data.get("ai_tools", []):
            self._entity_cache[tool["id"]] = Entity(
                id=tool["id"],
                name=tool["name"],
                type="tool",
                owner=tool.get("access_owner"),
                criticality=tool.get("criticality", "medium"),
                documented=tool.get("documented", False),
            )
        for wf in self.data.get("workflows", []):
            self._entity_cache[wf["id"]] = Entity(
                id=wf["id"],
                name=wf["name"],
                type="workflow",
                owner=wf.get("owner"),
                department=wf.get("department"),
                criticality=wf.get("criticality", "medium"),
                documented=wf.get("documented", False),
            )
        for policy in self.data.get("governance_policies", []):
            self._entity_cache[policy["id"]] = Entity(
                id=policy["id"],
                name=policy["name"],
                type="policy",
                owner=policy.get("created_by"),
                criticality="high" if policy.get("compliance_required") else "medium",
                documented=True,
            )

    def _build_policies(self):
        for p in self.data.get("governance_policies", []):
            self._policy_cache.append(GovernancePolicy(
                id=p["id"],
                name=p["name"],
                domain=p["domain"],
                status=p["status"],
                applies_to=p.get("applies_to", []),
                created_by=p["created_by"],
                last_reviewed=p["last_reviewed"],
                review_cycle_days=p.get("review_cycle_days", 90),
                compliance_required=p.get("compliance_required", False),
            ))

    def _build_links(self):
        for a in self.data.get("agents", []):
            if a.get("owner"):
                self._link_cache.append(AccountabilityLink(
                    entity_id=a["id"],
                    entity_name=a["name"],
                    responsible=a["owner"],
                    accountable=a.get("backup_owner") or a["owner"],
                    consulted=[],
                    informed=[a["backup_owner"]] if a.get("backup_owner") else [],
                    decision_authority=a["owner"],
                    approval_chain=[a["owner"]] + ([a["backup_owner"]] if a.get("backup_owner") else []),
                ))

    def get_entities(self) -> dict[str, Entity]:
        self.build()
        return self._entity_cache

    def get_policies(self) -> list[GovernancePolicy]:
        self.build()
        return self._policy_cache

    def get_links(self) -> list[AccountabilityLink]:
        self.build()
        return self._link_cache

    def get_entity_by_id(self, entity_id: str) -> Entity | None:
        self.build()
        return self._entity_cache.get(entity_id)

    def get_policies_for_entity(self, entity_id: str) -> list[GovernancePolicy]:
        self.build()
        return [p for p in self._policy_cache if entity_id in p.applies_to]

    def get_uncovered_entities(self) -> list[Entity]:
        self.build()
        covered = set()
        for p in self._policy_cache:
            covered.update(p.applies_to)
        return [e for e in self._entity_cache.values() if e.id not in covered and e.type != "policy"]
