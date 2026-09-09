"""
Policy evaluation interface for guardrail-engine.

"Invoke policy evaluation" is a required step per the W3 spec, but the
Policy domain object and a real policy engine are not built yet
(Policy was only *defined* in W2 domain modeling, not implemented).
This module defines the seam so guardrail-engine can call into policy
evaluation today with a safe default, and swap in the real policy
engine later without changing callers.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class PolicyResult:
    allowed: bool
    reason: str


class PolicyEvaluator(ABC):
    """Port that a real policy engine implements later."""

    @abstractmethod
    def evaluate(self, *, agent_id: str, content_type: str, content: str) -> PolicyResult:
        raise NotImplementedError


class AllowAllPolicyEvaluator(PolicyEvaluator):
    """
    Default no-op policy evaluator.

    Deliberately named "AllowAll" (not silently permissive under a
    neutral name) so nobody mistakes this for real policy enforcement.
    Wire in the real policy engine before this service goes anywhere
    near production traffic.
    """

    def evaluate(self, *, agent_id: str, content_type: str, content: str) -> PolicyResult:
        return PolicyResult(allowed=True, reason="no policy engine wired yet (stub)")
