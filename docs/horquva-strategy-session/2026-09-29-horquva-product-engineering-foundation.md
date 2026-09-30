# Horquva — Product Engineering Foundation & Final MVP Scope

**Date:** 2026-09-29
**Inputs:**
- the founder's *MVP Feature Additions* doc;
- the feasibility study (`2026-09-29-horquva-feasibility-study.md`);
- market and pattern research (sources at the end).

**Constraints:**
- built from scratch;
- **two engineers**;
- one deployment per customer;
- deterministic core, with an LLM used only as the interface.

**Purpose:** fix the product scope and the architecture decisions so that requirements engineering can start.

---

## 1. Where Horquva sits in the market

Six existing categories each do a slice of what Horquva claims. The table shows what each does and what we should take from it.

| Category | Examples | What they do | What we take from them | Where they stop |
|---|---|---|---|---|
| **AI agent governance** | Zenity; ServiceNow AI Control Tower; Microsoft Agent 365 | Discover AI agents across SaaS, cloud and endpoints; owners, permissions, security posture | Don't compete on discovery breadth or security posture. They have more connectors than two engineers will ever build. | Security and compliance of agents. Not "what breaks when a person leaves". |
| **Business continuity / operational resilience** | Fusion Risk Management; ServiceNow BCM | Map people, processes, systems and third parties; run business impact analysis; what-if on disruption | **They prove the what-if-on-dependencies concept sells.** Their weakness is ours to exploit: dependency maps are built by hand through BIA questionnaires, and they're enterprise-priced. | Manual data, heavy rollouts, no automatic discovery of AI automations. |
| **Service catalogs / developer portals** | Cortex; OpsLevel; Port; Backstage | "What do we have, who owns it, how healthy is it?" Ownership mapping plus **scorecards** (codified rules, e.g. "production services must have a PagerDuty rotation") | **The scorecard pattern**: every finding is a named rule with pass / fail / unknown and evidence. Ownership-first UX. Reported median contracts are ~$29k/yr (OpsLevel) to ~$75k/yr (Cortex). | Software services only. No people-continuity or leaver view. |
| **Compliance automation** | Vanta; Drata | Hundreds of integrations; **tests run hourly**; evidence kept continuously; people and policies in one system | **The architectural template**: integrations → automated tests (rules) → evidence → tasks for humans where automation can't reach. | Compliance frameworks, not operational dependency. |
| **SaaS management** | Zylo; BetterCloud; Torii (Productiv shut down 6 Aug 2026) | Discover apps via SSO, finance and HR data; assign app owners; offboarding | Ownership assignment and **offboarding as the moment of value**. The Productiv shutdown shows consolidation risk for thin, single-purpose tools. | Apps and licences. Not automations, not dependencies. |
| **Identity governance / access reviews** | ConductorOne; Lumos | **Review campaigns**: scoped reviews, reviewers, reminders, escalation, audit trail | **The attestation pattern**: our "confirm owner, backup and criticality" step is an access-review campaign. Copy the mechanics. | Access rights, not continuity. |

### Positioning (derived from the gaps)

> **Horquva is continuity intelligence for companies whose operations now run on AI automations.** It discovers the automations and AI agents you run and who built them. It confirms owners and backups with a lightweight review. Then it shows what breaks when a person leaves or a vendor fails, and what to fix first.

- **Against Zenity, AI Control Tower and Agent 365:** they secure agents. We keep the business running when people change.
- **Against Fusion and ServiceNow BCM:** they need a months-long manual mapping exercise. We discover most of the map automatically and cost a fraction of the price.
- **Against Cortex and OpsLevel:** they cover engineering services. We cover business automations and the people behind them.

**First customer profile:** 100–2,000 people; Microsoft 365 or Google Workspace; AI automations in **n8n**; OpenAI and/or Anthropic API usage; someone accountable for the automation rollout (COO, Head of Ops, Head of AI, or IT).

---

## 2. Architecture decisions

Each decision is written ADR-style: the decision, why, and what we rejected.

**AD-1 · The findings engine is deterministic, built on the "checks" pattern** (Vanta / Cortex scorecards)
- Every finding is a named **check**, e.g. `critical-asset-has-backup`.
- Each check has a fixed result, **pass / fail / unknown**, plus the evidence facts it read and a one-sentence reason.
- Features (criticality, replaceability, concentration and so on) are compositions of checks and graph queries.
- *Rejected:* probabilistic or weighted scoring (unverifiable), and LLM judgements (not repeatable, compliance exposure).

