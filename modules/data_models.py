from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Entity:
    id: str
    name: str
    type: str           # "agent" | "tool" | "workflow" | "policy" | "person"
    owner: Optional[str] = None
    department: Optional[str] = None
    criticality: str = "medium"
    documented: bool = False


@dataclass
class GovernancePolicy:
    id: str
    name: str
    domain: str             # "security" | "compliance" | "data" | "operational" | "financial"
    status: str             # "active" | "draft" | "expired" | "enforced"
    applies_to: list[str]   # entity ids
    created_by: str
    last_reviewed: str
    review_cycle_days: int
    compliance_required: bool


@dataclass
class AccountabilityLink:
    entity_id: str
    entity_name: str
    responsible: str        # person who executes
    accountable: str        # person who approves
    consulted: list[str]    # people who provide input
    informed: list[str]     # people who are notified
    decision_authority: str # who makes final call
    approval_chain: list[str]
    created_by_policy: Optional[str] = None


@dataclass
class GovernanceGap:
    entity_id: str
    entity_name: str
    gap_type: str           # "no_governance" | "no_accountability" | "policy_expired" | "no_review"
    severity: str
    details: str


@dataclass
class PillarResult:
    pillar_name: str
    total_entities: int
    healthy_count: int
    warning_count: int
    critical_count: int
    health_score: int
    gaps: list[GovernanceGap]
    recommendations: list[str]
