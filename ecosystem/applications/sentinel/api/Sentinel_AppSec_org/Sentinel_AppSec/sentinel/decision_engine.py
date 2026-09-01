from sentinel.context import SecurityContext, SentinelSecurityException


class SecurityDecisionEngine:
    """Enforces deterministic decisions based on context, threats, and policy."""

    @staticmethod
    def decide(context: SecurityContext) -> SecurityContext:
        if not context.authenticated:
            context.decision = "BLOCK"
            context.decision_reason = "Identity authentication failed"
            raise SentinelSecurityException(context.decision_reason, status_code=401, error_code="AUTH_FAILED")

        if not context.authorized:
            context.decision = "BLOCK"
            context.decision_reason = "Authorization policy denied access"
            raise SentinelSecurityException(context.decision_reason, status_code=403, error_code="AUTHZ_DENIED")

        if len(context.threats_detected) > 0:
            context.decision = "BLOCK"
            rule_ids = [t["rule_id"] for t in context.threats_detected]
            context.decision_reason = f"OWASP threat detection triggered: {','.join(rule_ids)}"
            raise SentinelSecurityException(
                message=f"Request blocked due to security threat violations: {','.join(rule_ids)}",
                status_code=403,
                error_code="THREAT_DETECTED"
            )

        context.decision = "ALLOW"
        context.decision_reason = "All security gates passed successfully"
        return context