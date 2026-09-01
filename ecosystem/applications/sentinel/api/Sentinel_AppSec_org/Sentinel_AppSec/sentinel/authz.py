from sentinel.context import SecurityContext, SentinelSecurityException

class PolicyEngine:
    def evaluate(self, context: SecurityContext):
        # 1. Construct the Authorization Request Payload
        authz_request = {
            "subject": context.subject,
            "organization": "sentinel-default-tenant",
            "resource": context.endpoint,
            "action": context.http_method,
            "environment": "production",
            "roles": context.roles
        }

        # 2. Consume External Authorization Authority
        try:
            decision = self._call_external_authority(authz_request)
        except Exception as e:
            # Deterministic ERROR / UNAVAILABLE handling
            raise SentinelSecurityException(
                status_code=500, 
                error_code="AUTHZ_UNAVAILABLE", 
                message=f"Authorization authority unreachable: {str(e)}"
            )

        # 3. Deterministic Decision Handling (ALLOW / DENY)
        if decision == "DENY":
            raise SentinelSecurityException(
                status_code=403, 
                error_code="AUTHZ_FORBIDDEN", 
                message="Subject is not authorized to perform this operation"
            )
        elif decision == "ALLOW":
            context.authorized = True
        else:
            raise SentinelSecurityException(
                status_code=500, 
                error_code="AUTHZ_ERROR", 
                message="Invalid authorization decision received"
            )

    def _call_external_authority(self, payload: dict) -> str:
        """
        Simulates the network call to Areeb's external Identity & Trust authority.
        The PEP does not reproduce the logic; it only asks the PDP for a decision.
        """
        roles = payload.get("roles", [])
        resource = payload.get("resource", "")

        if not roles:
            return "DENY"

        # Mimic Areeb's PDP logic mapped to the API routes
        if resource.startswith("/api/v1/data"):
            if "analyst" in roles:
                return "ALLOW"
        elif resource.startswith("/api/v1/profile"):
            if "user" in roles or "analyst" in roles:
                return "ALLOW"

        return "DENY"