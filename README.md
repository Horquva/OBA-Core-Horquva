# OBA Core — AI Workforce Intelligence Engine

**Developed by Horquva · MVP Demo · Northwind Labs (Fictional Company)**

OBA Core (Organizational Brain Analysis) is an enterprise-grade intelligence engine that automatically discovers, maps, and analyzes every AI agent operating inside an organization. It answers the three questions no organization can currently answer:

- **Who owns each AI agent?**
- **What breaks — and how badly — if one fails?**
- **What happens to the organization if a key person leaves?**

OBA Core answers all of this in seconds, with full risk scoring, cascade simulation, and prioritized action plans.

![OBA Core Executive Dashboard](Images/dashboard.png)
<b style="font-size: 16px; font-weight: 800; color: black;">"The only thing that matters: This is actually useful." — Horquva</b>

---

## Table of Contents

- [The Problem We Solve](#the-problem-we-solve)
- [What Was Built](#what-was-built)
- [System at a Glance — How Everything Fits Together](#system-at-a-glance--how-everything-fits-together)
- [Intelligence Modules — Phase 1 (Modules 01–20)](#intelligence-modules--phase-1-modules-0120)
- [Architecture Layers (Phase 3 — Ontology · Relationship · Reasoning · Truth · Context · Voice)](#architecture-layers-phase-3--ontology--relationship--reasoning--truth--context--voice)
- [Executive, Network & Prediction Intelligence (Modules 21–35)](#executive-network--prediction-intelligence-modules-2135)
- [Constitutional Intelligence, Automation & Meta-Brain (Modules 36–55)](#constitutional-intelligence-automation--meta-brain-modules-3655)
- [Constitutional Runtime — Organizational Brain (`backend/brain/`)](#constitutional-runtime--organizational-brain-backendbrain)
- [Demo Results Summary](#demo-results-summary)
- [How to Run](#how-to-run)
- [Project Structure](#project-structure)
- [Full Tech Stack](#full-tech-stack)
- [Module Engineering](#module-engineering)
- [Phase 6 — Constitutional Intelligence & Meta-Brain (Master Registry M01–M55, LOCKED)](#phase-6--constitutional-intelligence--meta-brain-master-registry-m01m55-locked)

---

## The Problem We Solve

Organizations are deploying AI agents faster than they can govern them. The result is invisible risk:

- Agents running with no owner, no documentation, no backup
- One person quietly controlling 5+ critical agents — with zero coverage
- Nobody knowing which agent failure cascades into a full department breakdown
- Leadership making decisions with no visibility into their AI infrastructure

**OBA Core makes the invisible visible.**

---

## What Was Built

OBA Core is a full-stack intelligence platform with three layers:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Intelligence Engine | Node.js · Knowledge Graph | 23 analyses over one organizational graph built from Supabase |
| Backend API | Node.js · Express · Supabase | REST API serving all intelligence data |
| Executive Dashboard | Next.js 16 · TypeScript · Tailwind · Recharts | Interactive visualization for leadership |

---

## System at a Glance — How Everything Fits Together

Read this section first. It explains the entire OBA Core system in plain language — what it is, how a question travels through it, who builds each part, and the vocabulary used everywhere else in this document. Everything after this section is detail.

### The big idea

Every modern organization runs on a hidden web of people, AI agents, tools, workflows, and knowledge. When one node fails — a key person leaves, an agent breaks, a tool goes offline — the damage cascades in ways nobody can see in advance. **OBA Core turns that invisible web into a living map and reasons on top of it**, so leadership can ask plain questions ("What are our biggest risks?", "What breaks if Robert leaves?") and get verified, prioritized answers in seconds.

It does this with **23 constitutional analyses** that do not run as 23 disconnected scripts. They run over **one shared Organizational Knowledge Graph** in a common package format, in dependency order. (The catalog is numbered M01–M55; 32 codes have been retired across three passes — see the Organizational Brain section. The two "constitutional rules" once enforced across this catalog — Truth gates Advisor, Meta-Brain fuses last — were retired along with the three modules that carried them; each had a richer, already-live SQL/`domain/derived.js` answer to the same question instead.)

### How a single question flows through the system

1. **A question enters** — from an executive, the dashboard, or an API call (e.g. *"What are our biggest organizational risks?"*).
2. **The Knowledge Graph is the ground truth** — every person, system, AI agent, tool, and workflow exists exactly once, with all relationships mapped.
3. **A route calls one analysis by name** — `brain.run('ownership')` or `brain.run('M01')`; no capability-discovery step runs at request time.
4. **Dependency ordering** — that analysis's declared prerequisites are resolved and run first (Kahn's algorithm), so composed analyses see real prior data.
5. **The analysis executes** — it returns a standard Intelligence Package: a result, a confidence score, supporting evidence, and recommended actions.

Steps 6–7 as originally designed — a Truth module (M46) gating an Autonomous
Advisor (M48), fused last by a Meta-Brain Orchestrator (M55) — were retired
2026-09-02 along with those three modules; each had a richer, already-live
answer elsewhere. **Two independent fusion systems ship live today instead:**
`GET /api/intelligence/orchestrator` (13 weighted signals over
`domain/derived.js`) and `GET /api/intelligence/brain-core` (10 weighted
signals, same root). Neither reads through the graph's dependency-ordering
mechanism described above — they compute their own inputs directly.

```
            Executive question
                   │
                   ▼
        ┌───────────────────────┐
        │   Knowledge Graph     │  entities + relationships (one shared truth)
        └───────────┬───────────┘
                   ▼
        brain.run('M01') (or any of 23)  →  which analysis was asked for?
                   │
                   ▼
        Dependency ordering   →  that analysis's prerequisites run first
                   │
                   ▼
        Analysis executes     →  result + confidence + evidence
                   │
                   ▼
         One analysis's Intelligence Package
```
Executive-level fusion across *all* signals happens outside this flow, in
`orchestrator.js` / `brainCore.js` — see "By the numbers" below.

### The four intelligence layers — who builds what

The 23 remaining analyses are owned by three engineers — Anusha's whole
layer was retired 2026-09-02, each module redundant with a richer, already-
live system (see [A further 27 analyses were retired](#a-further-27-analyses-were-retired-2026-09-02)),
and Kamran's Knowledge Concentration module (M30) followed the same day for
the same reason:

| Layer | Lead engineer | Modules | What it delivers |
|---|---|---|---|
| **Knowledge Platform** | **Huzaifa** (11) | M01, M02, M03, M07, M19, M20, M28, M29, M31, M34, M35 | Discovery + memory: registries, entities, relationships, the Knowledge Graph and ontology — the shared truth every other module reads from |
| **Core Reasoning** | **Kamran** (4) | M04, M18, M39, M40 | Recommendations, continuity, capability and coverage over the graph |
| **Prediction & Org Science** | **Tahir** (8) | M32, M37, M41, M42, M43, M44, M45, M49 | Looks forward and inward: dependency impact, patterns, DNA, culture, maturity, benchmarks and the organizational digital twin |
| ~~Executive Experience & Autonomous Ops~~ | ~~Anusha~~ (0) | *(all 7 retired)* | Retired 2026-09-02 — see the Organizational Brain section for what replaced each one |

### Supporting teams

| Area | Team | Responsibility |
|---|---|---|
| Backend infrastructure | **Fizza & Shawal** | Node.js + Express API and Supabase persistence; the routes that serve all intelligence to the dashboard |
| Executive dashboard (frontend) | **Frontend team** | Next.js 16 + TypeScript + Tailwind + Recharts visualization for leadership |
| Architecture, integration & review | **Kamran** (Technical Lead) | Owns the Brain runtime and integrates every engineer's work into one constitutional source of truth |

### Key concepts (glossary)

| Term | Meaning |
|---|---|
| **Analysis (M01–M55)** | A single unit of organizational intelligence. 32 codes have been retired across three passes (4 on 2026-08-24, 28 on 2026-09-02); the 23 that remain keep their codes |
| **Capability** | The named service a module exposes (e.g. `m03.risk.intelligence`) so it can be *discovered* rather than hard-referenced |
| **Knowledge Graph** | The Brain's long-term memory: every entity and every relationship, each stored exactly once |
| **Entity / Relationship** | The nodes and edges of the graph. Relationships are first-class — no dangling edges allowed |
| **Intelligence Package** | The standard envelope every module returns: `type`, `payload`, `confidence`, `evidence`, `recommendations` |
| **Constitutional rules** | Non-negotiable runtime laws: *discovery before execution*; *Truth (M46) gates the Advisor (M48)*; *the Meta-Brain (M55) always runs last* |
| **Boot Report** | The acceptance report printed when the Brain boots — modules discovered, per-owner counts, and every criterion check |
| **Confidence** | A 0–1 score each module attaches to its output; the Meta-Brain fuses these into one figure |

### By the numbers

| Metric | Value |
|---|---|
| Constitutional analyses | **23** (M01–M55 catalog, 32 retired across three passes) |
| Engineering owners | **3 active** — Huzaifa 11 · Kamran 4 · Tahir 8 (Anusha's 7 all retired 2026-09-02) |
| Runtime files (`backend/brain/`) | 21 JavaScript modules |
| Live knowledge graph | 157 entities · 423 relationships, built from Supabase on every boot — the synthetic 16-entity/24-relationship seed graph was deleted with `graphSeeder.js` (see `knowledge/graphLoader.js`'s own header) |
| Stub responses | **0** — every module computes real graph-derived intelligence |

---

## Intelligence Modules — Phase 1 (Modules 01–20)

> **On the "Sunrise Care findings" callouts below.** These are illustrative output captured during early development against a demo dataset ("Sunrise Care") that has since been retired — the live app now runs against a different seed company (`data/company.json`, wired in through `backend/sql/`), and none of the specific names, counts or scores quoted below still match what the running system reports. They're kept because they show *what each module's output looks like and how it reasons* — the formulas, thresholds and status vocabulary next to each one are current. For real, current numbers, run the app (`How to Run` below) or call the live API directly; treat every number under a "Sunrise Care findings" heading as historical illustration, not a current fact about this deployment.

### Module 01 — Ownership Intelligence
![Module 01 Output](Images/agent_summary.png)

**Live graph endpoint (wired 2026-09-02):** `GET /api/intelligence/ownership-map` — the Knowledge-Graph analysis: every asset across every asset type, owned or not, asset-first (unlike `GET /api/ownership`'s owner-first, agent-scoped view). The scoring formula and findings below are the original Phase 1 illustration against the retired demo dataset — see the callout at the top of this section.

Analyzes every AI agent across the organization and scores ownership risk.

**What it does:**
- Identifies the primary owner and backup owner for each agent
- Detects fully orphaned agents (no owner assigned whatsoever)
- Flags owner concentration risk — one person controlling too many critical agents
- Calculates a risk level per agent: `LOW / MEDIUM / HIGH / CRITICAL`

**Risk Scoring Formula:**
| Factor | Points Added |
|--------|-------------|
| No owner assigned | +40 |
| No backup owner | +30 |
| Not documented | +15 |
| Agent criticality: critical | +15 |
| Agent criticality: high | +10 |
| Agent criticality: medium | +5 |

**Score → Risk Tier:** `< 20 = LOW` · `20–39 = MEDIUM` · `40–69 = HIGH` · `70+ = CRITICAL`

**Sunrise Care findings:**
- Robert owns 5 agents — zero backups — highest single-owner concentration in the org
- 2 agents fully orphaned: Inventory Agent, Data Backup Agent
- 9 of 15 agents have no backup owner

---

### Module 02 — Dependency Intelligence
![Module 02 Output](Images/dependency_map.png)

**Live graph endpoint (wired 2026-09-02):** `GET /api/intelligence/dependency-fanin` — fan-in ranking and the critical-dependency list, over `depends_on` edges the graph unifies from the `dependencies` table plus `agent_platform`, `workflow_tool_dependencies`, `system_dependencies` and `system_agent_usage` — a broader edge set than `GET /api/dependencies` reads. The findings below are the original Phase 1 illustration against the retired demo dataset — see the callout at the top of this section.

Builds a full dependency graph of all AI agents and maps cascade failure paths.

**What it does:**
- Constructs a directed dependency graph: which agents feed into which
- Detects Single Points of Failure (SPOF) — agents whose failure breaks 3+ downstream agents
- Simulates cascade failure: if Agent X goes down, which agents are affected?
- Calculates upstream depth — how deep in a dependency chain each agent sits

**Sunrise Care findings:**
- 4 Single Points of Failure identified across 15 agents
- 6 agents have 3 or more downstream cascade victims
- Onboarding Agent failure → 4 agents immediately break
- Inventory Agent failure → 4 agents immediately break

---

### Module 03 — Risk Intelligence
![Module 03 Output](Images/riskanalysis.png)

**Live graph endpoint (wired 2026-09-02):** `GET /api/intelligence/organizational-risk` — a risk score from single-points-of-failure plus critical dependencies across every asset type (not just agents, the scope of `GET /api/risks`), over the graph's unified `depends_on` edges. The findings below are the original Phase 1 illustration against the retired demo dataset — see the callout at the top of this section.

Fuses ownership risk and dependency data into a single composite risk score per agent, then computes the Organizational Health Score.

**What it does:**
- Combines Module 01 + Module 02 outputs into one unified risk score
- Applies CRITICAL override rule: any orphaned agent OR any SPOF with no backup = CRITICAL regardless of score
- Calculates the **Organizational Health Score (0–100)** — a single number representing how well-governed the organization's AI infrastructure is
- Produces a complete risk breakdown per agent for executive review

**Sunrise Care findings:**
- 5 agents at CRITICAL risk
- 6 agents at HIGH risk
- **Organizational Health Score: 56/100 — AT RISK**

---

### Module 04 — Recommendation Engine
![Module 04 Output](Images/recommendations1.png)

Generates specific, named, prioritized actions based on every risk finding — not generic advice.

**What it does:**
- Reads every risk finding from Module 03 for every agent
- Generates a targeted recommendation per risk: names the agent, names the person, names the exact action
- Prioritizes all recommendations: CRITICAL → HIGH → MEDIUM, then Quick wins first
- Produces a Top 5 Most Urgent Actions list for immediate leadership action
- Calculates how each fix improves the Organizational Health Score

**Sunrise Care findings:**
- 12 actionable recommendations generated
- Top priority: immediately assign owners to Inventory Agent and Data Backup Agent
- Redistribute Robert's 5 agents — single departure would orphan all of them
- Recovery plan provided with projected Health Score improvement per action

---

### Module 05 — What-If Simulation Engine — RETIRED 2026-09-02

A crude single-target cascade estimate — no real health-delta calculation. Its question is answered live today by `domain/simulations.js` (`GET /api/simulations/rank`), which covers four real scenario types (employee leaves, agent fails, platform down, workflow disruption) with an actual before/after health score, not this module.

---

### Module 06 — Human-Agent Dependency Map — RETIRED 2026-09-02

A flat human↔agent/system relationship list. Its question is answered live today by `GET /api/human-agent-map`, a richer nested employee→agent→platform/workflow tree over the same relational data, not this module.

---

### Module 07 — AI Tool Intelligence
![Module 07 Output](Images/Module_07.png)

**Live graph endpoint (wired 2026-09-02):** `GET /api/intelligence/ai-agent-governance` — per-entity owners/dependsOn/governedBy/supports for every graph `ai_agent` entity, automation agents *and* platforms both, plus which are ungoverned. `GET /api/tool-intelligence` covers `ai_platforms` ("tools") only and has no automation-agent governance view at all. The findings below are the original Phase 1 illustration against the retired demo dataset — see the callout at the top of this section.

Audits every AI tool in use across the organization — usage, risk, dependencies, and financial exposure.

**What it does:**

![](Images/Module_07(1).png)

- Scores every AI tool for risk: ChatGPT, Claude, Gemini, Microsoft Copilot, GitHub Copilot
- Maps tool-to-agent and tool-to-workflow dependencies: if this tool goes offline, what breaks?
- Identifies tools with no backup/alternative and no usage policy
- Shows department-level exposure per tool
- Calculates total monthly AI tool spend across the organization

**Sunrise Care findings:**
- ChatGPT = CRITICAL — 7 users, 4 departments, powers 3 agents, no policy, no backup
- Microsoft Copilot = HIGH — 8 users across all 8 departments, no backup alternative
- 3 of 5 tools have no fallback option assigned
- If ChatGPT access is revoked: Lead Generation, Marketing Campaign, and Customer Support workflows all break simultaneously
- **Total monthly AI tool spend: $1,444**

---

### Module 08 — Workflow Intelligence — RETIRED 2026-09-02

A structural workflow list — owners and dependencies, no risk scoring. Its question is answered live today by `GET /api/workflows/intelligence` (failure-weighted risk score) and `GET /api/workflows/spof` (multi-reason SPOF detection), not this module.

---

### Module 09 — Knowledge Risk Intelligence — RETIRED 2026-09-02

A bus-factor list over knowledge assets alone. Its question is answered live today by `GET /api/knowledge/intelligence` (per-employee knowledge risk + concentration), `/gaps` (undocumented assets) and `/impact/:employee` (what's lost if they leave), not this module.

---

### Module 10 — Organizational Memory Intelligence — RETIRED 2026-08-24

Measured the software's own run history, not the organization — see [Four analyses were retired](#four-analyses-were-retired-2026-08-24) for the full reasoning. Its question is answered live today by `GET /api/memory/health`, backed by `domain/derived.js`'s `orgMemory()`, not this module.

---

### Module 11 — Predictive Risk Intelligence — RETIRED 2026-09-02

A cruder version of the codebase's own canonical predictive-risk formula. Its question is answered live today by `GET /api/predictive-risk/*`, backed by `domain/derived.js`'s `predictiveRisk()` — the definition the rest of the product (including the frontend, which explicitly refuses to re-band it locally) already treats as authoritative — not this module.

---

### Module 12 — Organizational Forecasting Intelligence — RETIRED 2026-08-24

Measured the software's own run history, not the organization — see [Four analyses were retired](#four-analyses-were-retired-2026-08-24) for the full reasoning. Its question is answered live today by `GET /api/forecast/*`, sourced from `organizational_forecasts` (a genuine, never-rewritten time series), not this module.

---

### Module 13 — Human-AI Collaboration Intelligence — RETIRED 2026-09-02

A single edge-count ratio, no distinction between adoption/dependency/collaboration. Its question is answered live today by `GET /api/collaboration/*`, backed by `domain/derived.js`'s `collaboration()` — three distinct scores per employee and per department — not this module.

---

### Module 14 — Decision Intelligence — RETIRED 2026-09-02

A generic readiness score (ownership coverage × risk), not a per-decision audit. Its question is answered live today by `GET /api/decisions/*` (`organizational_decisions`, the GOOD/ACCEPTABLE/POOR/HARMFUL quality tiers and decision trail described above) and `GET /api/decision-intelligence`, not this module.

---

### Module 15 — Verification Intelligence — RETIRED 2026-09-02

A structural per-asset check (owner present, no broken dependency edges), not an action-level audit trail. Its question is answered live today by `GET /api/verification/*` (`verification_actions`, real per-action policy-compliance and flagging), not this module.

---

### Module 16 — Workflow Orchestration Intelligence — RETIRED 2026-09-02

A dependency-count readiness ranking — no real actor-collision detection. Its question is answered live today by `GET /api/orchestration/*`, which detects genuine collisions (two workflows needing the same actor at the same step) and live blocking, not this module.

---

### Module 17 — Organizational Learning Intelligence — RETIRED 2026-08-24

Measured the software's own run history, not the organization — see [Four analyses were retired](#four-analyses-were-retired-2026-08-24) for the full reasoning. Its question is answered live today by `GET /api/learning/*` (`/failures`, `/decisions`), not this module.

---

### Module 18 — Organizational Continuity Intelligence

Scores every asset on its ability to survive a major disruption (a key person leaving or a tool going offline), identifies exactly what must be protected, and produces concrete continuity plans — answering *what survives*, *what fails*, and *what must be protected*.

**What it does:**
- Assigns a **Continuity Score (0–100)** to every agent, workflow, and AI tool — the likelihood it survives a major disruption
- Classifies each asset: `SURVIVES / DEGRADED / FAILS / LOST`
- Builds a **Continuity Risk Map** at the department level — average continuity and at-risk counts per department
- Identifies **what must be protected**: critical/high assets that would Fail or be Lost
- Generates a **Continuity Plan** per must-protect asset (assign owner, name backup, document + store runbook, select fallback)
- Computes the org-wide **Organizational Continuity Score (0–100)**

**Continuity Status Definitions:**
| Status | Meaning |
|--------|---------|
| SURVIVES | Owned, backed up, and documented — recoverable |
| DEGRADED | Partial coverage — survives but with disruption |
| FAILS | Missing backup or documentation — does not survive cleanly |
| LOST | No owner, no backup, no documentation — unrecoverable |

**Sunrise Care findings:**
- 27 assets assessed — 12 SURVIVES · 3 DEGRADED · 10 FAILS · 2 LOST
- 2 assets classified LOST: **Data Backup Agent (0/100)** and **Inventory Agent (2/100)**
- **IT department is the most fragile — 18/100 average continuity**
- 10 critical/high assets flagged as **must be protected**, each with a generated continuity plan
- **Organizational Continuity Score: 63/100 — AT RISK**

---

### Module 19 — Governance Intelligence

Scores how well every asset is governed — owner accountability, documentation, and policy coverage — and builds a department-level governance heatmap with gap detection.

**What it does:**
- Assesses each entity (agent, tool, workflow) for governance: owner assigned, documented, policy coverage, policy freshness
- Scores each entity 0—100 and classifies it `HEALTHY / WARNING / AT RISK / CRITICAL`
- Builds a governance heatmap and detects governance gaps ranked by severity
- Computes an org-wide Governance Score

**Sunrise Care findings:**
- **Governance Score: 47/100 — AT RISK**
- No formal governance policies cover most assets — ownership and documentation gaps dominate
- High-criticality, undocumented, unbacked assets are the worst governance offenders

---

### Module 20 — Accountability Intelligence

**Live graph endpoint (wired 2026-09-02):** `GET /api/intelligence/reporting-chains` — org-chart structure from the graph's `reports_to`/`manages` edges: reporting chains, management links, assets with no accountable owner. This is **not** the RACI system below — that RACI model lives at `GET /api/accountability/*` (`accountability_links`: Responsible/Accountable/Consulted/Informed per entity), a genuinely different structure under the same word. The findings below are the original Phase 1 illustration against the retired demo dataset — see the callout at the top of this section.

Builds RACI-style accountability links for every asset — who is Responsible, Accountable, Consulted, Informed — maps responsibility chains, and scores accountability coverage.

**What it does:**
- Derives accountability links (Responsible / Accountable / Consulted / Informed / Decision Authority) for each entity
- Builds responsibility chains and detects weak structures (e.g. same person Responsible *and* Accountable)
- Scores each entity and computes an org-wide Accountability Score

**Sunrise Care findings:**
- **Accountability Score: 76/100 — WARNING**
- 13 entities carry accountability links, but **7 have the same person Responsible and Accountable** — no separation of duties
- Only 4 unique people appear across all responsibility chains — heavy concentration

---

### Intelligence Platform Foundation (Phase 2)

The shared data + intelligence backbone that powers the Governance and Accountability modules and standardizes how every pillar reads organizational data.

**What it provides:**
- **Organizational Data Models** — typed entities for agents, tools, workflows, policies, accountability links, and governance gaps
- **Intelligence Pipeline** — normalizes raw org data into a single comparable entity surface and derives policies + accountability links
- **Governance Data Framework** — reusable governance scoring, heatmap, and gap-detection logic
- **Intelligence Storage Layer** — persists pillar analyses and a queryable intelligence index

---

### Organizational Intelligence Engine — Five Pillars Integration (Phase 2)

The platform foundation that connects every individual module into one unified system. Instead of reading 14 separate reports, leadership gets a single integrated view built on three layers — **Intelligence Logic** (shared signals derived from every asset), **Intelligence Relationships** (how one weakness drags others down), and **Intelligence Scoring** (one comparable score per dimension) — rolled up across the **Five Pillars**.

**The Five Pillars:**
| Pillar | Code | What it measures |
|--------|------|------------------|
| Domain Intelligence | DI | Is the organization mapped — ownership, dependencies, documented domain? |
| Memory Intelligence | MI | What knowledge is retained vs. trapped in one person's head? |
| Operational Intelligence | OI | Can day-to-day operations absorb a person or tool going down? |
| Organizational Continuity Intelligence | OCI | What survives a major disruption (criticality-weighted)? |
| Governance Intelligence | GI | Accountability and compliance — owners, backups, documentation? |

**How it works:**
- **Intelligence Logic** — flattens agents, workflows, and AI tools into one comparable asset surface and derives shared signals (ownership, backup, documentation, dependency and criticality coverage)
- **Intelligence Scoring** — scores each pillar 0–100 (`STRONG / MODERATE / WEAK / CRITICAL`) and rolls them into one **Organizational Intelligence Score**
- **Intelligence Relationships** — flags when a weak pillar drags another (e.g. weak Memory → weaker Continuity), so leadership fixes the root cause instead of the symptom

**Rating bands:** `80+ = STRONG` · `60–79 = MODERATE` · `40–59 = WEAK` · `< 40 = CRITICAL`

**Sunrise Care findings:**
| Pillar | Score | Rating |
|--------|-------|--------|
| Domain Intelligence (DI) | 81/100 | STRONG |
| Memory Intelligence (MI) | 53/100 | WEAK |
| Operational Intelligence (OI) | 41/100 | WEAK |
| Organizational Continuity Intelligence (OCI) | 56/100 | WEAK |
| Governance Intelligence (GI) | 55/100 | WEAK |

- The domain is well-mapped (ownership on 25/27 assets), but **Memory, Operational, Continuity and Governance are all weak** — knowledge lives in people's heads, not documents
- 4 dragging relationships detected — **MI→OCI, OI→OCI, GI→DI, GI→OCI** — weak governance and memory are the root cause pulling continuity down
- **Organizational Intelligence Score: 57/100 — WEAK**

---

## Architecture Layers (Phase 3 — Ontology · Relationship · Reasoning · Truth · Context · Voice)

These six architecture layers turn 20 independent modules into one coherent Organizational Brain. Until now every module could form its own opinion about the same entity, which created overlap and contradiction (e.g. Dependency and Accountability both reasoning about ownership). With Phase 3, **modules no longer make decisions — they generate signals**, and a single Truth Layer reconciles those signals into one authoritative answer with confidence, evidence, and freshness.

```
Ontology  →  Relationship  →  Modules emit signals  →  Reasoning  →  Truth  →  Context + Voice
(what exists) (how connected)    (20 perspectives)        (insight)   (one truth)  (executive + voice access)
```

### Architecture Layer A1 — Ontology Layer — *Defines what exists*

The formal vocabulary of the Organizational Brain. Every entity is registered here, under a defined type, before any module is allowed to reference it. This guarantees all 20 modules talk about the same entities in the same language.

- **Entity types defined:** Human · Team · AI Agent · System · Workflow · Knowledge
- **Relationship vocabulary defined:** `owns` · `depends_on` · `governs` · `collaborates_with`
- Tacit (undocumented) knowledge is promoted into explicit **Knowledge** entities so it becomes visible and trackable.

**Sunrise Care:** 55 entities registered across 6 types — 8 Human, 9 Team, 15 AI Agent, 5 System, 7 Workflow, 11 Knowledge.

### Architecture Layer A2 — Relationship Layer — *Defines how everything connects*

The graph the Brain navigates when reasoning about the organization. It maps every connection between entities using the ontology's relationship vocabulary, then surfaces the most connected nodes (hubs) — the structural pressure points.

| Relationship | Count |
|--------------|-------|
| owns | 25 |
| depends_on | 43 |
| governs | 14 |
| collaborates_with | 56 |

**Sunrise Care:** 138 relationships mapped. Biggest hubs — **Robert (29 connections)**, Lisa (28), Sarah (24) — confirming structural over-concentration around a few people.

### Architecture Layer A3 — Reasoning Layer — *Turns signals into understanding*

Raw module signals are just facts ("no backup", "undocumented"). The Reasoning Layer connects related signals into **insight** — the *so what* and the *why* — with an explicit reasoning chain, so leadership sees conclusions, not just data points.

- Detects patterns: knowledge concentration, single-point-of-failure cascades, compound risk (undocumented **and** no backup), and systemic documentation gaps.
- Every insight carries a step-by-step reasoning chain and the evidence behind it.

**Sunrise Care:** 16 insights generated (9 CRITICAL, 7 HIGH). Top conclusion — *Robert is a structural single point of failure*, reasoned from ownership + documentation + backup signals.

### Architecture Layer A4 — Truth Layer — *One organizational truth*

The authority layer. Every module's view of an entity arrives as a **signal**; the Truth Layer combines them, resolves disagreements, and produces one determined truth per entity — each carrying:

- **Confidence** — how strongly the modules agree (disagreement caps confidence).
- **Evidence** — the full signal trail behind every verdict (auditability).
- **Freshness** — Fresh / Aging / Stale, based on documentation and backup coverage.

**Sunrise Care findings:**
| Metric | Result |
|--------|--------|
| Entities reconciled | 27 |
| Signals combined | 135 |
| CRITICAL truths determined | 4 |
| HIGH truths determined | 9 |
| Contradictions resolved into a single truth | 18 |
| Trust Score (avg confidence across the Brain) | **75%** |

- Example reconciliation — *Inventory Agent*: Risk/Knowledge/Continuity signals say HIGH, but Ownership/Dependency say LOW → Truth Layer resolves to **HIGH at 60% confidence** and flags the contradiction with its full evidence trail, instead of letting modules silently disagree.

### Architecture Layer A5 — Context Intelligence Layer — *Real-time executive context*

Packages live organizational context per scope (department/team) so every Executive Avatar interaction is situationally aware instead of generic. Each package carries the scope's assets, owners, tools, and active risk items.

**Sunrise Care:** 9 context packages built across 22 assets, surfacing 10 active risk items. Highest-pressure scope right now: **Sales**.

### Architecture Layer A6 — Voice Agent Context Layer — *Semantic foundation for voice*

The layer that lets a Voice Agent understand *which* entity a person means (entity + alias resolution) and answer organizational questions in natural language, grounded in the ontology.

**Sunrise Care:** 35 voice-resolvable entities with 76 name aliases mapped, and 9 ready-to-answer intents — e.g. *"Who owns the Lead Scoring Agent?"* → resolves the entity → *"Robert — and there is no backup owner, so it is a single point of failure."*

---
## Executive, Network & Prediction Intelligence (Modules 21–35)

These modules extend the 20 core modules into executive-facing, network-science, and prediction territory. Every module is documented **in strict sequence** — 21 through 35 here, then 36 through 55 in the next section — so nothing is missing. They run on the extended organizational dataset (history, incidents, decisions, external entities, and knowledge areas) and are exposed through the backend API. Each module names its lead engineer.

### Module 21 — Executive Avatar Intelligence — RETIRED 2026-09-02

A canned per-executive persona generator (a greeting string, an ownership list) — no real interaction logic. Its question is answered live today by `GET/POST /api/avatar/*`, a real gate-check and escalation system (`checkGate`/`detectActorCollision`), not this module.

---

### Module 22 — Voice Intelligence Engine — RETIRED 2026-09-02

A single canned spoken-summary template. Its question is answered live today by `GET/POST /api/voice/*`, which handles dozens of real natural-language intents over the live dataset, not this module.

---

### Module 23 — Executive Briefing Intelligence — RETIRED 2026-09-02

A generic brief assembled from other modules' prior output. Its question is answered live today by `GET /api/briefing/today`, which computes the top SPOF, most-overloaded owner, latest incident, documentation trend and pending-decision count live, not this module.

---

### Module 24 — Decision Support Intelligence — RETIRED 2026-09-02

A generic "is this decision supported" check, gated on the now-also-retired Truth module. Its question is answered live today by `GET /api/decision-support/*` (`decision_queue`, a real per-decision impact×urgency÷effort priority score with a driver breakdown), not this module.

---

### Module 25 — Organizational Health Intelligence — RETIRED 2026-09-02

A second, competing health formula. Its question is answered live today by `GET /api/health/*`, backed by `domain/derived.js`'s `orgHealth()` — the canonical five-dimension index this exact codebase already consolidated onto after finding multiple disagreeing formulas — not this module.

---

### Module 26 — Executive Memory Intelligence — RETIRED 2026-09-02

A thin per-executive ownership footprint, not real organizational memory. Its question is answered live today by `GET /api/executive-memory/*`, backed by `domain/derived.js` (repeat offenders, lessons, hero risks and bad decisions derived from `workflow_failures`/`decision_history`), not this module.

---

### Module 27 — Executive Context Intelligence — RETIRED 2026-09-02

A thin per-role scope assembler. Its question is answered live today by `GET /api/context/*` (`context_items`, the real "what matters right now" feed that also powers the dashboard), not this module.

---

### Module 28 — Universal Dependency Graph

**Live at:** `GET /api/intelligence/dependency-graph` (wired 2026-09-02) — full dependency adjacency, cycle detection, longest dependency chain, over the graph's unified `depends_on` edges.

Builds one dependency graph across the entire organization — agents, tools, workflows **and** people — not just agent-to-agent links.

**What it does:**
- Connects every entity type into a single directed graph
- Computes each node's blast radius (how many things depend on it)
- Finds the longest dependency chain in the organization
- Becomes the shared graph that Modules 34 and 35 reason over

**Sunrise Care findings:**
- 39 nodes connected by 58 dependency edges
- Longest dependency chain: 6 hops deep
- Highest blast-radius nodes are the most dangerous to lose

---

### Module 29 — Organizational Relationship Intelligence

**Live at:** `GET /api/intelligence/relationships` (wired 2026-09-02) — relationship-type distribution, collaboration link count, and entities with no relationships at all, across the whole graph.

Scores the *health* of every ownership/backup relationship, not just whether it exists.

**What it does:**
- Rates each relationship 0–100 based on backup presence and documentation
- Classifies each as `healthy / at risk / fragile`
- Counts fragile, single-link relationships that would break on one departure
- Tracks reciprocal backup links between people

**Sunrise Care findings:**
- Average relationship strength: 72/100
- 9 fragile relationships (single owner, no backup or docs)

---

### Module 30 — Knowledge Concentration Intelligence — RETIRED 2026-09-02

A flat asset count per owner (`ownershipConcentration()`), found redundant later the same day as the 27-module retirement below. Its question is answered live today by `GET /api/knowledge/intelligence`, backed by `domain/derived.js`'s `knowledgeConcentration()` — criticality-**weighted**, not a flat count — not this module. `analytics.js`'s `ownershipConcentration()` was deleted with it; nothing else called it.

---

### Module 31 — Organizational Ecosystem Intelligence

**Live at:** `GET /api/intelligence/ecosystem` (wired 2026-09-02) — internal vs. external entity census across every ontology type. Vendors/customers are external; `externalActors` is empty until W2 wires `data/company.json` in — see `backend/brain/README.md`'s "Known gaps".

Maps the full ecosystem — internal tools plus external vendors and platforms — and measures external dependency exposure.

**What it does:**
- Links external entities (OpenAI, Anthropic, GitHub, Supabase, Stripe, Slack) to the internal assets that rely on them
- Counts how many internal assets each external entity ultimately supports
- Flags critical external dependencies that have no alternative
- Surfaces external single points of failure outside the company's control

**Sunrise Care findings:**
- 6 external entities mapped against 5 internal tools
- 3 critical external dependencies identified

---

### Module 32 — Dependency Impact Intelligence
**Engineer:** Tahir · **Live at:** `GET /api/intelligence/dependency-impact` (wired 2026-09-02) — blast-radius ranking across every entity type, unlike the agent-only `GET /api/dependencies/agent-spofs`.

Simulates a failure at any node and walks the dependency graph (breadth-first, with impact decay) to reveal the full cascade blast radius, then ranks the organization's true single points of failure.

**What it does:**
- Injects a failure at any agent, tool, workflow, or person and propagates it through the dependency graph
- Applies an impact-decay factor at each hop so nearer victims count more than distant ones
- Aggregates the total blast radius per origin node
- Ranks every node to expose the organization's real single points of failure

---

### Module 33 — Dependency Evolution Intelligence — RETIRED 2026-09-02
**Engineer:** Tahir

Computed a current-state snapshot and labelled it a "trend" — the graph has no time dimension to actually diff against (see the brain's own README, "Known gaps"). Recording real change over time is BUILD_SPEC W5; until that exists, no module can honestly answer this question, including this one.

---

### Module 34 — Hidden Dependency Intelligence

**Live at:** `GET /api/intelligence/hidden-dependencies` (wired 2026-09-02) — transitive dependencies that are real but not directly declared; the "undocumented but real" question M28/M29 build on.

Surfaces indirect couplings that no single module can see on its own.

**What it does:**
- Detects transitive dependencies (A → B → C means A silently depends on C)
- Finds shared-resource coupling (assets sharing the same tool fail together)
- Finds shared-owner coupling (assets joined only through one person)
- Exposes second-order risk that looks safe in any single view

**Sunrise Care findings:**
- 18 hidden dependencies discovered across transitive, shared-resource, and shared-owner types
- Reveals couplings that ownership or dependency views alone would miss

---

### Module 35 — Organizational Network Intelligence

**Live at:** `GET /api/intelligence/network-centrality` (wired 2026-09-02) — all-entity-type degree centrality over the full Knowledge Graph. **Not** the same computation as `GET /api/network/centrality` (`routes/network.js`), which is people-only, ownership-derived centrality read straight from Supabase — named apart on purpose.

Applies network science to reveal who actually holds the organization together and where it bottlenecks.

**What it does:**
- Builds the people network from shared tools and backup relationships
- Computes centrality to find the most connected people
- Identifies the primary bottleneck through whom information flows
- Flags weakly-connected or isolated people

**Sunrise Care findings:**
- Primary bottleneck (highest centrality): **Robert**
- Confirms structural over-reliance on a small core of people

---
## Constitutional Intelligence, Automation & Meta-Brain (Modules 36–55)

From here the engine moves from analysis into **constitutional intelligence, deeper prediction, and organizational science**. The sequence continues unbroken — 36 through 55, nothing skipped in the numbering — but 10 codes in this range (M36, M38, M46, M48, M50, M51, M52, M53, M54, M55) were retired on 2026-09-02 (see `backend/brain/data/constitutional-modules.js`), on top of M47, retired 2026-08-24. Of this range, M37, M39–M45, and M49 (wired 2026-09-02) — 9 modules — are served live under `/api/intelligence/*` via the Node brain (`backend/brain/`). The two constitutional ordering rules this section used to describe — Truth (M46) gates the Advisor (M48), Meta-Brain (M55) runs last — were retired along with those three modules; see each module's entry below for what answers the same question live instead.

### Module 36 — Signal Intelligence — RETIRED 2026-09-02
**Engineer:** Kamran

A repackaging of M01's unowned-assets list and M03's SPOF list as a flat "signal feed" — no content beyond what those two already report. Its question is answered live today by `GET /api/context/feed`, a real curated priority feed (`context_items`), not this module.

### Module 37 — Pattern Intelligence
**Engineer:** Tahir

Detects recurring patterns across incidents and behavior, and classifies how regular each pattern is using the coefficient of variation (regular vs. sporadic).

**What it does:**
- Scans the incident and activity history for repeating event types and sequences
- Measures how regular each pattern is using the coefficient of variation (tight cadence vs. random spikes)
- Classifies every pattern as `REGULAR / PERIODIC / SPORADIC`
- Flags the recurring patterns most likely to strike again so leadership can pre-empt them

### Module 38 — Opportunity Intelligence — RETIRED 2026-09-02
**Engineer:** Kamran

A thin "zero dependents" check over systems/agents — one signal, no real leverage scoring. `GET /api/intelligence/opportunities` (still live) is `domain/analyses.js`'s dataset-derived `improvementOpportunities()`, a separate implementation that was never this module in the first place — see `backend/brain/README.md`'s note on the M36/M38/M39/M40/M46/M48/M54 code-collision this catalog already resolved once.

### Module 39 — Capability Intelligence
**Engineer:** Kamran · `GET /api/intelligence/capability`

Scores the organization's operating capability per department (ownership depth, documentation, backup coverage, tooling) to show where the org is strong and where it is thin.

**What it does:**
- Scores each department's operating capability across ownership depth, documentation, backup coverage, and tooling
- Rolls the four dimensions into a single capability index per department
- Ranks departments from strongest to thinnest so leadership sees where capacity is real vs. fragile
- Flags capability gaps that need hiring, cross-training, or documentation

### Module 40 — Strategic Alignment Intelligence
**Engineer:** Kamran · `GET /api/intelligence/alignment`

Measures how well day-to-day operations line up with stated priorities, computes an alignment index, and flags the areas that are drifting out of alignment.

**What it does:**
- Compares where effort and ownership actually sit against the organization's stated priorities
- Computes an alignment index (0–100) showing how tightly execution matches strategy
- Flags misaligned areas — critical priorities with thin coverage, or effort spent on low-priority work
- Gives leadership a clear "are we working on the right things?" read

### Module 41 — Organizational DNA Intelligence
**Engineer:** Tahir

Builds the organization's "DNA profile" across six dimensions (e.g. autonomy, documentation, resilience) — a fingerprint of how the organization actually operates.

**What it does:**
- Profiles the organization across six behavioral dimensions (autonomy, documentation, resilience, collaboration, ownership, adaptability)
- Builds a single "DNA fingerprint" that captures how the org actually operates, not how it claims to
- Highlights the dominant traits and the weakest strands in the DNA
- Gives leadership a baseline to track cultural and structural change over time

### Module 42 — Culture Intelligence
**Engineer:** Tahir

Scores organizational culture signals (documentation discipline, ownership behavior, collaboration) into a single culture-health read.

**What it does:**
- Reads culture signals from real behavior — documentation discipline, ownership follow-through, collaboration patterns
- Scores each signal and combines them into a single culture-health index
- Surfaces the cultural strengths to protect and the habits that create risk
- Turns "culture" from a vague feeling into a measured, trackable number

### Module 43 — Organizational Maturity Intelligence
**Engineer:** Tahir

Assesses overall organizational maturity across process, governance, and knowledge dimensions and places the org on a maturity curve.

**What it does:**
- Assesses maturity across process, governance, and knowledge dimensions
- Places the organization on a defined maturity curve (from ad-hoc to optimized)
- Identifies the specific gaps holding the org back from the next maturity stage
- Gives leadership a roadmap for structured improvement

### Module 44 — Organizational Behavior Intelligence
**Engineer:** Tahir

Profiles how each actor behaves (ownership load, resolution activity, documentation habits) to surface behavioral risk and strengths.

**What it does:**
- Profiles how each actor behaves — ownership load, incident-resolution activity, documentation habits
- Flags behavioral risk (over-reliance on one person, documentation avoidance) and behavioral strengths
- Ranks actors by their real contribution and exposure
- Helps leadership reward the right behavior and coach the risky patterns

### Module 45 — Benchmark Intelligence
**Engineer:** Tahir

Compares the organization's key metrics against industry baselines to show where it leads and where it lags.

**What it does:**
- Compares the organization's key metrics against industry baselines
- Shows exactly where the org leads and where it lags the benchmark
- Turns internal scores into external context leadership can act on
- Highlights the biggest gaps to close to reach industry-standard resilience

### Module 46 — Truth Intelligence *(formerly gated Module 48)* — RETIRED 2026-09-02
**Engineer:** Kamran

Verified the graph's own structural integrity plus a bus-derived package count that was always empty — self-referential, not an organizational answer. `GET /api/intelligence/truth` (still live) was never this module in the first place: it has always been `routes/truth/truth.js`'s real claims-verification system over the `truth_claims` table. This module had no endpoint of its own even before retirement.

### Module 47 — Continuous Learning Intelligence — RETIRED 2026-08-24
**Engineer:** Tahir

Its own constitutional question was *"How does the Brain improve continuously?"* — but it measured the software's own run history, not the organization. See [Four analyses were retired](#four-analyses-were-retired-2026-08-24) for the full reasoning; nothing depended on it.

### Module 48 — Autonomous Advisor — RETIRED 2026-09-02
**Engineer:** Kamran

Deduplicated other modules' `recommendations` arrays into a generic advice list, gated on the now-also-retired M46. `GET /api/intelligence/advisor` (still live) is `domain/analyses.js`'s dataset-derived `playbookAdvice()`, a separate implementation. The real, comprehensive recommendation engine is Module 04 above (`GET /api/intelligence/recommendations`), which this module never added to.

### Module 49 — Digital Twin Intelligence
**Engineer:** Tahir · **Live at:** `GET /api/intelligence/digital-twin` (wired 2026-09-02) — a full graph snapshot (every entity and relationship, plus stats); nothing else returns the whole graph in one call.

Builds a live digital-twin snapshot of the organization, computes a twin health index, simulates scenarios against the twin, and checks that the twin stays synchronized with reality.

**What it does:**
- Builds a live digital-twin snapshot of the whole organization
- Computes a twin health index that mirrors the real organization's state
- Runs scenarios against the twin without touching production reality
- Continuously checks that the twin stays synchronized with the real organization

### Module 50 — Organizational Brain Core Logic — RETIRED 2026-09-02
**Engineer:** Kamran

A mechanical listing of what ran and one finding per prior module — not weighted, not scored. `GET /api/intelligence/brain-core` (still live) was never this module in the first place: it has always been `routes/intelligence/brainCore.js`'s own 10-signal weighted fusion over `domain/derived.js`.

### Module 51 — Self-Healing Intelligence — RETIRED 2026-09-02
**Engineer:** Anusha

A generic issue list (unowned assets, SPOFs, isolated entities) with a canned action per issue type. `GET /api/self-healing/*` (still live) is a richer, `domain/derived.js`-backed system (real hero risks, workflow failures, tools without a configured backup), a separate implementation this module never fed.

### Module 52 — Governance Automation Intelligence — RETIRED 2026-09-02
**Engineer:** Anusha

Recomputed the same governance-coverage question Module 19 already answers — internal duplication within the catalog itself, not just overlap with SQL. `GET/POST /api/automation/governance` (still live) is a separate system (the `pending_decisions` approval queue), never this module.

### Module 53 — Continuity Automation Intelligence — RETIRED 2026-09-02
**Engineer:** Anusha

Read Module 18's own continuity score and added a generic "failover + backup owner" action per SPOF — near-total overlap with M18, not new analysis. `GET/POST /api/automation/continuity` (still live) is a separate system (tool backup-coverage counts), never this module.

### Module 54 — Simulation Universe — RETIRED 2026-09-02
**Engineer:** Kamran

Picked the top 5 highest-fan-in entities and computed a raw cascade count — no real health-delta. Its question is answered live today by `GET /api/simulations/rank`, `domain/simulations.js`'s `rankAllScenarios()` (every employee, every high/critical agent and platform, ranked by real health-delta), not this module.

### Module 55 — Organizational Intelligence Orchestrator (Meta-Brain) — RETIRED 2026-09-02
**Engineer:** Kamran

Fused prior modules' confidence and recommendations into one summary — a third fusion system alongside two that already exist and already ship. `GET /api/intelligence/orchestrator` (still live) is `routes/intelligence/orchestrator.js`'s own 13-module weighted fusion; `GET /api/intelligence/brain-core` is a second, independent one. Neither is this module.

> **What remains live from this range:** Module 37 (Tahir), 39 and 40 (Kamran), and 49 (Tahir, wired 2026-09-02) — served under `/api/intelligence/*`. Modules 36, 38, 46, 48, 50, 54, 55 were retired 2026-09-02; each had a richer, already-live answer elsewhere (see each entry above).
>
> **Automation layer (Anusha):** all three modules (51, 52, 53) were retired 2026-09-02 — 52 and 53 duplicated already-live brain modules (M19, M18), and 51 duplicated an already-live SQL system. The *detect → emit intent → Module 16 executes* pattern they described is not implemented by any live code today; `/api/automation/*` and `/api/self-healing/*` are read-only advisory views, not an intent/execution pipeline. Modules 15, 16, 21, and 23 (also Anusha) were retired for the same reason — see their entries above.

---
## Organizational Brain — analysis library (`backend/brain/`)

The analyses (M01–M55, 23 remaining after three retirement passes — see below) run over one shared
organizational Knowledge Graph built from Supabase. **It is a library, not a
service:** nothing is mounted, there is no `/api/brain`, and routes call it
directly.

```js
const brain = require('../../brain')
await brain.loadGraph()               // build from Supabase, swap in atomically
const intel = await brain.run('M42')  // one analysis + its dependencies
```

A 1,154-line constitutional runtime — execution engine, event bus, communication
layer, module and capability registries, brain state manager and an `/api/brain`
surface — was removed on 2026-08-24. Nothing consumed it. See
[the design document](docs/superpowers/specs/2026-08-24-brain-as-library-design.md).

### Knowledge layer (`backend/brain/knowledge/`)

| Component | File | Role |
|---|---|---|
| Graph Loader | `knowledge/graphLoader.js` | Supabase → graph. **The one place organizational data enters.** |
| Unified Knowledge Graph | `knowledge/knowledgeGraph.js` | Traversal, dependency paths, context search |
| Entity Registry | `knowledge/entityRegistry.js` | Every organizational object exists once |
| Relationship Registry | `knowledge/relationshipRegistry.js` | Relationships as first-class assets; no dangling edges |
| Intelligence Exchange | `knowledge/intelligenceExchange.js` | The package shape every analysis returns + confidence fusion |
| Ontology | `data/ontology.js` | One constitutional meaning per concept & relationship |
| Module catalog | `data/constitutional-modules.js` | Names, owners, dependencies |

### Library API (`backend/brain/index.js`)

| Function | Role |
|---|---|
| `loadGraph()` | Build from Supabase and swap in. Throws on failure, leaving the previous graph in place. |
| `setGraph(g)` | Use a pre-built graph (tests). `graphSource().live` stays `false`. |
| `graphSource()` | Provenance — **check this before trusting an answer** |
| `run(code, ctx)` | One analysis; its dependencies run first so `priorIntel` is populated |
| `runMany(codes, ctx)` | Several in constitutional order, plus a fused confidence |
| `resolveOrder(codes)` | The execution order, dependencies included |

### Four analyses were retired (2026-08-24)

M10 Organizational Memory, M12 Forecasting, M17 Organizational Learning and
M47 Continuous Learning all measured the **software**, not the organization —
they read a log of Brain runs. M47's own constitutional question was *"How does
the Brain improve continuously?"*. Every question they claimed is already
answered from real tables by `/api/learning` (`/failures`, `/decisions`),
`/api/forecast` and `/api/memory`. Nothing depended on them. **51 remained.**

### A further 27 analyses were retired (2026-09-02)

M05, M06, M08, M09, M11, M13, M14, M15, M16, M21, M22, M23, M24, M25, M26,
M27, M33, M36, M38, M46, M48, M50, M51, M52, M53, M54, M55 — audited against
the live SQL / `domain/derived.js` system already answering the same-sounding
question and found redundant with something richer and already shipping.
**24 remained.** See each module's entry above for what replaced it, and
`backend/brain/data/constitutional-modules.js`'s header for the full audit
notes (including that M52/M53 duplicated *other brain modules*, not just SQL).

### One more was retired later the same day (2026-09-02)

M30 Knowledge Concentration was found while auditing the 24 survivors for
*live wiring*, not just SQL duplication (see the next section). Its
`ownershipConcentration()` (a flat asset count per owner) is a strictly
weaker duplicate of `domain/derived.js`'s `knowledgeConcentration()`
(criticality-**weighted**), already live at `GET /api/knowledge/intelligence`
— the exact question M30 asks, answered richer. **23 remain.**

### Twelve modules were wired up to real new endpoints (2026-09-02)

The same audit that found M30 also checked the other 23 survivors for a live
route, not just for SQL duplication. Five had no route calling them at all —
M28, M29, M31, M34, M35 — now live at `GET /api/intelligence/{dependency-
graph,relationships,ecosystem,hidden-dependencies,network-centrality}`. A
further seven had a same-named or nearest-analogue SQL route that turned out
to answer a narrower or structurally different question: M01, M02, M03, M07,
M20 (see each module's entry above), M32
(`GET /api/intelligence/dependency-impact`) and M49
(`GET /api/intelligence/digital-twin`). Every one of these ten new routes is
covered by `backend/tests/realityRoutes.test.js` and verified live against
the real Supabase-backed graph. No frontend card consumes any of them yet.

### Prediction & Organizational Science — *Tahir* (`backend/brain/modules/implementations.js`)
The forward-looking and inward-looking intelligence that remains. Every module below consumes the shared Knowledge Graph and returns a real Intelligence Package (prediction/insight + confidence + evidence + recommended action) — no stubs.

| Module | Name | What it computes at runtime | Endpoint |
|---|---|---|---|
| M32 | Dependency Impact | Impact score & severity for every dependency; surfaces the highest-impact links | `/api/intelligence/dependency-impact` (2026-09-02) |
| M37 | Pattern | Structural anomalies — isolated nodes and over-connected hubs | `/api/intelligence/pattern` |
| M41 | Organizational DNA | Human vs. automation share and the org's structural orientation | `/api/intelligence/dna` |
| M42 | Culture | Collaboration vs. silo signals, including siloed people and transitional signals | `/api/intelligence/culture` |
| M43 | Organizational Maturity | Maturity dimensions, current level and the gap to the next level | `/api/intelligence/maturity` |
| M44 | Organizational Behavior | Dominant operating behavior and orientation | `/api/intelligence/behavior` |
| M45 | Benchmark | Four internal benchmarks fused into a single benchmark score | `/api/intelligence/benchmark` |
| M49 | Digital Twin | A live twin snapshot of the organization across all intelligence layers | `/api/intelligence/digital-twin` (2026-09-02) |

### Executive Experience & Autonomous Operations — *Anusha*

All seven of Anusha's modules (M15, M16, M21, M23, M51, M52, M53) were retired
2026-09-02 — each was redundant with a richer, already-live system (real
verification actions, real workflow-orchestration collision detection, a real
avatar gate-check/escalation system, a real daily briefing, and for the three
"automation" modules, two of them duplicated already-live brain modules M18
and M19 outright). The *detect → emit intent → execute* automation pattern
they described is not implemented by any live code today — `/api/automation/*`
and `/api/self-healing/*` are read-only advisory views. See each module's
entry above.

### Real logic — no stubs

Every one of the 23 remaining analyses has a **real implementation** in
`backend/brain/modules/implementations.js` that computes genuine intelligence
from the knowledge graph (ownership coverage, single points of failure,
dependency cascades, governance gaps, cycle detection, network centrality,
ecosystem composition). The two constitutional ordering rules this file used
to describe — Truth (M46) gates the Advisor (M48), Meta-Brain (M55) runs last
— were retired along with those three modules; see the retirement note above
for what answers each of those questions live instead.

Dependency ordering itself survived the runtime's removal and is still
exercised by `resolveOrder()`: `dependsOn` expresses real prerequisite
structure among the 23 modules that remain (e.g. M49 Digital Twin needs
M28+M29+M31, which resolve further down to M01/M02/M34). None of the 23
currently read `context.priorIntel` themselves — the six that did (M11, M23,
M24, M48, M50, M55) were retired along with it.

### Run & test

```bash
# All suites — no database needed except graphLoader.live, which self-skips
cd backend && npm test
```

```bash
# The API server; the graph loads asynchronously at startup
cd backend && npm start
```

The analyses are served under `/api/intelligence/*` (see
`routes/intelligence/prediction.js`). Until the graph finishes loading those
endpoints answer `503` — **nothing is ever served from stand-in data.**

### Verify

`npm test` is the proof. `brain.smoke.test.js` asserts all 23 analyses exist,
run without error, and order correctly (every dependency before its dependent),
against a fixture graph with no database. `intelligence.verify.test.js` runs
five end-to-end scenarios and checks each one's declared dependencies
actually ran first. `realityRoutes.test.js` boots the real routers and
verifies the twelve 2026-09-02 wire-ups end-to-end over HTTP.

Full details: see [`backend/brain/README.md`](backend/brain/README.md).

---

## Demo Results Summary

| Metric | Result |
|--------|--------|
| Total Agents Analyzed | 15 |
| CRITICAL Risk Agents | 5 |
| HIGH Risk Agents | 6 |
| Single Points of Failure (Agent) | 4 |
| Human Single Points of Failure | 1 (Robert) |
| Robert's Agents (zero backups) | 5 → all CRITICAL |
| Worst Scenario: Robert Leaves | Health Score: 56 → 49 |
| Organizational Health Score | **56/100 — AT RISK** |
| Institutional Memory Health Score | **54/100 — AT RISK** |
| Actionable Recommendations Generated | 12 |
| Total Coverage Gaps | 9 |
| Total Undocumented Assets | 13 |
| Total Knowledge Gaps | 15 |
| Total Monthly AI Tool Spend | $1,444 |
| Total Actions Verified (Module 15) | 36 |
| Total Workflow Collisions Detected (Module 16) | 17 |
| Total Decisions Audited (Module 14) | 27 |
| Decision Quality Index (Module 14) | **67/100 — MIXED** |
| Assets That Must Be Protected (Module 18) | 10 |
| Organizational Continuity Score (Module 18) | **63/100 — AT RISK** |
| Predicted Critical Threats (Module 11) | 4 |
| 90-Day Organizational Outlook (Module 12) | **52/100 — AT RISK** |
| AI Adoption / Human Dependency / Collaboration (Module 13) | 100 / 54 / 40 |
| Learning Maturity (Module 17) | **40/100 — EARLY STAGE** |
| Governance Score (Module 19) | **47/100 — AT RISK** |
| Accountability Score (Module 20) | **76/100 — WARNING** |
| Organizational Intelligence Score (Engine — Five Pillars) | **57/100 — WEAK** |
| Ontology Entities Registered (Layer A1) | 55 across 6 types |
| Relationships Mapped (Layer A2) | 138 |
| Reasoning Insights Generated (Layer A3) | 16 (9 CRITICAL) |
| Contradictions Resolved by Truth Layer (Layer A4) | 18 |
| Brain Trust Score (Layer A4) | **75%** |
| Context Packages Built (Layer A5) | 9 scopes |
| Voice-Resolvable Entities (Layer A6) | 35 (76 aliases) |
| Decision Queue (Module 24) | 19 prioritized |
| Organizational Health (Module 25) | **46/100 — WARNING (improving)** |
| Universal Dependency Graph (Module 28) | 39 nodes · 58 edges |
| Knowledge Bus Factor (Module 30) | **2** |
| Hidden Dependencies Found (Module 34) | 18 |

---
## How to Run

### 1 — Backend API (Node.js + Express + Supabase)

```bash
cd backend

# Install dependencies
npm install

# Start the server
node index.js
```

Server starts on **`http://localhost:3000`**

> ⚠️ Run backend commands from **inside the `backend/` folder** (`cd backend`). The repo root has no `package.json`, and `.env` must live in `backend/`. The server loads `backend/.env` by absolute path, so `node backend/index.js` from the repo root also works once dependencies are installed.

The **Organizational Brain** is a library, not a mounted service — watch for the
startup log line `Organizational Brain: graph loaded from Supabase`. Its analyses
are reached through `/api/intelligence/*`; until the graph finishes loading, those
endpoints answer `503` rather than serving stand-in data.

To verify the Brain on its own (no server, no Supabase needed):

```bash
cd backend && npm test
```

#### All API Endpoints

| Endpoint | Module | Description |
|----------|--------|-------------|
| `GET /api/agents` | 01 | All agents with ownership, risk level, and metadata |
| `GET /api/ownership` | 01 | Owners mapped to their agents with risk scores |
| `GET /api/dependencies` | 02 | Full dependency graph with cascade relationships |
| `GET /api/risks` | 03 | Composite risk score breakdown per agent |
| `GET /api/dashboard` | 03 | Executive summary: health score, critical counts, orphan count |
| `GET /api/human-agent-map` | 06 | Person → agents ownership tree with coverage scores |
| `GET /api/tools` | 07 | All AI tools with user counts and risk levels |
| `GET /api/tool-intelligence` | 07 | Tool risk analysis with department exposure |
| `GET /api/tool-impact` | 07 | Impact simulation: what breaks if a tool goes offline |
| `GET /api/workflows` | 08 | All workflows with step chains and risk scores |
| `GET /api/knowledge/intelligence` | 09 | Knowledge concentration scores per person |
| `GET /api/knowledge/impact` | 09 | Asset loss mapping per person departure |
| `GET /api/knowledge/gaps` | 09 | All undocumented assets with no backup |
| `GET /api/memory` | 10 | Institutional memory status per asset |
| `GET /api/simulations/employee-leaves` | 05 | Health Score impact when a person leaves |
| `GET /api/simulations/agent-fails` | 05 | Health Score impact when an agent fails |
| `GET /api/simulations/platform-down` | 05 | Health Score impact when a tool goes offline |
| `GET /api/simulations/workflow-disruption` | 05 | Health Score impact when a workflow breaks |
| `GET /api/predictive-risk/summary` | 11 | Predicted risk counts: critical, high, medium, emerging |
| `GET /api/predictive-risk/agents` | 11 | Per-agent predicted risk escalation with classification |
| `GET /api/predictive-risk/critical` | 11 | Only agents predicted to reach CRITICAL risk |
| `GET /api/predictive-risk/emerging` | 11 | Emerging threats detected before failure |
| `GET /api/predictive-risk/agent/:name` | 11 | Predicted risk detail for a single agent |
| `GET /api/forecast/summary` | 12 | 30/60/90-day organizational outlook summary |
| `GET /api/forecast/health` | 12 | Forecasted organizational health trajectory |
| `GET /api/forecast/memory` | 12 | Forecasted institutional memory trajectory |
| `GET /api/forecast/continuity` | 12 | Forecasted continuity / survival trajectory |
| `GET /api/forecast/outlook` | 12 | Overall organizational outlook score |
| `GET /api/collaboration/adoption` | 13 | AI adoption across the workforce |
| `GET /api/collaboration/dependency` | 13 | Human dependency concentration |
| `GET /api/collaboration/score` | 13 | Human-AI collaboration effectiveness score |
| `GET /api/collaboration/people` | 13 | Per-person collaboration profile |
| `GET /api/collaboration/departments` | 13 | Per-department collaboration breakdown |
| `GET /api/decisions/index` | 14 | Decision Quality Index |
| `GET /api/decisions/all` | 14 | All reconstructed decisions with quality scores |
| `GET /api/decisions/harmful` | 14 | Decisions scored as HARMFUL |
| `GET /api/decisions/trail/:id` | 14 | Full decision trail for one decision |
| `GET /api/decisions/recommendations` | 14 | Decision-improvement recommendations |
| `GET /api/verification/summary` | 15 | Total counts: completed, flagged, violations |
| `GET /api/verification/actions` | 15 | All tracked actions (human / agent / tool) |
| `GET /api/verification/flagged` | 15 | Only flagged / non-compliant actions |
| `GET /api/verification/actor/:name` | 15 | Verification record for a single actor |
| `GET /api/orchestration/summary` | 16 | Total counts: running, blocked, collisions |
| `GET /api/orchestration/workflows` | 16 | All workflow orchestration states |
| `GET /api/orchestration/collisions` | 16 | Detected actor collisions across workflows |
| `GET /api/orchestration/blocked` | 16 | Workflows currently blocked by shared resources |
| `GET /api/learning/summary` | 17 | Learning Maturity Score summary |
| `GET /api/learning/failures` | 17 | Failure patterns analyzed across the org |
| `GET /api/learning/decisions` | 17 | Learning signals derived from past decisions |
| `GET /api/learning/incidents` | 17 | Incident exposure history |
| `GET /api/learning/departments` | 17 | Per-department learning maturity |
| `GET /api/continuity/score` | 18 | Organizational continuity score |
| `GET /api/continuity/assets` | 18 | Asset survival: SURVIVES / DEGRADED / FAILS / LOST |
| `GET /api/continuity/risk-map` | 18 | Continuity risk map across assets |
| `GET /api/continuity/must-protect` | 18 | Critical assets that must be protected |
| `GET /api/continuity/plans` | 18 | Generated continuity plans for critical assets |
| `GET /api/governance/score` | 19 | Governance score |
| `GET /api/governance/assets` | 19 | Per-asset governance status |
| `GET /api/governance/heatmap` | 19 | Governance heatmap by department |
| `GET /api/governance/gaps` | 19 | Ownership and documentation gaps |
| `GET /api/governance/offenders` | 19 | Worst governance offenders |
| `GET /api/accountability/score` | 20 | Accountability score (RACI model) |
| `GET /api/accountability/entities` | 20 | RACI entities: Responsible / Accountable / Consulted / Informed |
| `GET /api/accountability/chains` | 20 | Accountability chains across the org |
| `GET /api/accountability/issues` | 20 | Accountability gaps and conflicts |
| `GET /api/avatar/escalations` | 21 | Executive-avatar escalation log |
| `GET /api/avatar/escalations/critical` | 21 | Critical escalations only |
| `GET /api/avatar/escalations/summary` | 21 | Escalation counts by severity + status |
| `POST /api/avatar/check` | 21 | Gate-check a workflow; auto-escalate on failure |
| `POST /api/voice/transcribe` | 22 | Transcribe text/audio into a transcript |
| `POST /api/voice/intent` | 22 | Parse a transcript into a structured intent |
| `GET /api/briefing/latest` | 23 | Full executive briefing (health + risks + recs) |
| `GET /api/briefing/risks` | 23 | Briefing risk summary |
| `GET /api/briefing/health` | 23 | Briefing org-health snapshot |
| `GET /api/briefing/recommendations` | 23 | Briefing action recommendations |
| `GET /api/self-healing/...` | 51 | Detect issues + emit healing intents to M16 |
| `GET /api/automation/governance/audit` | 52 | Detect governance violations |
| `POST /api/automation/governance/enforce` | 52 | Emit governance-enforcement intents to M16 |
| `GET /api/automation/continuity/risks` | 53 | Detect continuity risks |
| `POST /api/automation/continuity/plan` | 53 | Emit continuity-recovery intents to M16 |
| `GET /api/intelligence` | Phase 6 | Index of all Phase 6 endpoints |
| `GET /api/intelligence/signals` | 36 | Early-warning stability score + active signals |
| `GET /api/intelligence/opportunities` | 38 | Prioritised opportunity backlog + quick wins |
| `GET /api/intelligence/capability` | 39 | Capability index per department |
| `GET /api/intelligence/alignment` | 40 | Alignment index + misaligned areas |
| `GET /api/intelligence/truth` | 46 | Verified truths + data trust score |
| `GET /api/intelligence/advisor` | 48 | Recommendations from verified truths only |
| `GET /api/intelligence/brain-core` | 50 | Brain index + operating posture |
| `GET /api/intelligence/simulation-universe` | 54 | Ranked what-if scenarios + survivability |
| `GET /api/intelligence/orchestrator` | 55 | Organizational Intelligence Score + verdict |

#### Organizational Brain — graph endpoints (wired 2026-09-02)

Twelve modules found to have genuinely missing live capability during the 2026-09-02 audit, now exposed directly from the Knowledge Graph (`routes/intelligence/reality.js` and `routes/intelligence/prediction.js`) rather than from SQL. Each is named apart from its nearest same-sounding SQL endpoint above because it answers a broader or structurally different question — see each module's entry earlier in this document for why.

| Endpoint | Module | Description |
|----------|--------|-------------|
| `GET /api/intelligence/ownership-map` | 01 | Every asset across every asset type, owned or not — asset-first, unlike `GET /api/ownership` |
| `GET /api/intelligence/dependency-fanin` | 02 | Fan-in ranking + critical-dependency list over the graph's unified `depends_on` edges |
| `GET /api/intelligence/organizational-risk` | 03 | SPOF + critical-dependency risk score across every asset type, not just agents |
| `GET /api/intelligence/ai-agent-governance` | 07 | Per-agent owners/dependsOn/governedBy/supports, automation agents and platforms both |
| `GET /api/intelligence/reporting-chains` | 20 | Org-chart reporting structure (`reports_to`/`manages`) — not the RACI model at `/api/accountability/*` |
| `GET /api/intelligence/dependency-graph` | 28 | Full dependency adjacency, cycle detection, longest dependency chain |
| `GET /api/intelligence/relationships` | 29 | Relationship-type distribution, collaboration links, isolated entities |
| `GET /api/intelligence/ecosystem` | 31 | Internal vs. external entity census across every ontology type |
| `GET /api/intelligence/dependency-impact` | 32 | Blast-radius ranking across every entity type, not just agents |
| `GET /api/intelligence/hidden-dependencies` | 34 | Transitive dependencies that are real but not directly declared |
| `GET /api/intelligence/network-centrality` | 35 | All-entity-type degree centrality — not `GET /api/network/centrality` (people-only) |
| `GET /api/intelligence/digital-twin` | 49 | A full graph snapshot: every entity and relationship, plus stats |

No frontend card consumes any of these twelve yet — see `backend/tests/realityRoutes.test.js` for end-to-end verification, and each module's entry above for the audit reasoning.

#### Environment Setup

```bash
# 1. Copy the template
cp backend/.env.example backend/.env
```

Fill in your Supabase credentials in `backend/.env`:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_secret_key
PORT=3000
```

> `.env` is git-ignored and must never be committed to version control.

```bash
# 2. Create the database schema and load the seed data (run once, against
#    a brand-new empty database) — also needs DATABASE_URL in backend/.env,
#    see backend/DB_SETUP.md for the full walkthrough
cd backend
node run_migrations.js --dry-run   # preview — changes nothing
node run_migrations.js             # applies schema.sql, then every file in sql/, in order
```

Do **not** paste `schema.sql` or anything in `sql/` into the Supabase SQL
editor by hand — `run_migrations.js` is the only supported way to apply
them. It's the one path that records each file in a `schema_migrations`
ledger, which is what makes re-running it safe; hand-running
`01_schema_migration.sql` directly re-triggers its `DROP TABLE` across 42
tables with no ledger to stop it. See `backend/DB_SETUP.md` for the full
setup and its warnings before pointing this at anything that isn't an
empty database.

---

### 2 — Executive Frontend Dashboard

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Dashboard runs on **`http://localhost:3001`**

Also accessible on your local network at **`http://<your-ip>:3001`**

---

## Project Structure

```
OBA-Core-Horquva/
│
├── data/
│   └── company.json                           # The one company dataset (40 employees, 15 agents, 12 tools)
│
├── backend/
│   ├── index.js                               # Express server — all routes registered here
│   ├── supabase.js                            # Supabase client — loads backend/.env by absolute path (works from any working directory)
│   ├── schema.sql                             # Applied by run_migrations.js — see backend/DB_SETUP.md, never by hand
│   ├── run_migrations.js                      # The only supported way to apply schema.sql + sql/*.sql
│   ├── DB_SETUP.md                            # Full database setup walkthrough
│   ├── API_REFERENCE.md                       # Full endpoint reference for the frontend team
│   ├── package.json                           # Node.js dependencies
│   ├── .env.example                           # Environment variable template
│   ├── brain/                                 # Organizational Brain — analysis library over the Knowledge Graph
│   │   ├── index.js                           # loadGraph() / run() / runMany() — the whole public API
│   │   ├── README.md                          # Library documentation
│   │   ├── data/
│   │   │   ├── constitutional-modules.js      # Analysis catalog — 23 entries (code, name, owner, layer, dependsOn)
│   │   │   └── ontology.js                    # Entity + relationship types (shared organizational meaning)
│   │   ├── knowledge/
│   │   │   ├── graphLoader.js                 # Supabase → graph. The one place organizational data enters.
│   │   │   ├── knowledgeGraph.js              # Unified Organizational Knowledge Graph
│   │   │   ├── entityRegistry.js              # Single source of truth for entities
│   │   │   ├── relationshipRegistry.js        # Relationships as first-class assets
│   │   │   └── intelligenceExchange.js        # Intelligence Package format + confidence fusion
│   │   └── modules/
│   │       ├── analytics.js                   # Shared graph algorithms (SPOF, centrality, cycles)
│   │       └── implementations.js             # All 23 analyses
│   └── routes/
│       ├── agents.js                          # /api/agents
│       ├── ownership.js                       # /api/ownership
│       ├── dependencies.js                    # /api/dependencies
│       ├── risks.js                           # /api/risks
│       ├── dashboard.js                       # /api/dashboard
│       ├── humanAgentMap.js                   # /api/human-agent-map
│       ├── tools.js                           # /api/tools
│       ├── toolIntelligence.js                # /api/tool-intelligence
│       ├── toolImpact.js                      # /api/tool-impact
│       ├── simulations/
│       │   ├── employeeLeaves.js              # /api/simulations/employee-leaves
│       │   ├── agentFails.js                  # /api/simulations/agent-fails
│       │   ├── platformDown.js                # /api/simulations/platform-down
│       │   └── workflowDisruption.js          # /api/simulations/workflow-disruption
│       ├── workflows/
│       │   ├── index.js                       # /api/workflows
│       │   ├── intelligence.js
│       │   ├── failures.js
│       │   └── spof.js
│       ├── knowledge/
│       │   ├── intelligence.js                # /api/knowledge/intelligence
│       │   ├── impact.js                      # /api/knowledge/impact
│       │   └── gaps.js                        # /api/knowledge/gaps
│       ├── memory/
│       │   └── memory.js                      # /api/memory
│       ├── predictive/
│       │   └── predictiveRisk.js              # /api/predictive-risk (Module 11)
│       ├── forecast/
│       │   └── forecast.js                    # /api/forecast (Module 12)
│       ├── collaboration/
│       │   └── collaboration.js               # /api/collaboration (Module 13)
│       ├── decisions/
│       │   └── decisions.js                   # /api/decisions (Module 14)
│       ├── verification/
│       │   └── index.js                       # /api/verification (Module 15 — Anusha)
│       ├── orchestration/
│       │   ├── index.js                       # /api/orchestration (Module 16 — Anusha)
│       │   ├── intentReceiver.js              # Receives intents from M51/M52/M53
│       │   └─�� executionEngine.js             # Executes governed intents by mode
│       ├── learning/
│       │   └── learning.js                    # /api/learning (Module 17)
│       ├── continuity/
│       │   ├── continuity.js                  # /api/continuity (Module 18 — Kamran, read)
│       │   ├── index.js                       # /api/automation/continuity (Module 53 — Anusha)
│       │   └── continuityEngine.js            # Continuity risk detection + recovery intents
│       ├── governance/
│       │   ├── governance.js                  # /api/governance (Module 19 — Kamran, read)
│       │   ├── index.js                       # /api/automation/governance (Module 52 — Anusha)
│       │   └── governanceEngine.js            # Policy-violation detection + enforcement intents
│       ��── accountability/
│       │   └── accountability.js              # /api/accountability (Module 20)
│       ├── avatar/
│       │   ├── index.js                       # /api/avatar (Module 21 — Anusha)
│       │   ├── gateCheck.js                   # Workflow gate-check logic
│       │   └── escalate.js                    # Escalation logging
│       ├── briefing/
│       │   ├── index.js                       # /api/briefing (Module 23 — Anusha)
│       │   ├── briefingEngine.js              # Builds the executive briefing
│       │   └── recommendations.js             # Briefing recommendations
│       ├── selfHealing/
│       │   ├── index.js                       # /api/self-healing (Module 51 — Anusha)
│       │   └── healingEngine.js               # Issue detection + healing intents to M16
│       ├── voice/
│       │   ├── index.js                       # /api/voice (Module 22 — Huzaifa)
│       │   ├── stt.js                         # Speech-to-text transcription
│       │   └── intentParser.js                # Transcript → structured intent
│       └── intelligence/
│           ├── constitutional.js              # /api/intelligence/{signals,opportunities,capability,alignment,advisor,simulation-universe} (dataset-derived)
│           ├── prediction.js                  # /api/intelligence/{pattern,dna,culture,maturity,behavior,benchmark,ownership-coverage,capability-inventory,continuity,governance,recommendations,dependency-impact,digital-twin,graph/*} (graph-derived)
│           ├── reality.js                     # /api/intelligence/{ownership-map,reporting-chains,dependency-fanin,organizational-risk,ai-agent-governance,dependency-graph,relationships,ecosystem,hidden-dependencies,network-centrality} — wired 2026-09-02
│           ├── _graphEndpoint.js               # Shared GET-one-analysis handler used by prediction.js + reality.js
│           ├── brainCore.js                   # /api/intelligence/brain-core — 10-signal weighted fusion
│           └── orchestrator.js                 # /api/intelligence/orchestrator — 13-signal weighted fusion
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx                         # Shell: persistent sidebar navigation
│   │   ├── globals.css                        # Design system, tokens, dark theme
│   │   ├── page.tsx                           # Screen 1: Executive Dashboard
│   │   ├── ownership/page.tsx                 # Screen 2: Ownership Intelligence
│   │   ├── risk/page.tsx                      # Screen 3: Risk Intelligence
│   │   ├── map/page.tsx                       # Screen 4: Dependency Map
│   │   ├── simulation/page.tsx                # Screen 5: What-If Simulation
│   │   └── recommendations/page.tsx           # Screen 6: Recommendations
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx                    # Navigation sidebar (6 routes)
│   │   │   └── Topbar.tsx                     # Top navigation bar
│   │   ├── dashboard/
│   │   │   ├── KpiStrip.tsx                   # Key metrics strip
│   │   │   ├── Heatmap.tsx                    # Agent risk heatmap
│   │   │   ├── RiskSplit.tsx                  # Risk tier distribution chart
│   │   │   └── AgentTable.tsx                 # Full agent data table
│   │   ├── ownership/
│   │   │   ├── OwnershipOverview.tsx          # Ownership summary panel
│   │   │   ├── ConcentrationBar.tsx           # Owner concentration bar chart
│   │   │   ├── OwnershipList.tsx              # Per-owner agent list
│   │   │   ├── HumanDependencyRisks.tsx       # Human SPOF indicators
│   │   │   ├── DependencyPipeline.tsx         # Dependency pipeline view
│   │   │   └─�� OrgRelationshipMap.tsx         # Org-level relationship map
│   │   ├── risk/
│   │   │   ├── RiskHeader.tsx                 # Risk page header with health score
│   │   │   ├── OrgHealthBanner.tsx            # Org Health Score banner
│   │   │   ├── CriticalRiskPanel.tsx          # CRITICAL agents panel
│   │   │   └── RiskScoreTable.tsx             # Full risk score table
│   │   ├── map/
│   │   │   ├── FlowCanvas.tsx                 # Interactive dependency flow diagram
│   │   │   ├── CustomNodes.tsx                # Custom node renderers
│   │   │   ├── DependencyKPIs.tsx             # Dependency KPI cards
│   │   │   └── DependencyTable.tsx            # Dependency data table
│   │   ├── simulation/
│   │   │   ├── SimulationDashboard.tsx        # Simulation control panel
│   │   │   ├── ScenarioRanking.tsx            # Scenarios ranked by impact
│   │   │   └── ImpactSummary.tsx              # Before/after impact summary
│   │   └── recommendations/
│   │       ├── RecommendationHeader.tsx       # Recommendations page header
│   │       ├── Top5Urgent.tsx                 # Top 5 urgent actions
│   │       ├── RecommendationList.tsx         # Full recommendations list
│   │       └── DemoSummary.tsx                # Final demo summary panel
│   ├── lib/
│   │   ├── data.ts                            # Server-side JSON data loader
│   │   ├── graph.ts                           # Graph traversal and cascade logic
│   │   ├── risk.ts                            # Risk scoring utilities
│   │   ├── simulation.ts                      # What-If scenario engine (TS)
│   │   └── recommendations.ts                 # Recommendation generation logic
│   └── types/
│       └── index.ts                           # TypeScript type definitions
│
├── Images/                                    # All module output screenshots
├── HOWTO_RUN_AND_CHECK.md                     # How to run the engine, start the backend, and verify every route
├── INTEGRATION_STATUS.md                      # Team ownership, integration decisions, and verification results
└── uv.lock                                    # Locked Python dependency versions
```

---

## Full Tech Stack

| Layer | Component | Technology |
|-------|-----------|-----------|
| Intelligence Engine | Core Logic | Python 3.13 |
| Intelligence Engine | Package Manager | uv |
| Intelligence Engine | Terminal Output | rich |
| Intelligence Engine | Data Format | JSON |
| Backend | Server Framework | Node.js + Express 5 |
| Backend | Database | Supabase (PostgreSQL) |
| Backend | DB Client | @supabase/supabase-js |
| Backend | Environment | dotenv |
| Frontend | Framework | Next.js 16 (Turbopack) |
| Frontend | Language | TypeScript |
| Frontend | Styling | Tailwind CSS v4 |
| Frontend | Charts | Recharts |
| Frontend | Icons | Lucide React |
| Both | Version Control | GitHub |

---

## Module Engineering

| Module | Name | Lead Engineer |
|--------|------|---------------|
| Module 01 | Ownership Intelligence | Huzaifa |
| Module 02 | Dependency Intelligence | Huzaifa |
| Module 03 | Risk Intelligence | Huzaifa |
| Module 04 | Recommendation Engine | Kamran |
| Module 05 | What-If Simulation Engine | Kamran |
| Module 06 | Human-Agent Dependency Map | Kamran |
| Module 07 | AI Tool Intelligence | Huzaifa |
| Module 08 | Workflow Intelligence | Huzaifa |
| Module 09 | Knowledge Risk Intelligence | Kamran |
| Module 10 | Organizational Memory Intelligence | Kamran |
| Module 11 | Predictive Risk Intelligence | Tahir |
| Module 12 | Organizational Forecasting Intelligence | Tahir |
| Module 13 | Human-AI Collaboration Intelligence | Tahir |
| Module 14 | Decision Intelligence | Kamran |
| Module 15 | Verification Intelligence | Anusha |
| Module 16 | Workflow Orchestration Intelligence | Anusha |
| Module 17 | Organizational Learning Intelligence | Tahir |
| Module 18 | Organizational Continuity Intelligence | Kamran |
| Module 19 | Governance Intelligence | Huzaifa |
| Module 20 | Accountability Intelligence | Huzaifa |
| Phase 2 | Intelligence Platform Foundation | Huzaifa |
| Phase 2 | Organizational Intelligence Engine (Five Pillars Integration) | Kamran |
| Layer A1 | Ontology Layer (Defines What Exists) | Huzaifa |
| Layer A2 | Relationship Layer (Defines How Everything Connects) | Huzaifa |
| Layer A3 | Reasoning Layer (Turns Signals Into Understanding) | Kamran |
| Layer A4 | Truth Layer (One Organizational Truth) | Kamran |
| Layer A5 | Context Intelligence Layer (Real-Time Executive Context) | Huzaifa |
| Layer A6 | Voice Agent Context Layer (Semantic Foundation for Voice) | Huzaifa |
| Module 21 | Executive Avatar Intelligence | Anusha |
| Module 22 | Voice Intelligence Engine | Huzaifa |
| Module 23 | Executive Briefing Intelligence | Anusha |
| Module 24 | Decision Support Intelligence | Kamran |
| Module 25 | Organizational Health Intelligence | Kamran |
| Module 26 | Executive Memory Intelligence | Kamran |
| Module 27 | Executive Context Intelligence | Kamran |
| Module 28 | Universal Dependency Graph | Huzaifa |
| Module 29 | Organizational Relationship Intelligence | Huzaifa |
| Module 30 | Knowledge Concentration Intelligence | Kamran |
| Module 31 | Organizational Ecosystem Intelligence | Huzaifa |
| Module 32 | Dependency Impact Intelligence | Tahir |
| Module 33 | Dependency Evolution Intelligence | Tahir |
| Module 34 | Hidden Dependency Intelligence | Huzaifa |
| Module 35 | Organizational Network Intelligence | Huzaifa |
| Module 36 | Signal Intelligence | Kamran |
| Module 37 | Pattern Intelligence | Tahir |
| Module 38 | Opportunity Intelligence | Kamran |
| Module 39 | Capability Intelligence | Kamran |
| Module 40 | Strategic Alignment Intelligence | Kamran |
| Module 41 | Organizational DNA Intelligence | Tahir |
| Module 42 | Culture Intelligence | Tahir |
| Module 43 | Organizational Maturity Intelligence | Tahir |
| Module 44 | Organizational Behavior Intelligence | Tahir |
| Module 45 | Benchmark Intelligence | Tahir |
| Module 46 | Truth Intelligence (gates M48) | Kamran |
| Module 47 | Continuous Learning Intelligence | Tahir |
| Module 48 | Autonomous Advisor | Kamran |
| Module 49 | Digital Twin Intelligence | Tahir |
| Module 50 | Organizational Brain Core Logic | Kamran |
| Module 51 | Self-Healing Intelligence | Anusha |
| Module 52 | Governance Automation Intelligence | Anusha |
| Module 53 | Continuity Automation Intelligence | Anusha |
| Module 54 | Simulation Universe | Kamran |
| Module 55 | Organizational Intelligence Orchestrator (Meta-Brain) | Kamran |

> **Implementation (`backend/brain/`).** The table above is the original constitutional design (all 55 codes, as assigned); it is a historical registry, not a current-status list. **23 analyses run live today** over one shared Knowledge Graph, documented in the **Organizational Brain — analysis library** section — every one has a **real, graph-derived implementation** in `backend/brain/modules/implementations.js`, with **no stub responses**. 32 codes were retired across three passes (2026-08-24, then two passes on 2026-09-02) because a richer, already-live SQL/`domain/derived.js` system already answered the same question — see each module's entry above. Active ownership: **Huzaifa** — Knowledge layer, 11 modules (`backend/brain/knowledge/`); **Kamran** — core reasoning, 4 modules (M04, M18, M39, M40); **Tahir** — Prediction & Organizational Science, 8 modules (M32, M37, M41–M45, M49); **Anusha's** entire layer (M15, M16, M21, M23, M51, M52, M53) was retired 2026-09-02.

---

## Phase 6 — Constitutional Intelligence & Meta-Brain (Master Registry M01–M55, LOCKED)

> The **Master Module Registry (M01–M55)** is the **single source of truth** for OBA Core. Module definitions are locked — no renaming, merging, or duplication.

Phase 6 completes Kamran's constitutional modules. These build on the truth-before-recommendation principle: **M46 (Truth) verifies before M48 (Advisor) recommends**, and **M55 (Orchestrator)** fuses everything and is run **last**.

> **M46, M48 and M55 were retired 2026-09-02** — each had a richer, already-live answer elsewhere (`truth.js`'s real claims-verification system, M04's recommendation engine, and two existing fusion systems, `orchestrator.js` and `brainCore.js`). The paragraph above describes the original Phase 6 constitutional design, not current runtime behavior — see each module's entry earlier in this document and `backend/brain/README.md`'s "Known gaps" for what replaced each one.

### New modules (Kamran)

| Module | Name | Layer | Owner |
|--------|------|-------|-------|
| Module 36 | Signal Intelligence | Intelligence | Kamran |
| Module 38 | Opportunity Intelligence | Intelligence | Kamran |
| Module 39 | Capability Intelligence | Intelligence | Kamran |
| Module 40 | Strategic Alignment Intelligence | Intelligence | Kamran |
| Module 46 | Truth Intelligence (gates M48) | Truth | Kamran |
| Module 48 | Autonomous Advisor | Simulation | Kamran |
| Module 50 | Organizational Brain Core Logic | Truth | Kamran |
| Module 54 | Simulation Universe | Simulation | Kamran |
| Module 55 | Organizational Intelligence Orchestrator (Meta-Brain) | Meta-Brain | Kamran |

### Assignment summary (M01–M55 catalog, original design — 51 total below)

This is the original full-catalog assignment as first designed, kept as a historical record (module definitions are locked; retiring a code doesn't reassign it). For which of these 51 are actually **active** today, see the "four intelligence layers" table near the top of this document, or the numbers in parentheses here:

| Engineer | Modules (original assignment) | Total | Active today |
|----------|---------|-------|-------|
| Muhammad Huzaifa | M01, M02, M03, M07, M08, M19, M20, M22, M28, M29, M31, M34, M35 | 13 | 11 |
| Kamran | M04, M05, M06, M09, M14, M18, M24, M25, M26, M27, M30, M36, M38, M39, M40, M46, M48, M50, M54, M55 | 20 | 4 |
| Muhammad Tahir | M11, M13, M32, M33, M37, M41, M42, M43, M44, M45, M49 | 11 | 8 |
| Anusha | M15, M16, M21, M23, M51, M52, M53 | 7 | 0 |

### Running the Phase 6 modules

23 analyses run live inside the Node backend today (M36, M38, M46, M48, M50, M54, M55 of the original Phase 6 set were retired 2026-09-02 — see above) — see **How to Run** above. There is no separate CLI.

### Phase 6 backend endpoints

Of the original Phase 6 modules, M39 and M40 remain live under `/api/intelligence/*` (see the **All API Endpoints** table above); M36, M38, M46, M48, M50, M54, M55 were retired 2026-09-02, each replaced by a richer, already-live system named at each module's entry earlier in this document — the `GET /api/intelligence/signals`/`/opportunities`/`/truth`/`/advisor`/`/brain-core`/`/simulation-universe`/`/orchestrator` endpoints in the table above are those replacements, not those modules' own logic. Verification steps are in **`backend/brain/README.md`** and **`HOWTO_RUN_AND_CHECK.md`**.

---

### Contribution & Review Process
All development on the OBA Core platform follows a centralized review workflow. Every team member's work — across the AI, Backend, and Frontend teams — is first submitted to Kamran Ai Engineer(Technical Lead) for review. Each member's files and modules are reviewed, validated, and integrated by Kamran to ensure constitutional consistency, code quality, and architectural alignment across all 23 active analyses. Only after this review are the changes pushed to the GitHub main branch. This process guarantees that every contribution meets the project's engineering standards and preserves a single, unified source of truth.

---
### Release
**This repository represents the MVP release of Horquva Organizational Brain Analysis (OBA) Core, delivering the 23-analysis constitutional engine, integrated backend APIs, and the executive frontend dashboard.**
