# sentinel/threats.py
import urllib.parse
from typing import Any
from sentinel.context import SentinelSecurityException
from sentinel.registry import RuleRegistry

class ThreatDetector:
    @classmethod
    def scan_payload(cls, payload: Any, path: str = "$"):
        # Boundary: Suspicious Payload Structures (Depth Check)
        if path.count('.') + path.count('[') > 10:
            raise SentinelSecurityException(status_code=400, message="Payload too deep")

        active_rules = RuleRegistry.get_active_rules()

        if isinstance(payload, dict):
            for k, v in payload.items():
                cls.scan_payload(v, f"{path}.{k}")
        elif isinstance(payload, list):
            for i, v in enumerate(payload):
                cls.scan_payload(v, f"{path}[{i}]")
        elif isinstance(payload, str):
            # Deterministic Check: Scan both raw and URL-decoded variants
            decoded_payload = urllib.parse.unquote(payload)
            
            for rule in active_rules:
                if rule.matches(payload) or (decoded_payload != payload and rule.matches(decoded_payload)):
                    raise SentinelSecurityException(
                        status_code=403,
                        message=f"[{rule.rule_id}] {rule.category} Threat Detected at path '{path}'. Evidence: {rule.evidence_requirements}"
                    )