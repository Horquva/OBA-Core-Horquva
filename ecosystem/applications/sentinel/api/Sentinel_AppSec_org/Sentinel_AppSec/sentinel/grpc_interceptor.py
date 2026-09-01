import grpc
from typing import Callable, Any
from sentinel.context import SecurityContext, SentinelSecurityException
from sentinel.identity import IdentityVerifier
from sentinel.authz import PolicyEngine
from sentinel.decision_engine import SecurityDecisionEngine
from sentinel.audit import AuditEngine

class SentinelGrpcInterceptor(grpc.ServerInterceptor):
    """
    gRPC Application Security Interceptor.
    Applies the Sentinel Security Lifecycle to gRPC microservices.
    """
    def __init__(self):
        self.identity_verifier = IdentityVerifier()
        self.policy_engine = PolicyEngine()
        self.decision_engine = SecurityDecisionEngine()

    def intercept_service(self, continuation: Callable, handler_call_details: grpc.HandlerCallDetails) -> Any:
        # Extract gRPC metadata (equivalent to HTTP headers)
        metadata = dict(handler_call_details.invocation_metadata)
        
        context = SecurityContext(
            endpoint=handler_call_details.method,
            http_method="gRPC"
        )

        try:
            # 1. Identity Verification
            auth_header = metadata.get("authorization")
            self.identity_verifier.verify(auth_header, context)

            # 2. Authorization
            self.policy_engine.evaluate(context)

            # 3. Decision
            self.decision_engine.decide(context)

            # 4. Execute gRPC Business Logic
            response = continuation(handler_call_details)
            
            # 5. Audit Success
            AuditEngine.record_event(context, 200, "SUCCESS")
            return response

        except SentinelSecurityException as sse:
            # Enforce Fail-Closed for gRPC
            AuditEngine.record_event(context, sse.status_code, sse.message)
            self._abort_call(sse.message)
        except Exception as e:
            AuditEngine.record_event(context, 500, f"UNHANDLED_EXCEPTION: {str(e)}")
            self._abort_call("A security subsystem exception occurred")

    def _abort_call(self, message: str):
        # Translates our security exceptions into standard gRPC abort codes
        def abort(ignored_request, context):
            context.abort(grpc.StatusCode.PERMISSION_DENIED, message)
        return grpc.unary_unary_rpc_method_handler(abort)