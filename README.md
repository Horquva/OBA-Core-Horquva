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
| Intelligence Engine | Node.js · Knowledge Graph | 51 analyses over one organizational graph built from Supabase |
| Backend API | Node.js · Express · Supabase | REST API serving all intelligence data |
| Executive Dashboard | Next.js 16 · TypeScript · Tailwind · Recharts | Interactive visualization for leadership |

---

## System at a Glance — How Everything Fits Together

Read this section first. It explains the entire OBA Core system in plain language — what it is, how a question travels through it, who builds each part, and the vocabulary used everywhere else in this document. Everything after this section is detail.

### The big idea

Every modern organization runs on a hidden web of people, AI agents, tools, workflows, and knowledge. When one node fails — a key person leaves, an agent breaks, a tool goes offline — the damage cascades in ways nobody can see in advance. **OBA Core turns that invisible web into a living map and reasons on top of it**, so leadership can ask plain questions ("What are our biggest risks?", "What breaks if Robert leaves?") and get verified, prioritized answers in seconds.

It does this with **51 constitutional analyses** that do not run as 51 disconnected scripts. They run over **one shared Organizational Knowledge Graph** in a common package format, in dependency order, fusing into a single executive answer. (The catalog is numbered M01–M55; four were retired — see the Organizational Brain section.)

### How a single question flows through the system

1. **A question enters** — from an executive, the dashboard, or an API call (e.g. *"What are our biggest organizational risks?"*).
2. **The Knowledge Graph is the ground truth** — every person, system, AI agent, tool, and workflow exists exactly once, with all relationships mapped.
3. **Capability discovery** — the runtime finds *which* modules can answer, instead of hard-wiring calls between them.
4. **Dependency ordering** — modules are sorted into a constitutional execution order so each one runs after the intelligence it depends on.
5. **Modules execute** — each returns a standard Intelligence Package: a result, a confidence score, supporting evidence, and recommended actions.
6. **Truth gate** — the Truth module (M46) verifies findings; the Autonomous Advisor (M48) is *not allowed* to recommend on unverified truth.
7. **The Meta-Brain fuses everything** — the Orchestrator (M55) always runs **last**, merging every module's intelligence into one prioritized executive answer with a single fused confidence.

```
            Executive question
                   │
                   ▼
        ┌───────────────────────┐
        │   Knowledge Graph     │  entities + relationships (one shared truth)
        └───────────┬───────────┘
                   ▼
        Capability discovery  →  which modules can answer?
                   │
                   ▼
        Dependency ordering   →  constitutional run order
                   │
                   ▼
        51 analyses execute   →  result + confidence + evidence each
                   │
                   ▼
        Truth (M46) gate      →  advice withheld unless verified
                   │
                   ▼
        Meta-Brain (M55)      →  fuses everything, runs LAST
                   │
                   ▼
         Single executive answer  (fused confidence + recommendations)
```

### The four intelligence layers — who builds what

The 51 analyses are owned by four engineers, each responsible for one layer of the Brain:

| Layer | Lead engineer | Modules | What it delivers |
|---|---|---|---|
| **Knowledge Platform** | **Huzaifa** (13) | M01, M02, M03, M07, M08, M19, M20, M22, M28, M29, M31, M34, M35 | Discovery + memory: registries, entities, relationships, the Knowledge Graph and ontology — the shared truth every other module reads from |
| **Core Reasoning & Meta-Brain** | **Kamran** (20) | M04, M05, M06, M09, M14, M18, M24, M25, M26, M27, M30, M36, M38, M39, M40, M46, M48, M50, M54, M55 | The engine that boots the Brain, routes every call, orders modules, enforces the constitutional rules, and fuses all intelligence via the Meta-Brain |
| **Prediction & Org Science** | **Tahir** (11) | M11, M13, M32, M33, M37, M41, M42, M43, M44, M45, M49 | Looks forward and inward: predictive risk, forecasting, patterns, culture, maturity, benchmarks, continuous learning and the organizational digital twin |
| **Executive Experience & Autonomous Ops** | **Anusha** (7) | M15, M16, M21, M23, M51, M52, M53 | The executive-facing surface + autonomy: verification, workflow orchestration, avatar & briefings, and self-healing / governance / continuity automation |

### Supporting teams

| Area | Team | Responsibility |
|---|---|---|
| Backend infrastructure | **Fizza & Shawal** | Node.js + Express API and Supabase persistence; the routes that serve all intelligence to the dashboard |
| Executive dashboard (frontend) | **Frontend team** | Next.js 16 + TypeScript + Tailwind + Recharts visualization for leadership |
| Architecture, integration & review | **Kamran** (Technical Lead) | Owns the Brain runtime and integrates every engineer's work into one constitutional source of truth |

### Key concepts (glossary)

