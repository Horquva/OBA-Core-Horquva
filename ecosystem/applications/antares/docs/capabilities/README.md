# Future Organization Engineering Platform — Foundation (Day 2)

Corresponds to **Part-2: Foundation Buildup** of the Antares roadmap.

## What this is

This is the software foundation for the executable organization layer:
domain models for every required entity, plus a basic service layer to
create/query them. It proves the plumbing works — organizations, units,
roles, capabilities, tasks, decisions, and outcomes can be created,
persisted, related to each other, and audited.

**What this is NOT yet:** a real execution engine (Part-3), AI agent runtime
(Part-4), or governance enforcement (Part-6). Those come in later days —
this is only the foundation they'll be built on.

## Project structure

```
future_org_engine/
├── app/
│   ├── database.py          # SQLAlchemy engine/session setup (SQLite)
│   ├── models/
│   │   ├── base.py          # EntityMixin: id, lifecycle_state, owner,
│   │   │                    #   provenance, timestamps (shared by all entities)
│   │   ├── audit.py         # AuditLog — cross-entity audit history
│   │   ├── organization.py  # Organization, OrganizationUnit
│   │   ├── roles.py         # HumanRole, AgentRole
│   │   ├── capability.py    # OrganizationalCapability, Responsibility
│   │   ├── governance.py    # Policy, Decision
│   │   ├── workflow.py      # Workflow, Task, Delegation, Escalation
│   │   └── memory.py        # Event, Outcome, PerformanceSignal, OrganizationalMemory
│   └── services/
│       ├── organization_service.py   # create_organization, create_organizational_unit
│       ├── role_service.py           # define_human_role, define_agent_role
│       ├── capability_service.py     # assign_capability, define_responsibility
│       ├── workflow_service.py       # create_workflow, create_task
│       └── decision_service.py       # record_decision, record_outcome
├── main.py                  # Demo script — proves the foundation works end-to-end
└── requirements.txt
```

## How to run

```bash
pip install -r requirements.txt
python main.py
```

This creates `future_org_engine.db` (SQLite) and runs a full demo: creates
an organization → unit → human + agent role → capability → responsibility
→ workflow → task → decision → outcome, printing the full audit trail at
the end.

## Design notes (why things are built this way)

- **EntityMixin** gives every entity identity, lifecycle_state, ownership,
  provenance, and timestamps automatically — matches the Part-2 requirement
  that "each entity must have" these fields, without repeating the code
  in every model file.
- **provenance** fields exist so that once Muzammel/Syed Hadeed's Future
  Organizational Model input and Kanwal's governance rules are actually
  connected, we can trace exactly where a capability or policy came from.
  Right now they default to `"manual_seed"` for prototyping.
- **AgentRole** requires explicit `allowed_capability_ids` and
  `constraints` — agents are never given unlimited access, per the Part-4
  boundary rule, even though real enforcement logic isn't built until Part-6.
- **AuditLog** is a single cross-entity table rather than embedding audit
  history in every model — keeps audit trails queryable and consistent,
  which matters for governance testing later (Part-7).
- **SQLite** is used for now for zero-setup prototyping. Swapping to
  Postgres later only requires changing `DATABASE_URL` in `database.py` —
  no model code changes needed, since everything goes through SQLAlchemy's
  ORM layer.

## What's next (Day 3-4 / Part-3) — ✅ Done

Turned the static foundation into a real execution engine:
- `app/services/execution_engine.py` — task lifecycle (pending → in_progress →
  completed/failed/escalated), dependency-aware workflow execution, retry
  logic, and automatic escalation when retries are exhausted.
- `app/services/event_service.py` — organizational events for every
  meaningful state change.
- Run `python demo_day3_execution.py` to see three real execution paths
  proven end-to-end: normal success, transient-failure-then-retry-recovery,
  and permanent-failure-triggering-auto-escalation.

**Design notes for Part-3:**
- The engine takes an `executor` callable rather than doing "work" itself —
  this keeps orchestration (retries, state, events) separate from what the
  work actually is. From Part-4 onward, an AI agent's reasoning plugs into
  this same `executor` slot without changing the engine.
- `resolve_execution_order()` does a simple topological pass on task
  dependencies — sufficient for this platform's workflow shapes, not built
  for arbitrarily complex DAGs.
- Retries are capped per-task (`max_retries`, default 2) and automatically
  escalate to a human once exhausted — this is the "adapt when a task
  fails" requirement from Part-5, implemented early since it's a natural
  fit for the execution engine itself.

## What's next (Day 5 / Part-4) — ✅ Done

Introduced AI agents as real organizational actors:
- `app/models/roles.py` — added `AgentCapabilityGrant`, a real relational
  registry (replacing the old comma-separated string) tracking exactly
  which capabilities each agent role is explicitly permitted to execute.
