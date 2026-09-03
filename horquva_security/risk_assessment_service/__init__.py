"""
risk-assessment-service

Aggregates signals from other services (guardrail detections, tool
sensitivity, agent trust level, past evaluation scores) into ONE
overall RiskLevel + numeric score for a given action, so downstream
services (human-approval-service, kill-switch-controller) have a
single number/level to key off instead of re-deriving risk themselves.
"""
