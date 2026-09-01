# tests/test_rule_lifecycle.py
import pytest
from sentinel.registry import RuleRegistry
from sentinel.rules import SecurityRule

# Force load all rules (even DRAFT/TEST status) for the testing pipeline
RuleRegistry.load_rules(rules_dir="rules")
all_rules = list(RuleRegistry._rules.values())

def generate_test_cases():
    cases = []
    for rule in all_rules:
        for i, fixture in enumerate(rule.test_fixtures):
            cases.append((rule, fixture, f"{rule.rule_id}_fixture_{i}"))
    return cases

@pytest.mark.parametrize("rule, fixture, test_id", generate_test_cases())
def test_rule_detection_logic(rule: SecurityRule, fixture, test_id):
    """
    Independently verifies that the detection_regex matches the expected behavior 
    defined in the rule's own test_fixtures.
    """
    actual_result = rule.matches(fixture.payload)
    
    assert actual_result == fixture.should_flag, (
        f"Rule {rule.rule_id} failed fixture: {fixture.description}. "
        f"Expected {fixture.should_flag}, got {actual_result}. "
        f"Regex: {rule.detection_regex}"
    )