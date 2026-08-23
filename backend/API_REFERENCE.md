# Horquva OBA - Backend API Reference (for Frontend Team)

Base URL (local): `http://localhost:3000`
All responses are JSON. Errors return `{ "error": "..." }` with a 4xx/5xx status.

> Setup: `cd backend && npm install && node index.js`
> Before starting, run `backend/schema.sql` in Supabase and set `SUPABASE_URL` + `SUPABASE_KEY` in `backend/.env`.
> Routes under **Intelligence (Kamran / Phase 6)** work even without Supabase.

---

## Reality Layer (Huzaifa + backend team)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/ownership` | Ownership intelligence (M01) |
| GET | `/api/dependencies` | Dependency intelligence (M02) |
| GET | `/api/risks` | Risk intelligence (M03) |
| GET | `/api/tools` | AI tool inventory (M07) |
| GET | `/api/tool-intelligence` | AI tool intelligence (M07) |
| GET | `/api/tool-impact` | Tool impact analysis |
| GET | `/api/workflows` | Workflow intelligence (M08) |
| GET | `/api/knowledge/intelligence` | Knowledge intelligence |
| GET | `/api/knowledge/impact` | Knowledge impact |
| GET | `/api/knowledge/gaps` | Knowledge gaps |
| GET | `/api/memory` | Organizational memory |
| GET | `/api/agents` | Agent registry |
| GET | `/api/dashboard` | Aggregated dashboard data |
| GET | `/api/human-agent-map` | Human-agent mapping |
| GET | `/api/simulations/employee-leaves` | What-if: employee leaves |
| GET | `/api/simulations/agent-fails` | What-if: agent fails |
| GET | `/api/simulations/platform-down` | What-if: platform down |
| GET | `/api/simulations/workflow-disruption` | What-if: workflow disruption |

## Interaction + Automation Layer (Anusha)

### M15 Verification - `/api/verification`
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/verification` | All verification logs |
| GET | `/api/verification/flagged` | Only flagged actions |
| GET | `/api/verification/summary` | Counts by status + policy violations |
| POST | `/api/verification` | Log a verification record |

### M16 Orchestration - `/api/orchestration`
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/orchestration/...` | Workflow orchestration state + intents |
| POST | `/api/orchestration/...` | Receive/approve/reject/execute intents |

### M21 Executive Avatar - `/api/avatar`
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/avatar/escalations` | All escalation logs |
| GET | `/api/avatar/escalations/critical` | Critical escalations only |
| GET | `/api/avatar/escalations/summary` | Counts by severity + status |
| POST | `/api/avatar/check` | Gate-check a workflow; auto-escalate on failure |

### M23 Executive Briefing - `/api/briefing`
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/briefing/risks` | Risk summary |
| GET | `/api/briefing/health` | Org health snapshot |
| GET | `/api/briefing/recommendations` | Action recommendations |
| GET | `/api/briefing/latest` | Full executive briefing (health + risks + recs + text) |

### M51 Self-Healing - `/api/self-healing`
| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/api/self-healing/...` | Detect issues + emit healing intents to M16 |

### M52 Governance Automation - `/api/automation/governance`
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/automation/governance/audit` | Detect all governance violations |
| POST | `/api/automation/governance/enforce` | Detect + emit enforcement intents to M16 |

### M53 Continuity Automation - `/api/automation/continuity`
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/automation/continuity/risks` | Detect continuity risks |
| POST | `/api/automation/continuity/plan` | Generate + emit recovery intents to M16 |

> **Namespace note:** Kamran's read-only **M18 Continuity** (`/api/continuity/*`) and **M19 Governance** (`/api/governance/*`) intelligence APIs keep their original paths. Anusha's **automation** layer for the same domains lives under `/api/automation/*` so the two never collide.

### M18 Continuity Intelligence (read) - `/api/continuity`
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/continuity/score` | Organizational continuity score |
| GET | `/api/continuity/assets` | Asset survival: SURVIVES / DEGRADED / FAILS / LOST |
| GET | `/api/continuity/risk-map` | Continuity risk map |
| GET | `/api/continuity/must-protect` | Critical assets that must be protected |
| GET | `/api/continuity/plans` | Generated continuity plans |

### M19 Governance Intelligence (read) - `/api/governance`
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/governance/score` | Governance score |
| GET | `/api/governance/assets` | Per-asset governance status |
| GET | `/api/governance/heatmap` | Governance heatmap by department |
| GET | `/api/governance/gaps` | Ownership + documentation gaps |
| GET | `/api/governance/offenders` | Worst governance offenders |

## Voice Intelligence (Huzaifa, M22) - `/api/voice`
A live conversational engine, not a Deepgram transcript mock — it rebuilds an
in-memory org graph from Supabase on every call and does real intent
classification + entity resolution. There is no `/transcribe` or `/intent`
endpoint (no audio handling of any kind); the actual surface is:

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/api/voice/ask` | `?q=` or `{ question }` -> answer + resolved entity + confidence |
| POST | `/api/voice/command` | `{ text }` -> structured command execution |
| GET | `/api/voice/intents` | Supported intents / example queries |
| GET | `/api/voice/history` | Recent conversation history |
| GET | `/api/voice/daily-summary` | Today's spoken executive briefing |

## Constitutional Intelligence & Meta-Brain (Kamran, Phase 6) - `/api/intelligence`
These read live from Supabase via `domain/dataset.js` (shared with voice.js) —
**not** from `data/company.json`, which nothing reads at runtime. They do not
survive a Supabase outage.

| Method | Endpoint | Module |
|---|---|---|
| GET | `/api/intelligence/signals` | Trend signals — which monthly series are moving the wrong way |
| GET | `/api/intelligence/opportunities` | Improvement opportunities ranked by impact against effort |
| GET | `/api/intelligence/capability` | Per-department capability score. **Not** the graph's `/capability-by-dept` |
| GET | `/api/intelligence/alignment` | Alignment checklist. `alignment` is null / `NO_SIGNAL` when no dimension has data. **Not** the graph's `/strategic-alignment` |
| GET | `/api/intelligence/truth` | Truth claims (served by `routes/truth/truth.js`) |
| GET | `/api/intelligence/advisor` | Playbook advice — only for claims that verified |
| GET | `/api/intelligence/brain-core` | M50 Brain Core Logic |
| GET | `/api/intelligence/simulation-universe` | Resilience scenarios — what each shock costs |
| GET | `/api/intelligence/orchestrator` | M55 Intelligence Orchestrator (runs last) |
| GET | `/api/intelligence` | Index of all Phase 6 endpoints |

---

### Notes for frontend
- Every list endpoint returns an array; every summary endpoint returns an object.
- Poll `/api/briefing/latest` for the executive dashboard home screen.
- `/api/avatar/check` is a POST with body `{ "workflow_id": "wf_001" }`.
- Autonomy is governed by `execution_mode` (default `advisory` = system never auto-acts). Show this state in the UI.