**AD-2 · Every fact carries where it came from** (fact store)
- One table of facts: `entity · attribute · value · grade(stated | inferred | attested | unknown) · source · source_ref · observed_at · valid_from · valid_to`.
- **Unknown is a stored value, never a missing row.**
- *Rejected:* wide per-entity tables with nullable columns. That's the design where "missing" silently became "no" in the old codebase.

**AD-3 · Ingestion is ELT with an immutable raw landing zone**
- **Extract:** connector fetches and stores the raw payload per sync run, unchanged.
- **Load/Transform:** per-source mappers turn raw data into canonical entities and facts.
- Raw data is retained, so a mapper bug is fixed by **replaying** raw data, not by re-fetching.
- *Rejected:* transform-on-fetch, which loses the evidence trail and can't be replayed.

**AD-4 · Changes come from snapshot diff, recorded as history** (SCD Type 2)
- Most sources don't offer reliable change events. After each sync, the new snapshot is compared with the current facts.
- Changed facts close the old row (`valid_to`) and open a new one.
- Every change emits a **change event**.
- Deletion is detected as "present last sync, absent now".
- Webhooks (Google `users.watch`, Graph `users/delta`) are later optimisations, not the foundation.
- *Rejected:* webhook-first. The sources are uneven, and it's more infrastructure for two engineers.

**AD-5 · Connectors are built in-house on a small SDK; no integration platform for now**
- Connector interface: `authenticate()`, `listResources(cursor)`, `map(raw) → entities/facts`, `schedule`, `rateLimit`.
- Nango was evaluated: 1,000+ APIs; free tier with 10 connections; $50/month pay-as-you-go; self-hosting enterprise-only. It isn't needed yet. The MVP sources are API-key or admin-consent based (n8n API key, OpenAI/Anthropic admin keys, Entra client credentials, Google service account). Nango would also add a sub-processor holding customer credentials, which lengthens security review.
- **Revisit** when OAuth-heavy per-user sources (Jira, GitHub App, Slack) arrive.
- **Merge (HRIS):** only if a design partner's people data lives in Workday or BambooHR and not in the directory. Reported ~$650/month for 10 linked accounts.

**AD-6 · Identity resolution is deterministic and anchored on the directory**
- The directory (Entra or Google) is the **authoritative person list**.
- Other sources match on lower-cased work email.
- Unmatched accounts go to an **identity review queue**. They never become "no owner".
- *Rejected:* ML or fuzzy entity resolution. It's opaque, and unnecessary at this scale.

**AD-7 · The graph lives in Postgres and is computed in memory**
- Tables: `entity`, `edge (from, to, type, source, grade)`.
- At MVP scale (≤ 10k nodes, ≤ 50k edges), load the graph per computation and traverse in application code. Recursive CTEs are available for ad-hoc queries.
- *Rejected:* Neo4j or another graph database. It adds a second datastore, sync logic and on-call surface with no performance need.

