from __future__ import annotations
from ai_security_common import ToolDescriptor


class ToolPermissionStore:
    def __init__(self) -> None:
        self._tools: dict[str, ToolDescriptor] = {}
        self._bindings: dict[tuple[str, str], set[str]] = {}  # (agent_id, tool_id) -> capabilities

    def register_tool(self, descriptor: ToolDescriptor) -> None:
        self._tools[descriptor.tool_id] = descriptor

    def get_tool(self, tool_id: str) -> ToolDescriptor | None:
        return self._tools.get(tool_id)

    def bind(self, agent_id: str, tool_id: str, capabilities: list[str]) -> None:
        tool = self._tools.get(tool_id)
        if tool is None:
            raise KeyError(f"unregistered tool_id '{tool_id}'")
        invalid = set(capabilities) - set(tool.allowed_capabilities)
        if invalid:
            raise ValueError(f"capabilities not allowed by tool: {sorted(invalid)}")
        self._bindings[(agent_id, tool_id)] = set(capabilities)

    def bound_capabilities(self, agent_id: str, tool_id: str) -> set[str]:
        return self._bindings.get((agent_id, tool_id), set())
