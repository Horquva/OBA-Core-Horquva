# Horquva Frontend — OBA Core Intelligence UI

**Next.js 16 · TypeScript · Tailwind CSS v4 · Recharts · Lucide Icons**

Executive-facing dashboard for the OBA (Organizational Brain Analysis) Core engine — visualizes AI workforce risk, ownership, and continuity intelligence across an organization using local JSON data.

---

## What's Built

### 01 Module 1 — Executive Dashboard
Four KPI cards, risk distribution chart by department, top 5 critical agents panel, and full agent registry table with computed governance risk scores.

### 02 Module 2 — Ownership Intelligence
- **Ownership Overview** — KPI strip for coverage gaps, SPOFs, and orphaned agents.
- **Concentration Bar** — Stacked bar mapping exposed vs covered agents per owner.
- **Dependency Pipeline** — Full-stack chain visualization: People → Agents → AI Platforms → Workflows, with per-person load bars and SPOF flags.
- **Human Dependency Risks** — Per-person risk scorecards showing exposed agents, unbacked workflows, undocumented ownership, and a weighted composite risk score.
- **Organizational Relationship Map** — Expandable cross-department topology: who controls which agents, tools, and workflows; department-level single-owner alerts.
- **Ownership List** — Detailed registry grouped by owner with specific risk badges.

### 03 Module 3 — Dependency Map
- **Dependency KPIs** — Total Agents, Dependencies, SPOFs Detected, Max Cascade Risk.
- **Dependency Flow Canvas** — React Flow node graph auto-layouted with Dagre, interactive failure simulation and SPOF highlighting.
- **Agent Continuity Matrix** — Executive table with upstream/downstream impact and continuity risk per agent.

### 04 Module 4 — Continuity Intelligence (What-If Simulation)
- **Simulation Dashboard** — Baseline vs. simulated health score metrics.
- **Scenario Ranking** — Scenarios (Person Leaves, Agent Fails, Tool Unavailable) ranked by worst impact.
- **Impact Summary** — Before/after Health Score delta and per-agent risk level changes.

### 05 Module 5 — Recommendation Engine
- **Top 5 Urgent** — Prioritized executive action list with urgency scoring.
- **Recommendation List** — Full actionable recommendation set with effort/impact metadata.
- **Demo Summary** — Sunrise Care finding highlights for demo walkthroughs.

### 06 Module 6 — Risk Intelligence
Fuses ownership risk + dependency risk into one composite score per agent, with CRITICAL rule enforcement and Organizational Health Score computation.

- **Risk Header** — SVG OHS gauge + 4 stat cards (Total Agents, Critical, High, Orphaned) in a clean 2×2 grid.
- **Critical Risk Panel** — Expandable card per CRITICAL agent with rule explanation, per-factor score breakdown (+points), and downstream cascade warning.
- **Risk Score Tables** — Tiered tables for HIGH / MEDIUM / LOW agents showing owner, backup, docs, cascade count, and composite score.
- **Organizational Health Banner** — OHS progress bar, 4 key insight columns, and Sunrise Care key findings list.

**Risk Tier Rules:**

| Score | Tier |
|---|---|
| ≥ 70 | CRITICAL |
| ≥ 40 | HIGH |
| ≥ 20 | MEDIUM |
| < 20 | LOW |

**CRITICAL Hard Rule:** Agent is forced CRITICAL if it is **orphaned** OR is a **SPOF with no backup owner**, regardless of numeric score.

**Sunrise Care Demo Results:** 5 CRITICAL · 6 HIGH · Org Health Score **56/100 — AT RISK**

### 07 Module 7 — AI Tool Intelligence
Audits every AI tool in use across the organization — usage, risk, dependencies, and financial exposure.

- **AI Tool Header** — KPI strip tracking total monthly spend, unbacked tools, undocumented tools, unique users exposed, and critical tools.
- **Critical Risk Tools** — Expandable detail cards showing risk factors, affected workflows, agents powered, and department exposure.
- **Tool Risk Tables** — Categorized tables for HIGH, MEDIUM, and LOW risk tools with composite score bars, flags, and cost data.
- **Outage Impact Panel** — Simulation grid showing exactly what breaks (workflows, agents, users, departments) if a tool goes offline.
- **Department Exposure** — Table mapping tool penetration, high-risk tools, and estimated monthly spend by department.

### 08 Module 9 — Knowledge Risk Intelligence
Maps where critical organizational knowledge lives — in people's heads — and calculates exactly what disappears if they leave today.