- `app/services/agent_engine.py` — implements the full Agent Task
  Lifecycle: Task Received → Context Loaded → Plan Generated → Policy
  Checked → Action Authorized → Tool Execution → Result Evaluated →
  Outcome Recorded.
- Hard boundary enforcement: an agent with no capability grant is
  rejected and auto-escalated to a human — it never executes anyway.
  Proven in `demo_day5_agents.py` with two scenarios: an authorized
  agent completing real work, and an unauthorized agent being blocked.
- The six organizational agent roles from the roadmap (ResearchAgent,
  AnalysisAgent, PlanningAgent, ExecutionAgent, ReviewAgent,
  CoordinationAgent) are demonstrated as real `AgentRole` records.

**Design notes for Part-4:**
- `planner` and `tool_executor` are pluggable callables, same pattern as
  the execution engine's `executor`. This engine implements the
  *organizational* machinery (permissions, lifecycle stages, audit) an
  agent operates inside — the actual AI reasoning behind planning and
  tool use is Hasnain's AI/ML responsibility, and plugs into these slots
  without requiring changes to this engine.
- Policy checks happen *before* any execution starts, and failure always
  routes to escalation, never to silent failure or silent success — this
  matches the explicit Part-4 rule that agents must never exceed their
  assigned capabilities.

## What's next (Day 6 / Part-5) — ✅ Done

Multi-agent coordination, working Organizational Memory, and adaptive learning:
- `app/services/coordination_service.py` — `request_delegation()` lets one
  agent hand a task to another. The target agent's authorization is checked
  the same way any assignment is; if neither agent is authorized, it
  escalates to a human rather than looping or silently proceeding.
- `app/services/memory_service.py` — `record_lesson()` and
  `get_relevant_memory()` give the organization traceable, queryable
  memory (keyword-based retrieval — intentionally simple; see design
  notes below).
- `app/services/learning_service.py` — `evaluate_outcome()` implements
  the Execution → Outcome → Evaluation → Lesson pipeline: failures and
  retried-but-successful tasks automatically become recorded lessons.
- `app/services/agent_engine.py` — the agent's "Context Loaded" stage now
  actually queries memory for relevant past lessons, and a `planner`
  function can accept those lessons and change its plan accordingly.
  Proven in `demo_day6_coordination_memory.py`: a later task's plan text
  visibly changes because of an earlier task's failure.

**Design notes for Part-5:**
- Memory retrieval is deliberately simple keyword matching, not
  AI-driven semantic search. Real intelligent retrieval is Hasnain's
  AI/ML responsibility (per the roadmap boundary) — this engine provides
  the traceable, versioned storage and retrieval *interface* a smarter
  layer can sit on top of later without a schema change.
- Delegation reuses the exact same `agent_has_capability()` check from
  Part-4 — coordination never bypasses the boundary rules, it just moves
  a task to a different bounded actor.
- **Bug caught and fixed during testing:** the agent task lifecycle
  initially only attempted tool execution once, so scheduled retries
  never actually re-ran within a single `run_agent_task()` call. Fixed
  with a retry loop (same pattern as the Day 3-4 execution engine fix) —
  verified by re-running all four demo scripts after the fix.

## What's next (Day 7 / Part-6) — ✅ Done

Governed Autonomous Organization & Antares Integration:
- `app/models/governance.py` — `Policy` now has `requires_approval` and
  `applies_to_capability_id`; `Decision` now links to `task_id` and
  `approver_id`, so an approval can resume the exact task it's gating.
- `app/services/governance_service.py` — the real Policy Check stage:
  `policy_check()` evaluates active policies applicable to a capability
  (org-wide or capability-specific) and returns whether approval is
  required. `receive_governance_rules()` is the explicit integration
  point for Kanwal's Trust & Governance platform — unused for now since
  that integration doesn't exist yet, but the connection point is there
  rather than something to invent later.
- `app/services/agent_engine.py` — the full required chain is now real:
  Task Received → Context Loaded → Plan Generated → **Authority Check**
  → **Policy Check** → **Approval Requirement** (if any policy demands
  it) → Action Authorized → Tool Execution → Result Evaluated → Outcome
  Recorded. If approval is required, the task is set to `blocked` and
  genuinely does NOT execute — `resume_agent_task()` is the only way
  forward, and only works on an actually-approved decision.
- `app/services/query_service.py` — the Working Query/Control Interface:
  read-only functions for agent status, task status, pending decisions,
  unresolved escalations, organizational memory, and a full
  `get_organization_state()` snapshot (active objectives, active agents,
  task counts by status, pending decisions, escalations, resource usage,
  and a simple organizational health/success-rate indicator).

**Design notes for Part-6:**
- Backward compatibility mattered here: capabilities with no policy
  attached still execute immediately, exactly as in Days 5-6 — verified
  by re-running all previous demo scripts after this change, all still
  pass with no modifications needed.
