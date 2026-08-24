"""
sandbox-service

Isolated execution session lifecycle for untrusted/risky agent
actions: create -> run (record calls made inside it) -> destroy, with
resource/capability limits enforced at session-creation time and a
hard wall between sandbox sessions and real credentials/tools.

NOTE: this is a control-plane model of a sandbox (session lifecycle,
allowed-capability enforcement, audit trail), not an actual OS-level
sandbox/container — wiring this to a real isolation backend (gVisor,
Firecracker, container runtime, etc.) is infra work outside W3.
"""
