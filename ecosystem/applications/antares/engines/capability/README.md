# Capability Engine — pointer

The actual execution/agent/governance engine code (`execution_engine.py`,
`agent_engine.py`, `governance_service.py`, `coordination_service.py`,
`learning_service.py`, `query_service.py`) currently lives together with
the service layer under:

    services/capability-service/app/services/

It has NOT yet been physically split into `engines/` vs `services/`
because splitting a tested, working package risks breaking working
imports without real benefit at this stage. This file is a pointer so
anyone looking under `engines/capability/` finds the code instead of an
empty folder.

**Action needed (Team Lead / Tech Lead call):** decide whether to
physically split engine code into this folder for the final merge, or
keep the current single-package layout permanently. If a split is
required, functions to move here are the ones prefixed by pipeline
stage in the roadmap (execution, agent runtime, governance, learning,
coordination, query) — the CRUD/service functions
(`organization_service.py`, `role_service.py`, `capability_service.py`,
`workflow_service.py`, `decision_service.py`, `event_service.py`) would
stay in `services/capability-service/`.
