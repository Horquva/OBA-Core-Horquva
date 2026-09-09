from __future__ import annotations
from datetime import datetime, timezone
from ai_security_common import AuthorizationError, KillSwitchState


class _Switch:
    def __init__(self, scope: str):
        self.scope = scope
        self.state = KillSwitchState.ARMED
        self.tripped_at = None
        self.tripped_by = None
        self.reason = None


class KillSwitchStore:
    GLOBAL_SCOPE = "global"

    def __init__(self) -> None:
        self._switches: dict[str, _Switch] = {}

    def _get_or_create(self, scope: str) -> _Switch:
        return self._switches.setdefault(scope, _Switch(scope))

    def trip(self, *, scope: str, tripped_by: str, reason: str) -> _Switch:
        sw = self._get_or_create(scope)
        sw.state = KillSwitchState.TRIPPED
        sw.tripped_at = datetime.now(timezone.utc)
        sw.tripped_by = tripped_by
        sw.reason = reason
        return sw

    def reset(self, *, scope: str, reset_by: str) -> _Switch:
        sw = self._get_or_create(scope)
        if sw.state == KillSwitchState.ARMED:
            return sw
        # Whoever tripped a scoped switch for an agent cannot be that
        # same agent resetting it — no self-service recovery.
        if sw.tripped_by == reset_by and scope != self.GLOBAL_SCOPE:
            raise AuthorizationError(f"'{reset_by}' cannot reset a kill switch it tripped itself")
        sw.state = KillSwitchState.ARMED
        sw.tripped_at = None
        sw.tripped_by = None
        sw.reason = None
        return sw

    def status(self, scope: str) -> _Switch:
        return self._get_or_create(scope)

    def is_blocked(self, scope: str) -> tuple[bool, str]:
        """A scope is blocked if either ITS OWN switch or the GLOBAL
        switch is tripped — global always wins over scoped state."""
        global_sw = self._get_or_create(self.GLOBAL_SCOPE)
        if global_sw.state == KillSwitchState.TRIPPED:
            return True, "global kill switch is tripped"
        sw = self._get_or_create(scope)
        if sw.state == KillSwitchState.TRIPPED:
            return True, f"kill switch for scope '{scope}' is tripped"
        return False, "not blocked"