| Term | Meaning |
|---|---|
| **Analysis (M01–M55)** | A single unit of organizational intelligence. Four were retired 2026-08-24; the rest keep their codes |
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
| Constitutional analyses | **51** (M01–M55 catalog, four retired) |
| Engineering owners | **4** — Huzaifa 13 · Kamran 21 · Tahir 14 · Anusha 7 |
| Runtime files (`backend/brain/`) | 21 JavaScript modules |
| Live knowledge graph | 157 entities · 423 relationships, built from Supabase on every boot — the synthetic 16-entity/24-relationship seed graph was deleted with `graphSeeder.js` (see `knowledge/graphLoader.js`'s own header) |
| Stub responses | **0** — every module computes real graph-derived intelligence |

---

## Intelligence Modules — Phase 1 (Modules 01–20)

> **On the "Sunrise Care findings" callouts below.** These are illustrative output captured during early development against a demo dataset ("Sunrise Care") that has since been retired — the live app now runs against a different seed company (`data/company.json`, wired in through `backend/sql/`), and none of the specific names, counts or scores quoted below still match what the running system reports. They're kept because they show *what each module's output looks like and how it reasons* — the formulas, thresholds and status vocabulary next to each one are current. For real, current numbers, run the app (`How to Run` below) or call the live API directly; treat every number under a "Sunrise Care findings" heading as historical illustration, not a current fact about this deployment.

### Module 01 — Ownership Intelligence
![Module 01 Output](Images/agent_summary.png)

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

### Module 05 — What-If Simulation Engine
![Module 05 Output](Images/what_ifl.png)

Simulates every possible disruption scenario and calculates its exact impact on organizational health before it happens.

**What it does:**
- Simulates every owner leaving the organization (one by one)
- Simulates every CRITICAL/HIGH/SPOF agent failing
- Recalculates the Organizational Health Score for each scenario in real time
- Shows before → after risk level for every affected agent
- Ranks all scenarios from most dangerous to least — so leadership knows exactly where fragility lives

**Simulation logic:**
- **Person Leaves** → their agents lose primary ownership (+35 risk each), Health Score recalculated
- **Agent Fails** → failed agent reaches maximum risk (score 170), all cascade victims receive +30 risk penalty

**Sunrise Care findings:**
- **Worst scenario: Robert leaves → Health Score collapses from 56 → 49**
- 5 agents become immediately unmanaged if Robert is unavailable
- Worst agent scenario: Onboarding Agent failure drops Health Score to 47
- Every scenario ranked so leadership can prioritize risk mitigation investment

---

### Module 06 — Human-Agent Dependency Map
![Module 06 Output](Images/ai_human_mapping.png)

Maps every person in the organization to the agents they control and scores human-level coverage risk.

**What it does:**
- Builds a complete ownership tree per person: which agents they own, at what risk level
- Calculates a coverage score per person: what % of their agents have backup owners
- Identifies Human SPOFs: individuals who own 3+ agents with no backup coverage anywhere
- Lists every coverage gap across the organization with exact agent names

![Human-Agent Map Summary](Images/Human_map_summary.png)

**Sunrise Care findings:**
- **Robert = Human SPOF** — 5 agents owned, 0% coverage, all CRITICAL or HIGH risk
- Sarah = 100% coverage — all 3 of her agents have backup owners
- 9 total coverage gaps identified across the organization
- 7 agents have a primary owner but zero backup coverage

---

### Module 07 — AI Tool Intelligence
![Module 07 Output](Images/Module_07.png)

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

### Module 08 — Workflow Intelligence
![Module 08 Output](Images/Module_08.png)

Maps every business workflow step by step — Human → Tool → Agent → Outcome — and scores failure risk at each node.

**What it does:**
- Visualizes every workflow as a full sequential chain with named actors at each step
- Scores each workflow for risk: ownership gaps, undocumented status, human SPOF dependency
- Identifies single-node failure points — the one person or tool whose removal collapses the entire workflow
- Surfaces workflows with no runbook, no backup owner, and no recovery path

**Sunrise Care findings:**
- 2 CRITICAL workflows: Lead Generation (Robert, no backup, undocumented) and IT Operations (David, no backup, undocumented)
- All 7 workflows have exactly one human dependency — no workflow survives its owner leaving
- 14 single-node failure points identified across all workflows
- 3 workflows have zero documentation: Lead Generation, IT Operations, Analytics Reporting

---

### Module 09 — Knowledge Risk Intelligence
![Module 09 Output](Images/Module_09.png)

Maps where critical organizational knowledge is stored — in people's heads — and calculates what disappears if they leave.

**What it does:**

![](Images/Module_09(1).png)

- Calculates a Knowledge Concentration Score per person (0–100%)
- Identifies sole knowledge holders: people who are the only ones who know how a critical asset works
- Lists every undocumented agent, workflow, and AI tool across the organization
- Maps exactly which assets are unrecoverable if a specific person leaves today
- Surfaces knowledge gaps: assets with no documentation AND no backup owner

**Sunrise Care findings:**
- Robert = CRITICAL knowledge concentration (100%) — sole owner of 5 agents + 1 workflow, all undocumented
- Mike and Lisa = HIGH concentration risk (64% and 54%)
- 13 total undocumented assets across agents, workflows, and tools
- If Robert leaves today: 6 assets are permanently unrecoverable with no documentation and no backup

---

### Module 10 — Organizational Memory Intelligence — RETIRED 2026-08-24

Measured the software's own run history, not the organization — see [Four analyses were retired](#four-analyses-were-retired-2026-08-24) for the full reasoning. Its question is answered live today by `GET /api/memory/health`, backed by `domain/derived.js`'s `orgMemory()`, not this module.

---

### Module 11 — Predictive Risk Intelligence

Predicts which agents are *likely* to escalate to high/critical risk in the near future and surfaces emerging threats before they happen — an explainable, weighted ML-style risk model.

**What it does:**
- Scores every agent on a forward-looking risk model using current criticality, dependency exposure, owner/backup coverage, AI-tool (platform) health, and critical-workflow membership
- Classifies each agent's predicted threat: `LOW / MEDIUM / HIGH / CRITICAL`
- Flags emerging threats — agents not critical today but predicted to become critical
- Gives a plain-English reason list per agent for full explainability

**Sunrise Care findings:**
- 4 agents predicted at CRITICAL threat, 2 at HIGH, 8 at MEDIUM
- Heavy dependency exposure + missing backups are the top escalation drivers
- Orphaned agents (Inventory, Data Backup) carry the highest predicted risk

---

### Module 12 — Organizational Forecasting Intelligence — RETIRED 2026-08-24

Measured the software's own run history, not the organization — see [Four analyses were retired](#four-analyses-were-retired-2026-08-24) for the full reasoning. Its question is answered live today by `GET /api/forecast/*`, sourced from `organizational_forecasts` (a genuine, never-rewritten time series), not this module.

---

### Module 13 — Human-AI Collaboration Intelligence

Analyzes the human side of the AI ecosystem — adoption, dependency concentration, and how effective human-agent pairing really is.

**What it does:**
- **AI Adoption Score** — how broadly the workforce engages with AI tools
- **Human Dependency Score** — whether individuals are over-relied-upon (too many critical agents/workflows on one person)
- **Collaboration Score** — effectiveness of human-agent pairing (documented + backed-up ownership)
- Surfaces the people at highest dependency risk and departments with weak AI coverage

**Sunrise Care findings:**
- **AI Adoption: 100/100** — every named staff member uses at least one AI tool
- **Human Dependency: 54/100** — dangerous concentration (Robert carries the most critical load)
- **Collaboration: 40/100** — most agents still lack documentation or a backup owner

---

### Module 14 — Decision Intelligence

Reconstructs the key organizational decisions encoded in the data, builds a decision trail for each, and scores how sound each decision was — answering *why* a decision was made, *what influenced it*, and *was it the right call*.

**What it does:**
- Treats every ownership assignment, tool adoption, and workflow setup as an explicit **decision** and rebuilds its **decision trail** (the reasoning chain that led to it)
- Surfaces the **influences** behind each decision: criticality, owner concentration, backup coverage, documentation, fallback availability
- Scores **Decision Quality** per decision: `GOOD / ACCEPTABLE / POOR / HARMFUL`
- Computes a single org-wide **Decision Quality Index (0–100)** so leadership can see whether the org's past decisions are sound, mixed, or weak
- Generates a targeted fix for every poor or harmful decision

**Decision Quality Scoring (start 100, penalties applied):**
| Factor | Penalty |
|--------|---------|
| Asset left with no owner (orphaned) | −65 (ownership) / −50 (workflow) |
| No backup owner chosen | −25 |
| Deployed without documentation / runbook | −15 to −20 |
| Owner already concentrates 5+ agents | −20 |
| Critical asset/tool/workflow with no backup or fallback | −15 to −20 |
| Critical tool adopted with no fallback selected | −30 |

**Score → Quality Tier:** `80+ = GOOD` · `55–79 = ACCEPTABLE` · `30–54 = POOR` · `< 30 = HARMFUL`

**Sunrise Care findings:**
- 27 organizational decisions audited across ownership, tooling, and workflows
- 3 HARMFUL decisions — all assigning a **critical agent to Robert with zero backup** (Lead Scoring, Lead Qualification, Billing)
- 8 POOR decisions, including adopting **ChatGPT as a critical tool with no fallback** and leaving Inventory + Data Backup agents unassigned
- **Decision Quality Index: 67/100 — MIXED**

---

### Module 15 — Verification Intelligence

Tracks and verifies every action taken across the organization — by humans, AI agents, or tools — and flags actions that violate ownership or policy rules.

**What it does:**
- Logs every action taken in every workflow with actor type, actor name, and outcome
- Verifies whether each action is policy compliant and properly accountable
- Flags actions performed by known single points of failure (e.g. unbacked owners)
- Produces a full verification record with status: `COMPLETED / FLAGGED / FAILED / PENDING`

**Sunrise Care findings:**
- 36 total actions verified across 7 workflows
- 2 actions flagged — both performed by Robert, due to zero backup coverage
- 2 policy violations identified
- 0 unverified actions

---

### Module 16 — Workflow Orchestration Intelligence

Determines the next step in every workflow, assigns it to the correct actor, and detects collisions where multiple workflows compete for the same human, agent, or tool.

**What it does:**
- Tracks current step and total steps for every active workflow
- Identifies the next actor (human, agent, or tool) responsible for the next step
- Detects collisions — cases where the same actor is required by 2+ workflows simultaneously
- Flags workflows as `BLOCKED` when a collision risk is detected

**Sunrise Care findings:**
- 7 workflows orchestrated
- 17 collisions detected — including ChatGPT shared across 3 workflows, Microsoft Copilot overloaded across 5 workflows, and Lisa required by 2 workflows simultaneously
- All 7 workflows currently flagged `BLOCKED` due to unresolved collisions

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

### Module 21 — Executive Avatar Intelligence

A single executive-facing persona that answers leadership questions directly from the Organizational Brain, instead of making executives read 20 separate reports.

**What it does:**
- Accepts plain leadership questions ("What is my biggest risk?", "Who is overloaded?")
- Pulls the answer live from ownership, risk, and continuity signals
- Always names the specific entity and person behind each answer
- Acts as the conversational front-door to every other module

**Sunrise Care findings:**
- Biggest risk surfaced: a critical agent with no backup owner
- Most overloaded person: Robert (heaviest ownership concentration)
- 4 executive questions answered directly from live data

---

### Module 22 — Voice Intelligence Engine

Turns spoken questions into answers by classifying intent and resolving the entity against the ontology.

**What it does:**
- Classifies each spoken question into an intent: `ownership / risk / status / general`
- Resolves which entity the speaker means (e.g. "the Payroll Agent")
- Returns a natural-language answer grounded in real data
- Produces a short spoken daily summary for voice playback

**Sunrise Care findings:**
- 4 voice queries resolved across ownership, risk, and status intents
- Example: *"Is the Payroll Agent a risk?"* → "Yes — owned by Lisa, no backup, undocumented."

---

### Module 23 — Executive Briefing Intelligence

Auto-generates the daily "top things to know" by pulling the most important signal from across the whole Brain.

**What it does:**
- Surfaces the top unresolved single points of failure
- Highlights the most overloaded owner
- Reports the latest incident and its lesson
- Tracks the documentation trend over time and flags pending decisions

**Sunrise Care findings:**
- 5-point executive briefing generated automatically
- Documentation trend: 28% → 35% over 4 months (still below safe levels)
- Flags critical no-backup agents as the #1 item every day

---

### Module 24 — Decision Support Intelligence

Turns raw risk findings into a prioritized "what to do next" queue with a transparent scoring model, and reviews how past decisions turned out.

**What it does:**
- Converts every risk (single points of failure, active incidents, undocumented critical knowledge) into a concrete decision
- Scores each decision 0–100 using **impact × urgency ÷ effort**, and boosts anything sitting on a dependency blast-radius
- Groups the queue by driver so leadership sees *why* each action is on the list
- Reviews the decision log for choices that went negative, mixed, or are still pending, and flags them for revisit
- Gives leadership a ranked action list instead of a wall of risks

**Sunrise Care findings:**
- 25 prioritized decisions queued — 10 single-point-of-failure, 9 undocumented-knowledge, 6 active-incident
- Top action: **assign a backup owner to the Lead Scoring Agent** (highest impact × urgency)
- 3 past decisions flagged for revisit

---

### Module 25 — Organizational Health Intelligence

A single **weighted** composite health index across five resilience dimensions, broken down by department, with a trend direction from historical snapshots.

**What it does:**
- Scores five dimensions: Documentation (20%), Continuity/backups (25%), Ownership spread (15%), Critical safety (25%), Incident load (15%)
- Combines them into one weighted Organizational Health Index (0–100)
- Breaks health down **per department** so leadership sees exactly where the weakness lives
- Uses the monthly history (risk-index time series) to determine whether things are improving or declining
- Classifies overall state: `CRITICAL / WARNING / STABLE`

**Sunrise Care findings:**
- **Organizational Health Index: 28/100 — CRITICAL**
- Trend: **improving** (risk index falling month over month)
- Weakest dimension: **Critical safety (0/100)** — critical assets with no backup coverage
- Weakest department: **Finance**

---

### Module 26 — Executive Memory Intelligence

Remembers what leadership should not forget — recurring patterns, lessons from past incidents, and decisions that went wrong.

**What it does:**
- Detects recurring incident patterns (the same failure type happening again)
- Flags repeat-offender entities that appear in multiple incidents (chronic weak points)
- Surfaces the lesson attached to every critical/high incident
- Flags decisions that turned out negative — especially irreversible ones
- Identifies "hero dependency" — one person repeatedly resolving incidents
- Ranks everything by relevance so the most important memory sits on top

**Sunrise Care findings:**
- 7 memory items surfaced from 6 recorded incidents (1 recurring pattern, 5 lessons, 1 bad decision)
- Recurring outages flagged as a pattern, not one-offs
- Hero-risk and chronic weak points surfaced for leadership follow-up

---

### Module 27 — Executive Context Intelligence

Ranks "what matters right now" so leaders focus on the most urgent context first.

**What it does:**
- Pulls open incidents, critical SPOFs, pending decisions, dependency blast radius, and declining metrics into one feed
- Scores each item by urgency: `CRITICAL / HIGH / MEDIUM / LOW`
- Raises urgency for single points of failure that feed multiple downstream dependencies
- Sorts the feed so the most pressing context is always on top
- Gives the Executive Avatar its situational awareness

**Sunrise Care findings:**
- 19 context items ranked by urgency — 10 single-point-of-failure, 6 incidents, 2 weak metrics, 1 pending decision
- Highest live urgency: **CRITICAL** — unbacked critical assets rank at the top of the "what matters now" feed

---

### Module 28 — Universal Dependency Graph

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

### Module 30 — Knowledge Concentration Intelligence

Pinpoints where critical knowledge is dangerously concentrated in too few people, using both a **bus factor** and a **Herfindahl-Hirschman concentration index (HHI)**.

**What it does:**
- Measures how much critical knowledge each person holds (knowledge areas + owned critical assets)
- Calculates the organization's **bus factor** (how few people hold 50% of critical knowledge)
- Computes the **HHI concentration index (0–10000)** and classifies it `HEALTHY / MODERATE / HIGH / SEVERE`
- Reports the share held by the single most critical person
- Flags critical knowledge areas with only a single holder, plus undocumented critical areas
- Breaks concentration down per person (critical items held + how many are undocumented)

**Sunrise Care findings:**
- **Concentration level: SEVERE** (HHI 2850/10000)
- **Bus factor: 2** — losing 2 people removes half of critical knowledge
- Top person holds 40% of all critical knowledge
- 4 critical knowledge areas have a single holder: Lead Scoring Logic, Payroll Rules, CRM Integration, Backup & Recovery

---

### Module 31 — Organizational Ecosystem Intelligence

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
**Engineer:** Tahir

Simulates a failure at any node and walks the dependency graph (breadth-first, with impact decay) to reveal the full cascade blast radius, then ranks the organization's true single points of failure.

**What it does:**
- Injects a failure at any agent, tool, workflow, or person and propagates it through the dependency graph
- Applies an impact-decay factor at each hop so nearer victims count more than distant ones
- Aggregates the total blast radius per origin node
- Ranks every node to expose the organization's real single points of failure

---

### Module 33 — Dependency Evolution Intelligence
**Engineer:** Tahir

Diffs dependency snapshots over time to show how coupling is growing or shrinking, and tracks whether the organization is getting more or less fragile.

**What it does:**
- Compares two dependency snapshots and diffs added / removed edges
- Tracks how each node's coupling has evolved between snapshots
- Flags whether overall fragility is trending up or down
- Gives leadership an early read on structural drift

---

### Module 34 — Hidden Dependency Intelligence

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

From here the engine moves from analysis into **constitutional intelligence, deeper prediction, organizational science, and governed automation**. The sequence continues unbroken — 36 through 55, nothing skipped. All of these run inside the Node brain (`backend/brain/`) and are reached through the backend API; M37, M39–M45, M47 and M49 are served under `/api/intelligence/*`. **Two constitutional rules are enforced here: Truth (M46) gates the Advisor (M48), and the Meta-Brain Orchestrator (M55) always runs last.**

### Module 36 — Signal Intelligence
**Engineer:** Kamran · `GET /api/intelligence/signals`

An early-warning system that fuses ownership, dependency, incident, and metric signals into a single organizational stability score and surfaces the active warning signals leadership should act on before they escalate.

**What it does:**
- Collects weak signals from across every layer (ownership, dependency, incidents, declining metrics)
- Computes an organizational stability score
- Ranks active signals by how close they are to becoming a real problem
- Feeds the constitutional layer with a verified early-warning feed

### Module 37 — Pattern Intelligence
**Engineer:** Tahir

Detects recurring patterns across incidents and behavior, and classifies how regular each pattern is using the coefficient of variation (regular vs. sporadic).

**What it does:**
- Scans the incident and activity history for repeating event types and sequences
- Measures how regular each pattern is using the coefficient of variation (tight cadence vs. random spikes)
- Classifies every pattern as `REGULAR / PERIODIC / SPORADIC`
- Flags the recurring patterns most likely to strike again so leadership can pre-empt them

### Module 38 — Opportunity Intelligence
**Engineer:** Kamran · `GET /api/intelligence/opportunities`

Turns risk findings inside-out into a prioritized opportunity backlog — the highest-leverage improvements and quick wins that raise organizational health the fastest.

**What it does:**
- Converts every open risk into a concrete improvement opportunity
- Scores each opportunity by leverage (health gained vs. effort required)
- Separates quick wins from strategic bets
- Gives leadership a ranked "where to invest next" backlog

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

### Module 46 — Truth Intelligence *(gates Module 48)*
**Engineer:** Kamran · `GET /api/intelligence/truth`

The constitutional truth layer: verifies every claimed fact against the underlying data, assigns a data-trust score, and only lets **verified truths** pass downstream. Enforces the core principle *"truth before recommendation"* — nothing reaches the Advisor until it is verified here.

**What it does:**
- Re-checks every downstream claim against the raw organizational data
- Assigns a confidence / data-trust score to each fact
- Blocks unverified or contradicted claims from moving forward
- Acts as the gate that Module 48 must pass through

### Module 47 — Continuous Learning Intelligence — RETIRED 2026-08-24
**Engineer:** Tahir

Its own constitutional question was *"How does the Brain improve continuously?"* — but it measured the software's own run history, not the organization. See [Four analyses were retired](#four-analyses-were-retired-2026-08-24) for the full reasoning; nothing depended on it.

### Module 48 — Autonomous Advisor
**Engineer:** Kamran · `GET /api/intelligence/advisor`

Generates leadership recommendations **only from truths verified by Module 46** — never from raw or unverified signals — so every recommendation is defensible and evidence-backed.

**What it does:**
- Reads only the verified truths passed through Module 46 (never raw or unverified signals)
- Generates specific, evidence-backed leadership recommendations
- Attaches the supporting truth and its confidence to every recommendation so it is defensible
- Refuses to recommend anything that Truth Intelligence has not verified

### Module 49 — Digital Twin Intelligence
**Engineer:** Tahir

Builds a live digital-twin snapshot of the organization, computes a twin health index, simulates scenarios against the twin, and checks that the twin stays synchronized with reality.

**What it does:**
- Builds a live digital-twin snapshot of the whole organization
- Computes a twin health index that mirrors the real organization's state
- Runs scenarios against the twin without touching production reality
- Continuously checks that the twin stays synchronized with the real organization

### Module 50 — Organizational Brain Core Logic
**Engineer:** Kamran · `GET /api/intelligence/brain-core`

The reasoning core that fuses every verified signal into one brain index and an operating posture — the organization's current "state of mind" (stable, strained, or critical).

**What it does:**
- Fuses every verified signal from across the Brain into one unified brain index
- Determines the organization's current operating posture: `STABLE / STRAINED / CRITICAL`
- Explains the posture with the top contributing signals, not just a bare number
- Acts as the reasoning core the Orchestrator (M55) reads before its final verdict

### Module 51 — Self-Healing Intelligence
**Engineer:** Anusha · `GET /api/self-healing`

Continuously scans for blocked workflows, actor collisions, single points of failure, policy breaks, and escalation conditions, then emits healing intents (pause / unblock / reassign) to Module 16 for governed execution. It never acts on its own — it detects and emits an intent, governed by the current execution mode (`advisory` by default).

**What it does:**
- Continuously scans for blocked workflows, actor collisions, single points of failure, policy breaks, and escalation conditions
- Emits healing intents (pause / unblock / reassign) to Module 16 for governed execution
- Never acts on its own — it only detects and proposes, governed by the active execution mode (`advisory` by default)
- Turns detected fragility into a safe, reviewable recovery action

### Module 52 — Governance Automation Intelligence
**Engineer:** Anusha · `GET/POST /api/automation/governance`

Runs five governance rules over live activity, detects policy violations, and emits enforcement intents to Module 16 — turning Module 19's governance findings into governed action.

**What it does:**
- Runs five governance rules over live organizational activity
- Detects policy violations as they happen (missing owner, no backup, undocumented critical asset, stale policy, unaccountable action)
- Emits enforcement intents to Module 16 instead of acting directly
- Turns Module 19's governance findings into governed, auditable action

### Module 53 — Continuity Automation Intelligence
**Engineer:** Anusha · `GET/POST /api/automation/continuity`

Detects five classes of continuity risk (owner loss, undocumented critical assets, single points of failure, and more) and emits recovery intents to Module 16 so the organization can respond before a disruption becomes an outage.

**What it does:**
- Detects five classes of continuity risk (owner loss, undocumented critical assets, single points of failure, missing backups, fragile workflows)
- Emits recovery intents to Module 16 before a risk becomes an outage
- Operates under the active governance mode so nothing auto-executes without authorization
- Turns Module 18's continuity findings into pre-emptive recovery action

### Module 54 — Simulation Universe
**Engineer:** Kamran · `GET /api/intelligence/simulation-universe`

Runs a whole universe of what-if scenarios (people leaving, agents failing, tools going offline, cascading combinations) and ranks them by survivability so leadership sees exactly where the organization would break first.

**What it does:**
- Runs a whole universe of what-if scenarios — people leaving, agents failing, tools going offline, and cascading combinations
- Recalculates organizational survivability for every scenario
- Ranks all scenarios so leadership sees exactly where the organization breaks first
- Turns single what-if checks into a full stress-test of the entire organization

### Module 55 — Organizational Intelligence Orchestrator (Meta-Brain)
**Engineer:** Kamran · `GET /api/intelligence/orchestrator`

The Meta-Brain. **Runs last.** It fuses every module's output into one Organizational Intelligence Score and a final verdict, enforcing the constitutional rule that the orchestrator only speaks after all verified intelligence is in.

**What it does:**
- Runs last — only after every other module's verified output is in
- Fuses all module outputs into one Organizational Intelligence Score and a final verdict
- Enforces the constitutional rule that the Meta-Brain speaks only on verified intelligence
- Delivers leadership the single top-level answer: how intelligent and resilient the organization really is

> **Constitutional layer (Kamran):** Modules 36, 38, 39, 40, 46, 48, 50, 54, 55 form Phase 6 — served under `/api/intelligence/*`. **Truth (46) gates Advisor (48); Orchestrator (55) runs last.**
>
> **Automation layer (Anusha):** Modules 51, 52, 53 each *detect → emit intent → Module 16 executes* under the active governance mode. *Automation follows intelligence — never automate an action that was not first verified.* Modules 15, 16, 21, and 23 (also Anusha) are documented in sequence above.

---
## Organizational Brain — analysis library (`backend/brain/`)

The analyses (M01–M55, minus four retired — see below) run over one shared
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
`/api/forecast` and `/api/memory`. Nothing depended on them. **51 remain.**

### Prediction, Learning & Organizational Science — *Tahir* (`backend/brain/modules/implementations.js`)
The forward-looking and inward-looking intelligence. Every module below consumes the shared Knowledge Graph and returns a real Intelligence Package (prediction/insight + confidence + evidence + recommended action) — no stubs.

| Module | Name | What it computes at runtime |
|---|---|---|
| M11 | Predictive Risk | Projects each entity's future risk from dependency-cascade depth + ownership gaps; flags imminent, high-likelihood threats before they fail |
| M13 | Human-AI Collaboration | AI-adoption vs. human-dependency balance and the collaboration orientation |
| M32 | Dependency Impact | Impact score & severity for every dependency; surfaces the highest-impact links |
| M33 | Dependency Evolution | Criticality distribution, dependency cycles and directional trend |
| M37 | Pattern | Structural anomalies — isolated nodes and over-connected hubs |
| M41 | Organizational DNA | Human vs. automation share and the org's structural orientation |
| M42 | Culture | Collaboration vs. silo signals, including siloed people and transitional signals |
| M43 | Organizational Maturity | Maturity dimensions, current level and the gap to the next level |
| M44 | Organizational Behavior | Dominant operating behavior and orientation |
| M45 | Benchmark | Four internal benchmarks fused into a single benchmark score |
| M49 | Digital Twin | A live twin snapshot of the organization across all intelligence layers |

### Executive Experience & Autonomous Operations — *Anusha* (`backend/brain/modules/implementations.js`)
The executive-facing surface and the autonomy layer. Automation always *follows* intelligence — nothing is auto-executed that was not first verified.

| Module | Name | What it computes at runtime |
|---|---|---|
| M15 | Verification | Per-asset verification rate from owners + intact dependencies; lists integrity errors |
| M16 | Workflow Orchestration | Topological run order with owners, readiness and bottlenecks |
| M21 | Executive Avatar | Role-aware executive persona and how each briefing opens |
| M23 | Executive Briefing | Fuses health (M25), risk (M03), advisor (M48) and prediction (M11) into a role-aware briefing with prioritized recommendations |
| M51 | Self-Healing | Detects issues, marks the auto-healable ones and emits the healing workflow |
| M52 | Governance Automation | Compliance rate + the governance actions to auto-enforce |
| M53 | Continuity Automation | Continuity score, resilience and a prioritized recovery plan |

### Real logic — no stubs

Every one of the 51 analyses has a **real implementation** in
`backend/brain/modules/implementations.js` that computes genuine intelligence
from the knowledge graph (ownership coverage, single points of failure,
dependency cascades, ownership concentration, governance gaps, health index,
truth verification, autonomous advice, meta-fusion). Two constitutional rules
are enforced by `resolveOrder()`:

- **Truth (M46) gates the Autonomous Advisor (M48)** — advice is withheld unless truth is verified.
- **Meta-Brain Orchestrator (M55) always runs last** and fuses all intelligence into one executive answer.

Six analyses (M11, M23, M24, M48, M50, M55) read prior analyses' output and
return different answers without it, which is why dependency ordering survived
the runtime's removal.

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

`npm test` is the proof. `brain.smoke.test.js` asserts all 51 analyses exist,
run without error, and order correctly (every dependency before its dependent,
Truth before Advisor, Meta-Brain last), against a fixture graph with no database.
`intelligence.verify.test.js` runs five end-to-end scenarios and checks each
one's declared dependencies actually ran first.

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

#### Environment Setup

```bash
# 1. Copy the template
cp backend/.env.example backend/.env

# 2. Create the database tables (run once) — paste backend/schema.sql
#    into the Supabase SQL editor and run it
```

Fill in your Supabase credentials in `backend/.env`:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_secret_key
PORT=3000
```

> `.env` is git-ignored and must never be committed to version control.

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
│   ├── schema.sql                             # Supabase tables — run once before starting the server
│   ├── API_REFERENCE.md                       # Full endpoint reference for the frontend team
│   ├── package.json                           # Node.js dependencies
│   ├── .env.example                           # Environment variable template
│   ├── brain/                                 # Organizational Brain — analysis library over the Knowledge Graph
│   │   ├── index.js                           # loadGraph() / run() / runMany() — the whole public API
│   │   ├── README.md                          # Library documentation
│   │   ├── data/
│   │   │   ├── constitutional-modules.js      # Analysis catalog — 51 entries (code, name, owner, layer, dependsOn)
│   │   │   └── ontology.js                    # Entity + relationship types (shared organizational meaning)
│   │   ├── knowledge/
│   │   │   ├── graphLoader.js                 # Supabase → graph. The one place organizational data enters.
│   │   │   ├── knowledgeGraph.js              # Unified Organizational Knowledge Graph
│   │   │   ├── entityRegistry.js              # Single source of truth for entities
│   │   │   ├── relationshipRegistry.js        # Relationships as first-class assets
│   │   │   └── intelligenceExchange.js        # Intelligence Package format + confidence fusion
│   │   └── modules/
│   │       ├── analytics.js                   # Shared graph algorithms (SPOF, centrality, cycles)
│   │       └── implementations.js             # All 51 analyses
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
│           └── constitutional.js              # /api/intelligence/* — Phase 6 endpoints (M36–M55)
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

> **Implementation (`backend/brain/`).** All 51 analyses run over one shared Knowledge Graph, documented in the **Organizational Brain — analysis library** section. Every one has a **real, graph-derived implementation** in `backend/brain/modules/implementations.js` — there are **no stub responses**. Ownership spans all four engineers: **Huzaifa** — Knowledge layer (`backend/brain/knowledge/`); **Kamran** — core reasoning & Meta-Brain; **Tahir** — Prediction & Organizational Science (M11, M13, M32, M33, M37, M41–M45, M49); **Anusha** — Executive Experience & Autonomous Operations (M15, M16, M21, M23, M51, M52, M53).

---

## Phase 6 — Constitutional Intelligence & Meta-Brain (Master Registry M01–M55, LOCKED)

> The **Master Module Registry (M01–M55)** is the **single source of truth** for OBA Core. Module definitions are locked — no renaming, merging, or duplication.

Phase 6 completes Kamran's constitutional modules. These build on the truth-before-recommendation principle: **M46 (Truth) verifies before M48 (Advisor) recommends**, and **M55 (Orchestrator)** fuses everything and is run **last**.

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

### Assignment summary (M01–M55 catalog, 51 active)

| Engineer | Modules | Count |
|----------|---------|-------|
| Muhammad Huzaifa | M01, M02, M03, M07, M08, M19, M20, M22, M28, M29, M31, M34, M35 | 13 |
| Kamran | M04, M05, M06, M09, M14, M18, M24, M25, M26, M27, M30, M36, M38, M39, M40, M46, M48, M50, M54, M55 | 20 |
| Muhammad Tahir | M11, M13, M32, M33, M37, M41, M42, M43, M44, M45, M49 | 11 |
| Anusha | M15, M16, M21, M23, M51, M52, M53 | 7 |

### Running the Phase 6 modules

All 51 analyses run inside the Node backend — see **How to Run** above. There is no separate CLI.

### Phase 6 backend endpoints

Every Phase 6 endpoint (M36, M38, M39, M40, M46, M48, M50, M54, M55, plus the `GET /api/intelligence` index) is listed with full descriptions in the **All API Endpoints** table above, and verification steps are in **`backend/readme.md`** and **`HOWTO_RUN_AND_CHECK.md`**.

---

### Contribution & Review Process
All development on the OBA Core platform follows a centralized review workflow. Every team member's work — across the AI, Backend, and Frontend teams — is first submitted to Kamran Ai Engineer(Technical Lead) for review. Each member's files and modules are reviewed, validated, and integrated by Kamran to ensure constitutional consistency, code quality, and architectural alignment across all 51 analyses. Only after this review are the changes pushed to the GitHub main branch. This process guarantees that every contribution meets the project's engineering standards and preserves a single, unified source of truth.

---
### Release
**This repository represents the MVP release of Horquva Organizational Brain Analysis (OBA) Core, delivering the 51-analysis constitutional engine, integrated backend APIs, and the executive frontend dashboard.**
