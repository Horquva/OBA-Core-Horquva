import json
from pathlib import Path
from sentinel.context import SentinelSecurityException

# Import your original SecurityRule class to get the .matches() logic back!
from sentinel.rules import SecurityRule

class RuleRegistry:
    """
    Original Registry: Loads OWASP rules for the Threat Engine.
    """
    _rules = {}

    @classmethod
    def load_rules(cls, rules_dir="rules"):
        cls._rules = {}
        dir_path = Path(__file__).parent.parent / rules_dir
        
        if dir_path.exists():
            for rule_file in dir_path.glob("*.json"):
                try:
                    with open(rule_file, "r", encoding="utf-8") as f:
                        rule_data = json.load(f)
                        # Re-instantiate the original SecurityRule object
                        rule_obj = SecurityRule(**rule_data)
                        
                        # Extract the rule ID
                        rule_id = getattr(rule_obj, "rule_id", getattr(rule_obj, "id", rule_file.stem))
                        cls._rules[rule_id] = rule_obj
                except Exception:
                    pass
        return cls._rules

    @classmethod
    def get_all_rules(cls):
        """Fallback for any components expecting a flat list."""
        if not cls._rules:
            cls.load_rules()
        return list(cls._rules.values())

    @classmethod
    def get_active_rules(cls):
        """Restored method required by the Threat Engine."""
        return cls.get_all_rules()


class SentinelServiceRegistry:
    """
    Tasks 19, 20, 21: Cross-Platform Service Contracts.
    Connects Application Security to upstream Sentinel systems.
    """
    
    @staticmethod
    def enforce_ai_guardrail(headers: dict):
        is_ai_request = headers.get("x-sentinel-ai-client") == "true"
        guardrail_status = headers.get("x-ai-guardrail-decision")
        
        if is_ai_request and guardrail_status != "ALLOW":
            raise SentinelSecurityException(
                status_code=403, 
                error_code="AI_GUARDRAIL_REJECTED", 
                message="AI request rejected: Failed upstream AI Security Guardrail"
            )

    @staticmethod
    def enforce_infrastructure_trust(headers: dict):
        workload_id = headers.get("x-workload-identity")
        
        if not workload_id:
            raise SentinelSecurityException(
                status_code=401, 
                error_code="INFRASTRUCTURE_UNTRUSTED", 
                message="Missing infrastructure workload identity"
            )