**AD-8 · Attestation uses the access-review campaign pattern**
- A **campaign** has a scope (e.g. all critical-candidate assets), reviewers (each asset's owner, or the manager when no owner is known), questions, a due date, reminders, escalation to the manager, and an audit trail.
- Answers become `attested` facts with who and when.
- It re-runs on a schedule (e.g. quarterly), and automatically when a change event hits an asset (owner left → re-attest).

**AD-9 · Jobs run on a Postgres-backed queue**
- pg-boss or Graphile Worker for sync schedules, diffing, campaigns, reminders and the weekly briefing.
- *Rejected:* Redis, Kafka or Temporal. More infrastructure than two engineers should run.

**AD-10 · The LLM is only an interface**
- **Ask Horquva:** the model calls the same API the UI uses and explains the results. It never computes findings.
- **The briefing's prose summary** is written by the model from computed facts.
- One model; tools map 1:1 to API endpoints.

**AD-11 · One stack, one repo, one deployment per customer**
- TypeScript end to end: Next.js web app, a Node API and worker service, Postgres.
- One deployment per customer (already decided), which gives simple isolation.
- Secrets encrypted at rest; read-only scopes only; append-only audit log.

---

## 3. Target architecture

```
                      ┌─────────────────────── per-customer deployment ────────────────────────┐
  SOURCES             │                                                                         │
  Entra ID ─┐         │  WORKER (Node, pg-boss)                                                 │
  Google ───┤ poll    │  ┌───────────┐   ┌──────────────┐   ┌─────────────┐   ┌──────────────┐  │
  n8n ──────┼────────►│  │ Connector │──►│ raw_payload  │──►│  Mappers    │──►│ Identity     │  │
  OpenAI ───┤         │  │ SDK       │   │ (immutable)  │   │ (per source)│   │ resolution   │  │
  Anthropic ┤         │  └───────────┘   └──────────────┘   └─────────────┘   └──────┬───────┘  │
  CSV ──────┘         │                                                             ▼          │
                      │                            ┌──────────────────────────────────────────┐│
                      │                            │ POSTGRES                                  ││
                      │                            │ entity · edge · fact (SCD2 history)       ││
                      │                            │ change_event · campaign · attestation     ││
                      │                            │ check_result · audit_log · identity_queue ││
                      │                            └───────────────┬──────────────────────────┘│
                      │  Snapshot diff ──► change_event ───────────┤                            │
                      │  Checks engine (deterministic) ────────────┤                            │
                      │  Campaign scheduler / reminders ───────────┤                            │
                      │                                            ▼                            │
                      │  API (Node) ── /overview /assets /people /graph /whatif /changes        │
                      │                /actions /campaigns /attest /identity-queue /agent       │
                      │                                            ▼                            │
                      │  WEB (Next.js): 8 screens + attestation form   ASK HORQUVA (LLM → API)  │
                      │  Weekly briefing email · Scan report (PDF, v1.1)                        │
                      └─────────────────────────────────────────────────────────────────────────┘
```

### Core data model (first draft for requirements)

| Table | Holds |
|---|---|
| `connection` | Source, credentials (encrypted), status, last sync |
| `sync_run` | Per-connector run: start, end, counts, errors |
| `raw_payload` | Immutable JSON per resource per sync run |
| `entity` | `id, kind (person, automation, agent, tool, vendor, model), name, external_refs[]` |
| `edge` | `from, to, type (owns, backs_up, depends_on, calls_model, uses_credential_of, member_of), grade, source, valid_from/to` |
| `fact` | `entity, attribute (criticality, documented, fallback_exists, status, …), value, grade, source, observed_at, valid_from/to, attested_by` |
| `change_event` | Kind (person_left, owner_changed, workflow_edited, model_changed, asset_added/removed, failures_spiked), entity, before/after, detected_at |
| `check_def` / `check_result` | Rule definitions; result per entity (pass, fail, unknown) with evidence fact IDs and reason |
| `campaign` / `attestation_task` | Scope, reviewers, due date, reminders, answers |
| `identity_queue` | Unmatched external accounts awaiting a merge decision |
| `audit_log` | Every user action and sync, append-only |

---

## 4. Final MVP scope for two engineers

### 4.1 In scope: MVP v1

**Data sources**

| Source | What it gives us | Why it's in |
|---|---|---|
| **Microsoft Entra ID or Google Workspace**; build the one the first design partner uses, the other in v1.1 | People, department, title, manager, leavers | Identity spine and the leaver trigger |
| **n8n** (Cloud, or self-hosted with a reachable API) | Automations and AI workflows, creator and project, node types → apps, vendors and models, credentials used, failures, version history | Core differentiator: the AI-automation dependency map |
| **OpenAI and Anthropic admin APIs** | Models and usage per project, workspace and key | Model and vendor concentration |
| **CSV import** with a fixed template | Anything not covered: systems, vendors, human-run processes | Fallback; lets a scan start on day one |

**Features**, each as checks with pass / fail / unknown plus the reason:

1. **Inventory and map:** people, automations and agents, tools and vendors, models, and the links between them.
2. **Ownership and coverage:** owner, backup, documented, fallback. Every fact graded stated / inferred / attested / unknown.
3. **Criticality and replaceability:** High / Medium / Low with reasons. Criticality = attested value, or "unknown" with a structural hint (dependents, run frequency, failures).
4. **Concentration:** person, vendor, model and credential concentration as plain sentences with counts. Includes "N workflows run on one person's personal credential".
5. **What-if:** a person leaves, or a vendor or model is unavailable → named list of what breaks and who is left holding it.
6. **Succession test:** reassign someone's assets to a successor → resulting coverage and the successor's new concentration.
7. **Change feed:** events from snapshot diff, each with its downstream impact and which checks changed result.
8. **Attestation campaigns:** owners confirm owner, backup, criticality, documented and fallback. Reminders, escalation to manager, audit trail. Re-attestation is triggered when an owner leaves.
9. **Actions:** one ranked list, one per failing check (critical first, then hardest to replace, then most dependents).
10. **Weekly briefing email:** counts and top changes; the prose is written by the LLM from facts.
11. **Identity review queue**.

**Screens (8):**
- **Overview:** headline coverage count, top risks, top actions, open campaigns.
- **Map**.
- **Assets:** table plus detail with evidence.
- **People:** holders of critical assets; never scored.
- **Concentration**.
- **What-If:** includes the succession test.
- **Changes**.
- **Actions**.

Plus: attestation form (standalone, emailed link), settings/connections, identity queue.

**Platform:**
- Sign-in with Microsoft or Google (the same identity the customer already uses).
- Roles: admin, viewer, reviewer.
- Audit log; encrypted secrets.
- Read-only source scopes; a one-page data-handling policy.

### 4.2 v1.1 (about 4 weeks after v1)

- **Ask Horquva:** the chat agent, calling the v1 API.
- **Scan report PDF** export.
- The second directory (Google or Entra).
- **Make** connector.
- **PagerDuty** connector: the only automatic backup source.

### 4.3 Later (post-MVP, demand-driven)

- Merge HRIS (Workday, BambooHR).
- Jira, GitHub, Confluence (activity-inferred ownership, documentation signal).
- ServiceNow CMDB (criticality, system dependencies).
- Agentforce.
- Copilot Studio / Agent 365.
- Zapier (requires an App Directory listing).
- Volatility trends, once months of change history exist.
- Webhook-based near-real-time sync.
- Multi-org per deployment.
- SOC 2.

### 4.4 Explicitly out of scope

- Any 0–100 score, health index, pillar, culture, DNA, maturity or benchmark.
- Scoring or ranking individual people.
- Forecasting.
- Reading message content (Slack, email, Teams).
- Human business processes not recorded anywhere, except via CSV.
- "Which customers are affected".
- "Real-time" claims.
- Autonomous agent actions or write-backs to source systems.
- Agents built in custom code with no platform or catalog behind them (CSV only).
- Everything in the current codebase not listed above. The old repo is reference only.

---

## 5. Delivery plan (two engineers)

- **Engineer A:** data. Connectors, fact store, diff, identity, checks engine, jobs.
- **Engineer B:** product. API, web app, attestation, what-if UI, briefing.

Both review each other's work. Estimates are engineer-weeks.

| # | Work | Owner | Eng-wks |
|---|---|---|---|
| 0 | **Design-partner scans (manual):** scripts against n8n + directory + OpenAI endpoints; findings delivered as a doc. Validates the product before the build. | A + founder | 1.5 |
| 1 | Foundations: repo, CI, deploy, Postgres schema v1, auth (Microsoft/Google SSO), roles, audit log | B | 2 |
| 2 | Connector SDK, raw landing, sync runs, job queue | A | 2 |
| 3 | Directory connector (one of Entra/Google) | A | 1 |
| 4 | n8n connector + node-type → vendor/model catalog + execution failures + history | A | 2.5 |
| 5 | OpenAI + Anthropic admin connectors | A | 1 |
| 6 | CSV import (template, validation, mapping) | B | 1 |
| 7 | Mappers → entity/edge/fact; SCD2 history; snapshot diff → change events | A | 2 |
| 8 | Identity resolution + review queue (backend + UI) | A + B | 1.5 |
| 9 | Checks engine + check library + hand-checkable test org fixture | A | 3 |
| 10 | What-if + succession engine | A | 1.5 |
| 11 | API layer | B | 2 |
| 12 | Attestation campaigns (scheduler, form, reminders, escalation, audit) | B | 2.5 |
| 13 | Web app, 8 screens | B | 5 |
| 14 | Weekly briefing (email + LLM prose from facts) | B | 1 |
| 15 | Hardening: security review pass, performance, end-to-end tests, pitch demo org | A + B | 2 |
| | **Total v1** | | **≈ 32.5 eng-wks ≈ 16 weeks** |

**To bring v1 to about 12–13 weeks, cut or simplify:**
- Screens: merge Concentration into Overview + People, and Changes into Overview (−1.5).
- Email-only reminders without escalation (−0.5).
- CSV assets only, no CSV people (−0.5).
- Briefing without LLM prose (−0.5).

That's **≈ 29.5 eng-wks, about 15 weeks**. Getting to ~12 weeks also needs item 0 done by the founder with one engineer's scripts (−1) and a tighter hardening pass.

**Realistic statement: v1 in about 3.5 months with two engineers; v1.1 about 1 month later.**

### Milestones

| Week | Milestone | Proof |
|---|---|---|
| 2 | Design-partner scans delivered (manual) | 3+ partners saw their own findings |
| 5 | First real sync: directory + n8n into the fact store | Real partner data in Postgres, raw retained |
| 8 | Checks + what-if on real data, API complete | Every check verified on the hand-checkable fixture |
| 11 | UI + attestation usable end to end | A partner's owner completes a campaign |
| 14–16 | v1: change feed, briefing, hardening | Pitch demo runs on real partner data |

---

## 6. Handoff to requirements engineering

Requirement areas to write next, each with IDs, acceptance criteria and test cases:

| Area | Key questions to settle |
|---|---|
| **R-CON** connectors | Exact endpoints and fields per source (feasibility study §4); sync frequency; rate limits; failure handling; the self-hosted n8n reachability approach |
| **R-DATA** fact model | Attribute catalog; grade rules; SCD2 semantics; retention of raw payloads |
| **R-ID** identity | Match rules; merge and unmerge; service accounts; people outside the directory |
| **R-CHK** checks | Full check library with pass, fail and unknown conditions, evidence and reason text; the criticality and replaceability rule tables |
| **R-SIM** what-if and succession | Mutation semantics; outputs; edge cases (cycles, shared ownership) |
| **R-CHG** change detection | Event taxonomy; diff rules; noise suppression (e.g. cosmetic workflow edits) |
| **R-ATT** attestation | Campaign lifecycle; reviewer resolution; reminders and escalation; conflicting answers |
| **R-UI** screens | Per-screen content, drill-downs, empty and unknown states |
| **R-SEC** security | Scopes per source; secret handling; roles; audit; data retention and deletion |
| **R-NFR** non-functional | Sync time at 2,000 people / 1,000 workflows; page latency; availability; cost per deployment |

**Decisions needed before requirements start:**
1. Confirm the ICP and the n8n-first connector bet. Design-partner scans are the check.
2. Entra or Google first.
3. Accept "discover + attest" as the product model, with the attestation campaign as a core feature.
4. Accept v1 / v1.1 split (agent and PDF in v1.1).
5. Decide whether the old codebase is reference-only or whether any piece is ported. My recommendation: reference-only. The domain lessons carry over, not the code.

---

## Sources

- Cortex / OpsLevel comparison: https://www.opslevel.com/resources/opslevel-vs-cortex-whats-the-best-internal-developer-portal
- OpsLevel vs Cortex pricing (third-party): https://codepulsehq.com/guides/opslevel-vs-cortex
- Cortex platform: https://platformengineering.org/tools/cortex
- Vanta vs Drata: https://www.vanta.com/compare/drata
- Drata comparison: https://drata.com/learn/compare/secureframe-vs-vanta-vs-drata
- SaaS management landscape: https://www.bettercloud.com/best-zylo-alternatives/
- SaaS management 2026: https://www.stitchflow.com/blog/zylo-alternatives
- Fusion business continuity: https://www.fusionrm.com/solutions/business-continuity-management/
- Fusion operational resilience: https://www.fusionrm.com/solutions/operational-resilience/
- ConductorOne campaigns: https://www.conductorone.com/docs/product/manage-access/campaigns/
- ConductorOne scoping: https://www.conductorone.com/blog/scoping-uar-campaigns-deep-dive/
- Lumos: https://www.lumos.com/topic/conductorone-alternatives-competitors
- Zenity + ServiceNow: https://zenity.io/company-overview/newsroom/company-news/zenity-and-servicenow-partner-to-operationalize-ai-agent-risk-reduction-in-secops
- ServiceNow AI Control Tower + Agent 365: https://newsroom.servicenow.com/press-releases/details/2026/ServiceNow-expands-AI-agent-governance-through-deeper-integration-with-Microsoft/default.aspx
- Nango: https://nango.dev/docs/getting-started/intro-to-nango
- Nango pricing: https://nango.dev/pricing
- Nango n8n integration: https://nango.dev/api-integrations/n8n
- Postgres vs Neo4j for graphs: https://www.puppygraph.com/learn/postgres-vs-neo4j
- Recursive CTE graphs: https://medium.com/codex/graph-queries-with-recursive-ctes-you-dont-need-neo4j-3aade6fb7f85
- CDC and snapshots: https://docs.databricks.com/aws/en/data-engineering/what-is-cdc
- Data movement patterns: https://www.getdbt.com/blog/data-movement-patterns
- SCD Type 2: https://dataopsschool.com/blog/scd-type-2/
- Feasibility study (APIs, endpoints): `docs/research/2026-09-29-horquva-feasibility-study.md`
