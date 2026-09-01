import re
from dataclasses import dataclass
from typing import Any, Dict, List
from sentinel.context import SecurityContext


@dataclass(frozen=True)
class ThreatRule:
    rule_id: str
    category: str
    severity: str
    description: str
    pattern: re.Pattern


OWASP_RULES: List[ThreatRule] = [
    # SQL Injection Rule
    ThreatRule(
        rule_id="RULE-OWASP-SQLI-001",
        category="SQL_INJECTION",
        severity="CRITICAL",
        description="Detects standard SQL injection keywords and union selects",
        pattern=re.compile(r"(\b(UNION(\s+ALL)?|SELECT|INSERT|DELETE|UPDATE|DROP|ALTER|EXEC|TRUNCATE)\b|--|\bOR\b\s+['\d\w]+\s*=\s*['\d\w]+)", re.IGNORECASE)
    ),
    # Cross-Site Scripting (XSS) Rule
    ThreatRule(
        rule_id="RULE-OWASP-XSS-001",
        category="XSS",
        severity="HIGH",
        description="Detects HTML script injections and common event handlers",
        pattern=re.compile(r"(<script\b[^>]*>|javascript:|onerror\s*=|onload\s*=|eval\(|<img\b[^>]+src[^\w]*=)", re.IGNORECASE)
    ),
    # Path Traversal Rule
    ThreatRule(
        rule_id="RULE-OWASP-TRAV-001",
        category="PATH_TRAVERSAL",
        severity="HIGH",
        description="Detects directory traversal sequences",
        pattern=re.compile(r"(\.\./|\.\.\\|%2e%2e%2f|%2e%2e/|\.\.%2f)", re.IGNORECASE)
    ),
    # Command Injection Rule
    ThreatRule(
        rule_id="RULE-OWASP-CMDI-001",
        category="COMMAND_INJECTION",
        severity="CRITICAL",
        description="Detects shell metacharacters and chaining sequences",
        pattern=re.compile(r"(;\s*(cat|ls|rm|chmod|curl|wget|bash|sh|nc)\b|`|\|\||&&)", re.IGNORECASE)
    )
]


class ThreatDetectionEngine:
    """Scans all input boundaries recursively using compiled threat signatures."""

    def __init__(self, rules: List[ThreatRule] = OWASP_RULES):
        self.rules = rules

    def _scan_text(self, text: str) -> List[Dict[str, Any]]:
        findings = []
        for rule in self.rules:
            if rule.pattern.search(text):
                findings.append({
                    "rule_id": rule.rule_id,
                    "category": rule.category,
                    "severity": rule.severity,
                    "description": rule.description,
                    "matched_sample": text[:100]  # truncate sample
                })
        return findings

    def _scan_recursive(self, data: Any) -> List[Dict[str, Any]]:
        findings = []
        if isinstance(data, str):
            findings.extend(self._scan_text(data))
        elif isinstance(data, dict):
            for k, v in data.items():
                findings.extend(self._scan_text(str(k)))
                findings.extend(self._scan_recursive(v))
        elif isinstance(data, (list, tuple, set)):
            for item in data:
                findings.extend(self._scan_recursive(item))
        return findings

    def scan(self, query_params: Dict[str, Any], payload: Any, context: SecurityContext) -> SecurityContext:
        findings = []
        # 1. Scan query parameters
        findings.extend(self._scan_recursive(query_params))
        # 2. Scan JSON body payload
        if payload:
            findings.extend(self._scan_recursive(payload))

        context.threats_detected = findings
        return context