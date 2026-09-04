from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class EngineeringArtifact:
    id: str
    name: str
    artifact_type: str
    source: str
    owner: Optional[str] = None


@dataclass
class QualityStandard:
    id: str
    name: str
    description: str
    version: str
    active: bool = True


@dataclass
class GovernanceRule:
    id: str
    name: str
    description: str
    standard_id: Optional[str] = None
    severity: Severity = Severity.MEDIUM
    active: bool = True


@dataclass
class Review:
    id: str
    artifact_id: str
    reviewer: str
    status: str


@dataclass
class QualityCheck:
    id: str
    artifact_id: str
    rule_id: str
    status: str
    message: str = ""


@dataclass
class QualityGate:
    id: str
    name: str
    status: str
    required_check_ids: list[str] = field(default_factory=list)


@dataclass
class Finding:
    id: str
    artifact_id: str
    title: str
    description: str
    severity: Severity
    rule_id: Optional[str] = None
    status: str = "OPEN"


@dataclass
class ComplianceRequirement:
    id: str
    name: str
    description: str
    mandatory: bool = True


@dataclass
class Evidence:
    id: str
    artifact_id: str
    evidence_type: str
    source: str
    description: str


@dataclass
class Remediation:
    id: str
    finding_id: str
    description: str
    status: str = "OPEN"
    owner: Optional[str] = None


@dataclass
class Approval:
    id: str
    review_id: str
    approver: str
    status: str
    comments: str = ""


@dataclass
class Exception:
    id: str
    artifact_id: str
    reason: str
    requested_by: str
    status: str = "PENDING"
    approved_by: Optional[str] = None


@dataclass
class AuditRecord:
    id: str
    action: str
    actor: str
    timestamp: str
    artifact_id: Optional[str] = None
    details: str = ""


@dataclass
class QualityMetric:
    id: str
    name: str
    value: float
    unit: str


@dataclass
class ImprovementInitiative:
    id: str
    title: str
    description: str
    status: str = "PLANNED"
    owner: Optional[str] = None
