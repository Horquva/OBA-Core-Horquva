"""
kill-switch-controller

Global and scoped (per-agent, per-task) emergency stop. Once tripped,
a scope stays tripped until an explicit, differently-identified reset
— the same "no self-service" principle as human-approval-service:
an agent cannot un-trip its own kill switch.
"""