- `query_service.py` is deliberately read-only. It never mutates state —
  that only happens through the proper service functions, which enforce
  the actual rules. This matters for the "controlled machine-readable
  access" requirement: observability should never double as a backdoor.
- `resume_agent_task()` explicitly refuses to run on anything but an
  `approved` decision — rejected or still-pending decisions raise an
  error rather than silently doing nothing or executing anyway.

## What's next (Day 8-9 / Part-7) — ✅ Done

25 automated tests across 6 files, run with `pytest`, exercising every
required test layer from the roadmap:

- `tests/test_domain.py` — every core entity creates, persists, and
  relates correctly (7 tests).
- `tests/test_agent_boundaries.py` — unauthorized agents are rejected and
  never execute; authorized agents succeed; retries/escalation work under
  the agent lifecycle specifically (4 tests).
- `tests/test_multi_agent.py` — deterministic delegation chains,
  including a 3-agent handoff ending in successful execution, and proof
  that delegation to another unauthorized agent escalates rather than
  looping (3 tests).
- `tests/test_governance.py` — deliberate attack attempts: policy bypass,
  resuming an unapproved or rejected decision, cross-task privilege
  leakage, and capability-boundary bypass across different capabilities.
  Every one asserts rejection/escalation, never silent success (5 tests).
- `tests/test_failure_recovery.py` — transient failure recovery, permanent
  failure handling, invalid/unexpected tool output, dependent-task
  blocking, and planning under empty/"stale" memory (5 tests).
- `tests/test_end_to_end.py` — the full required chain in one test:
  Organizational Objective → Planning → Agent Assignment → Task Execution
  → Decision → Human Governance → Outcome → Memory → Adaptive Replanning,
  proving all prior days compose into one working system, not just
  isolated passing pieces (1 test).

**Run the suite:**
```bash
pytest tests/ -v
```

**Design notes for Part-7:**
- Every test uses a fresh in-memory SQLite database (`tests/conftest.py`),
  fully isolated from the real `future_org_engine.db` file and from each
  other — running the suite never touches your actual data.
- Unlike earlier days, this stage caught **zero new bugs** — a good sign,
  since it means the retry-loop and governance-gate bugs found and fixed
  during Days 3-4 and 6 were the real issues, and the underlying design
  has held up under deliberate adversarial testing.

## What's next (Day 10 / Part-8) — ✅ Done

Final Working Delivery: the complete required scenario, run end-to-end
with real actors and real data.

- `demo_day10_final.py` — runs the full chain: Organizational Objective →
  Organizational Plan (3 capabilities) → **AI Agent A** (ResearchAgent,
  hits a transient failure, recovers via retry) → **AI Agent B**
  (AnalysisAgent, adaptive planning genuinely informed by Agent A's
  recorded lesson) → **Human Role** (Program Lead, governed sign-off via
  a real approval gate) → Execution → Outcome → Organizational Memory →
  Adaptive Replanning (a Q4 task automatically inherits the Q3 lesson).
- `app/services/dashboard_service.py` + `dashboard_renderer.py` — the
  final minimal command interface, covering exactly the five sections
  required: Organization (objective, health, active capabilities),
  Agents (status, workload, constraints), Execution (task progress,
  retries), Intelligence (memory/lessons, decisions), and Governance
  (pending approvals, escalations, active policies) — plus a
  "Constitutional Ledger" audit-trail strip as the interface's signature
  element, tying directly into the audit system built back in Day 2.
  **Generated from real post-run database state, not mock data.**

**Run it:**
```bash
python demo_day10_final.py
```
Then open the generated `dashboard.html` in any browser.

**Design notes for Part-8:**
- The dashboard is read-only by construction — it's built entirely on
  `query_service.py` (Part-6) plus direct read-only queries, so viewing
  organizational state can never accidentally mutate it.
- **Two real bugs caught and fixed during this stage:** (1) memory
  retrieval only matched a task's first title word, so Agent B initially
  failed to find Agent A's directly-relevant lesson despite an obvious
  keyword overlap — fixed by matching on all significant words in the
  title, not just the first. (2) `run_agent_task` never actually recorded
  `task.assignee_id`, so the dashboard's Execution panel showed blank
  assignees for every agent-run task — fixed by setting it once
  authorization passes. Both were caught by visually inspecting the
  dashboard's real output against what the demo's own printed narration
  claimed, not just by tests passing.

## Project Status: Complete (Parts 1-8)

All ten days of the roadmap are implemented, tested, and verified:
Day 1 (understanding) → Day 2 (foundation) → Day 3-4 (execution engine)
→ Day 5 (AI agents) → Day 6 (coordination, memory, learning) → Day 7
(governance runtime) → Day 8-9 (25-test adversarial test suite) → Day 10
(final end-to-end delivery + command interface). Every stage was verified
by actually running the code — on this development environment AND
independently reproduced on the platform owner's own machine — not just
written and assumed to work.
