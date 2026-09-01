# sentinel/rules.py
import re
from enum import Enum
from typing import Any, List
from pydantic import BaseModel, Field

class RuleStatus(str, Enum):
    CREATE = "CREATE"
    REVIEW = "REVIEW"
    TEST = "TEST"
    APPROVED = "APPROVED"
    DEPLOYED = "DEPLOYED"
    DEPRECATED = "DEPRECATED"

class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class TestFixture(BaseModel):
    payload: Any
    should_flag: bool
    description: str

class SecurityRule(BaseModel):
    rule_id: str
    category: str
    severity: Severity
    description: str
    detection_regex: str
    version: str
    owner: str
    status: RuleStatus
    test_fixtures: List[TestFixture] = Field(min_length=2, description="At least one positive and one negative test required.")
    expected_behavior: str
    false_positive_considerations: str
    evidence_requirements: str

    def matches(self, value: str) -> bool:
        """Executes the detection logic."""
        if not isinstance(value, str):
            return False
        return bool(re.search(self.detection_regex, value, re.IGNORECASE))