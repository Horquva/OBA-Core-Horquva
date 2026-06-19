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

---

## Design System

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
| `/risk` | ✅ Built | Risk Intelligence (Module 3 — Risk) |

---

## Data Source

All UI powered by `../data/sunrise_care.json` loaded server-side via `lib/data.ts`. No API calls — pure local data for the MVP.

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
| Data | Local JSON (`sunrise_care.json`) |
