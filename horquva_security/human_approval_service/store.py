from __future__ import annotations
from datetime import datetime, timezone
from ai_security_common import ApprovalRequest, ApprovalState, AuthorizationError, RiskLevel


class ApprovalStore:
    def __init__(self) -> None:
        self._approvals: dict[str, ApprovalRequest] = {}

    def create(self, *, agent_id: str, action: dict, risk: RiskLevel) -> ApprovalRequest:
        req = ApprovalRequest(agent_id=agent_id, action=action, risk=risk)
        self._approvals[req.approval_id] = req
        return req

    def get(self, approval_id: str) -> ApprovalRequest | None:
        return self._approvals.get(approval_id)

    def decide(self, approval_id: str, *, decided_by: str, approve: bool, reason: str) -> ApprovalRequest:
        req = self._approvals.get(approval_id)
        if req is None:
            raise KeyError(f"unknown approval_id '{approval_id}'")
        if req.state != ApprovalState.PENDING:
            raise ValueError(f"approval '{approval_id}' already decided (state={req.state})")
        # Non-negotiable: an agent can never approve its own action.
        if decided_by == req.agent_id:
            raise AuthorizationError(
                f"agent '{decided_by}' cannot approve its own action — no autonomous self-approval"
            )
        req.state = ApprovalState.APPROVED if approve else ApprovalState.DENIED
        req.decided_at = datetime.now(timezone.utc)
        req.decided_by = decided_by
        req.reason = reason
        return req
