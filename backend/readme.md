# OBA Core — Backend API

## Project Overview

This backend is the **Organizational Brain infrastructure** — a unified REST API layer that exposes every intelligence module so the frontend and any other client can consume organizational intelligence from one place.

It models how an organization works using:

- Humans (employees)
- AI agents
- AI tools
- Workflows
- Dependencies
- Risks
- Knowledge & Memory systems
- Governance & Accountability structures

It helps analyze: system failures, ownership gaps, AI tool risks, workflow breakdowns, knowledge loss, organizational memory health, future risk, decision quality, governance gaps, and accountability.

## Tech Stack

- Node.js
- Express.js (v5)
- Supabase (PostgreSQL)
- @supabase/supabase-js
- dotenv
- CORS

## Project Structure

```
backend/
│
├── index.js                  # Express server — all routes registered here
├── supabase.js               # Supabase client initialization
├── package.json              # Node.js dependencies
├── package-lock.json
├── .env.example              # Environment variable template
│
└── routes/
    ├── agents.js                         # /api/agents              (Module 01)
    ├── ownership.js                      # /api/ownership           (Module 01)
    ├── dependencies.js                   # /api/dependencies        (Module 02)
    ├── risks.js                          # /api/risks               (Module 03)
    ├── dashboard.js                      # /api/dashboard           (Module 03)
    ├── humanAgentMap.js                  # /api/human-agent-map     (Module 06)
    ├── tools.js                          # /api/tools               (Module 07)
    ├── toolIntelligence.js               # /api/tool-intelligence   (Module 07)
    ├── toolImpact.js                     # /api/tool-impact         (Module 07)
    │
    ├── simulations/                      # Module 05 — What-If Simulation
    │   ├── employeeLeaves.js             # /api/simulations/employee-leaves
    │   ├── agentFails.js                 # /api/simulations/agent-fails
    │   ├── platformDown.js               # /api/simulations/platform-down
    │   └── workflowDisruption.js         # /api/simulations/workflow-disruption
    │
    ├── workflows/                        # Module 08 — Workflow Intelligence
    │   ├── index.js                      # /api/workflows
    │   ├── intelligence.js
    │   ├── failures.js
    │   └── spof.js
    │
    ├── knowledge/                        # Module 09 — Knowledge Risk Intelligence
    │   ├── intelligence.js               # /api/knowledge/intelligence
    │   ├── impact.js                     # /api/knowledge/impact
    │   └── gaps.js                       # /api/knowledge/gaps
    │
    ├── memory/                           # Module 10 — Organizational Memory
    │   └── memory.js                     # /api/memory
    │
    ├── predictive/                       # Module 11 — Predictive Risk Intelligence
    │   └── predictiveRisk.js             # /api/predictive-risk
    │
    ├── forecast/                         # Module 12 — Organizational Forecasting
    │   └── forecast.js                   # /api/forecast
    │
    ├── collaboration/                    # Module 13 — Human-AI Collaboration
    │   └── collaboration.js              # /api/collaboration
    │
    ├── decisions/                        # Module 14 — Decision Intelligence
    │   └── decisions.js                  # /api/decisions
    │
    ├── verification/                     # Module 15 — Verification Intelligence
    │   └── intelligence.js               # /api/verification
    │
    ├── orchestration/                    # Module 16 — Workflow Orchestration
    │   └── orchestration.js              # /api/orchestration
    │
    ├── learning/                         # Module 17 — Organizational Learning
    │   └── learning.js                   # /api/learning
    │
    ├── continuity/                       # Module 18 — Organizational Continuity
    │   └── continuity.js                 # /api/continuity
    │
    ├── governance/                       # Module 19 — Governance Intelligence
    │   └── governance.js                 # /api/governance
    │
    └── accountability/                   # Module 20 — Accountability Intelligence
        └── accountability.js             # /api/accountability
```

## Modules Implemented (20 Total)

**Module 01 — Ownership Intelligence**
Tracks ownership of agents, workflows, and tools; maps employees to responsibilities; detects missing ownership gaps.

**Module 02 — Dependency Intelligence**
Maps dependencies between systems; shows how agents, tools, and workflows connect; identifies cascading failure paths.

**Module 03 — Risk Intelligence**
Calculates risk scores; identifies critical and high-risk components; flags system instability areas.

**Module 04 — Recommendation Engine**
Suggests improvements in system design; identifies missing backups; recommends risk-reduction actions.

**Module 05 — What-If Simulation**
Simulates the impact of an employee leaving, an agent failing, a platform going down, or a workflow breaking.

**Module 06 — Human-Agent Dependency Map**
Full organizational relationship mapping across employees, agents, workflows, and tools.

**Module 07 — AI Tool Intelligence**
AI tool usage tracking, ownership mapping, tool-to-agent/workflow dependencies, monthly cost, backup tools, and tool risk scoring.

**Module 08 — Workflow Intelligence**
Step-by-step workflow mapping, human + agent + tool chains, Single Point of Failure (SPOF) detection, and workflow risk analysis.

**Module 09 — Knowledge Risk Intelligence**
Knowledge asset tracking, concentration per employee, undocumented system detection, and knowledge-loss simulation.

**Module 10 — Organizational Memory Intelligence**
Memory status (PRESERVED / VULNERABLE / AT RISK / LOST), Institutional Memory Health Score, and critical knowledge-carrier detection.