- **Knowledge Header** — KPI strip: total assets mapped, undocumented count, knowledge gaps, sole holders, people analysed.
- **Concentration Risk Panel** — Expandable per-person cards showing owned agents, workflows, and tools; undocumented flags; sole-holder badges; and a weighted Knowledge Concentration Score bar (0–100%).
- **Departure Impact Simulator** — Interactive people-picker: click any person to instantly surface which assets become permanently unrecoverable with a before/after stat grid.
- **Undocumented Assets Table** — Full sortable table of every undocumented agent, workflow, and tool across the org with `NO BACKUP` flags and criticality badges.
- **Critical Knowledge Gaps Panel** — Highlights every asset with zero knowledge redundancy (no documentation AND no backup owner), with a summary callout showing critical vs. high gap counts.

**Sunrise Care Demo Results:**
- Robert = CRITICAL (100%) — sole owner of 5 agents + 1 workflow, all undocumented
- Mike and Lisa = HIGH concentration risk
- 13 total undocumented assets · 6 assets permanently unrecoverable if Robert leaves today

### 09 Module 10 — Organizational Memory Intelligence
Tracks the institutional memory preservation status of every AI asset and calculates how much organizational knowledge would survive a major personnel disruption.

- **Memory Header** — Institutional Memory Health Score™ (IMHS) arc meter, plus 4 KPI cards tracking the status distribution: PRESERVED, VULNERABLE, AT RISK, and LOST.
- **Critical Memory Carriers** — Per-person scorecards for individuals holding critical undocumented knowledge. Shows a color-coded asset breakdown bar and expandable details.
- **LOST Assets Panel** — Red-flag grid highlighting assets with no owner, no documentation, and no recovery path. 

**Memory Status Definitions:**
- **PRESERVED**: Documented + backup owner exists
- **AT RISK**: Has backup but lacks documentation
- **VULNERABLE**: Has documentation but no backup owner
- **LOST**: No owner, no documentation — unrecoverable

**Sunrise Care Demo Results:**
- IMHS: 54/100 (AT RISK)
- PRESERVED: 14 · VULNERABLE: 10 · AT RISK: 1 · LOST: 2
- Robert = CRITICAL carrier (sole holder of 7 assets, 6 of which are undocumented)

### 10 Module 14 — Decision Intelligence
Reconstructs the key organizational decisions encoded in the data, builds a decision trail for each, and scores how sound each decision was — answering why a decision was made, what influenced it, and was it the right call.

- **Decision Header** — DQI (Decision Quality Index) circular gauge, summary text, and KPI strip showing counts for Good, Acceptable, Poor, and Harmful decisions.
- **Critical Decisions Panel** — Side-by-side grids highlighting HARMFUL and POOR decisions, detailing penalties applied and recommended fixes.
- **Decision Trail Audit** — Complete filterable table of all audited decisions across ownership, tooling, and workflows. Clickable rows expand to reveal the reasoning chain (Decision Trail), specific score influences, and fixes.

**Sunrise Care Demo Results:**
- 27 organizational decisions audited.
- DQI: 67/100 (MIXED)
- 3 HARMFUL decisions — all assigning a critical agent to Robert with zero backup.
- 8 POOR decisions.

---

## Design System & Theming

- **Global Theme Toggle** — fully supported dynamic Light and Dark modes with persistent preference storage. Toggled seamlessly from the sidebar.

- **Color palette** — near-black canvas (`#0c0c0f`), elevated cards (`#16161c`), subtle borders (`#1f1f29`)
- **Risk colors** — Critical (red) / High (orange) / Medium (yellow) / Low (green), desaturated for elegance
- **Typography** — DM Sans via `next/font/google`; HORQUVA wordmark uses Outfit 500
- **Animations** — staggered `fade-up`, card hover lift (`translateY(-2px)`), soft pulse on warnings
- **Glassmorphism tokens** — backdrop blur, layered box-shadows, inset highlights

---

## Screens

| Route | Status | Module |
|---|---|---|
| `/` | ✅ Built | Executive Dashboard (Module 1) |
| `/ownership` | ✅ Built | Ownership Intelligence (Module 2) |
| `/map` | ✅ Built | Dependency Map (Module 3) |
| `/simulation` | ✅ Built | What-If Simulation (Module 4) |
| `/recommendations` | ✅ Built | Recommendation Engine (Module 5) |
| `/risk` | ✅ Built | Risk Intelligence (Module 6) |
| `/ai-tools` | ✅ Built | AI Tool Intelligence (Module 7) |
| `/knowledge` | ✅ Built | Knowledge Risk Intelligence (Module 9) |
| `/memory` | ✅ Built | Organizational Memory Intelligence (Module 10) |
| `/decision` | ✅ Built | Decision Intelligence (Module 14) |

---

## Data Source

All UI powered by `../data/company.json` loaded server-side via `lib/data.ts`. No API calls — pure local data for the MVP.

---

## Run Locally

```bash
cd frontend
npm install
npm run dev
```

Runs on **http://localhost:3001**

---

## Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Charts | Recharts 3 |
| Icons | Lucide React |
| Graphs | React Flow (`@xyflow/react`) + Dagre |
| Data | Local JSON (`company.json`) |