**Module 11 — Predictive Risk Intelligence**
Predicts future risk escalation of agents; classifies risk LOW / MEDIUM / HIGH / CRITICAL; detects emerging threats before failure.

**Module 12 — Organizational Forecasting Intelligence**
Forecasts 30/60/90-day organization health; combines health + memory + continuity prediction into an overall outlook score.

**Module 13 — Human-AI Collaboration Intelligence**
Measures AI adoption across the workforce, detects human dependency concentration, and evaluates collaboration effectiveness.

**Module 14 — Decision Intelligence**
Reconstructs organizational decisions, scores decision quality (GOOD / POOR / HARMFUL), and computes a Decision Quality Index.

**Module 15 — Verification Intelligence**
Tracks every action (human/agent/tool), verifies policy compliance, and flags violations and accountability issues.

**Module 16 — Workflow Orchestration Intelligence**
Manages workflow execution flow, detects collisions between workflows, and flags blocked workflows due to shared resources.

**Module 17 — Organizational Learning Intelligence**
Analyzes learning maturity, tracks failure patterns and incident exposure, and computes a Learning Maturity Score.

**Module 18 — Organizational Continuity Intelligence**
Measures survival ability of assets (SURVIVES / DEGRADED / FAILS / LOST) and generates continuity plans for critical assets.

**Module 19 — Governance Intelligence**
Evaluates governance structure, detects ownership + documentation gaps, builds a governance heatmap, and computes a Governance Score.

**Module 20 — Accountability Intelligence**
Implements the RACI model (Responsible, Accountable, Consulted, Informed), maps accountability chains, and flags gaps and conflicts.

## API Routes

**Module 01 — Ownership**
- `GET /api/agents`
- `GET /api/ownership`

**Module 02 — Dependency**
- `GET /api/dependencies`

**Module 03 — Risk**
- `GET /api/risks`
- `GET /api/dashboard`

**Module 05 — What-If Simulation**
- `GET /api/simulations/employee-leaves/:name`
- `GET /api/simulations/agent-fails/:name`
- `GET /api/simulations/platform-down/:name`
- `GET /api/simulations/workflow-disruption/:name`

**Module 06 — Human-Agent Map**
- `GET /api/human-agent-map`

**Module 07 — AI Tools**
- `GET /api/tools`
- `GET /api/tool-intelligence`
- `GET /api/tool-impact`

**Module 08 — Workflows**
- `GET /api/workflows`
- `GET /api/workflows/intelligence`
- `GET /api/workflows/failures`
- `GET /api/workflows/spof`

**Module 09 — Knowledge**
- `GET /api/knowledge/intelligence`
- `GET /api/knowledge/impact/:employee`
- `GET /api/knowledge/gaps`

**Module 10 — Memory**
- `GET /api/memory`

**Module 11 — Predictive Risk**
- `GET /api/predictive-risk/summary`
- `GET /api/predictive-risk/agents`
- `GET /api/predictive-risk/critical`
- `GET /api/predictive-risk/emerging`
- `GET /api/predictive-risk/agent/:name`

**Module 12 — Forecast**
- `GET /api/forecast/summary`
- `GET /api/forecast/health`
- `GET /api/forecast/memory`
- `GET /api/forecast/continuity`
- `GET /api/forecast/outlook`

**Module 13 — Collaboration**
- `GET /api/collaboration/adoption`
- `GET /api/collaboration/dependency`
- `GET /api/collaboration/score`
- `GET /api/collaboration/people`
- `GET /api/collaboration/departments`

**Module 14 — Decisions**
- `GET /api/decisions/index`
- `GET /api/decisions/all`
- `GET /api/decisions/harmful`
- `GET /api/decisions/trail/:id`
- `GET /api/decisions/recommendations`

**Module 15 — Verification**
- `GET /api/verification/summary`
- `GET /api/verification/actions`
- `GET /api/verification/flagged`
- `GET /api/verification/actor/:name`

**Module 16 — Orchestration**
- `GET /api/orchestration/summary`
- `GET /api/orchestration/workflows`
- `GET /api/orchestration/collisions`
- `GET /api/orchestration/blocked`

**Module 17 — Learning**
- `GET /api/learning/summary`
- `GET /api/learning/failures`
- `GET /api/learning/decisions`
- `GET /api/learning/incidents`
- `GET /api/learning/departments`

**Module 18 — Continuity**
- `GET /api/continuity/score`
- `GET /api/continuity/assets`
- `GET /api/continuity/risk-map`
- `GET /api/continuity/must-protect`
- `GET /api/continuity/plans`

**Module 19 — Governance**
- `GET /api/governance/score`
- `GET /api/governance/assets`
- `GET /api/governance/heatmap`
- `GET /api/governance/gaps`
- `GET /api/governance/offenders`

**Module 20 — Accountability**
- `GET /api/accountability/score`
- `GET /api/accountability/entities`
- `GET /api/accountability/chains`
- `GET /api/accountability/issues`

## Environment Setup

```bash
# Copy the template, then fill in your Supabase credentials
cp .env.example .env
```

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_secret_key
PORT=3000
```

> `.env` is git-ignored and must never be committed to version control.

## How to Run

```bash
npm install
node index.js
```

Server starts on **http://localhost:3000**
