# Organizational Brain Analysis (OBA) Backend

## Project Overview

This backend powers the **Organizational Brain Analysis (OBA)** platform. It models an organization as an interconnected intelligence system consisting of:

- Humans (employees)
- AI Agents
- AI Tools
- Workflows
- Organizational Knowledge
- Dependencies
- Risks
- Governance
- Accountability
- Executive Intelligence

The platform transforms organizational data into actionable intelligence for leadership through specialized constitutional modules.

---

# What the Platform Analyzes

- Ownership gaps
- Dependency chains
- Organizational risks
- AI tool governance
- Workflow failures
- Knowledge concentration
- Organizational memory
- Governance & accountability
- Organizational continuity
- Executive insights
- Decision support
- Organizational health

---

# Tech Stack

- Node.js
- Express.js
- Supabase (PostgreSQL)
- dotenv
- cors

---

# Project Structure

```text
backend/
│
├── index.js
├── supabase.js
├── package.json
├── .env
│
└── routes/
    ├── agents.js
    ├── ownership.js
    ├── dependencies.js
    ├── risks.js
    ├── dashboard.js
    ├── humanAgentMap.js
    │
    ├── tools/
    ├── workflows/
    ├── knowledge/
    ├── memory/
    ├── predictive/
    ├── forecast/
    ├── collaboration/
    ├── decisions/
    ├── verification/
    ├── orchestration/
    ├── learning/
    ├── continuity/
    ├── governance/
    ├── accountability/
    ├── executive/
    ├── voice/
    ├── briefing/
    ├── decisionSupport/
    ├── health/
    ├── executiveMemory/
    ├── context/
    └── intelligence/
```

---

# Implemented Constitutional Modules

## Module 01 — Ownership Intelligence

- Tracks ownership of agents, workflows, and tools
- Detects missing ownership
- Maps responsibility

---

## Module 02 — Dependency Intelligence

- Maps organizational dependencies
- Detects cascading failures
- Dependency analysis

---

## Module 03 — Risk Intelligence

- Calculates risk scores
- Detects critical assets
- Organizational risk analysis

---

## Module 04 — Recommendation Engine

- Generates improvement recommendations
- Suggests backups
- Risk reduction planning

---

## Module 05 — Agent Intelligence

- AI agent management
- Ownership mapping
- Risk scoring
- Orphan detection

---

## Module 06 — Human + AI + Workflow Intelligence

- Organization relationship graph
- Human-AI collaboration mapping
- Workflow connections

---

## Module 07 — AI Tool Intelligence

- AI tool inventory
- Tool ownership
- Cost tracking
- Backup tools
- Tool dependency mapping

---

## Module 08 — Workflow Intelligence

- Workflow execution mapping
- SPOF detection
- Failure analysis
- Workflow health

---

## Module 09 — Knowledge Intelligence

- Knowledge asset management
- Knowledge concentration
- Documentation gaps
- Knowledge loss simulation

---

## Module 10 — Organizational Memory Intelligence

- Memory preservation
- Institutional memory health
- Critical knowledge carriers
- Memory risk analysis

---

## Module 11 — Predictive Risk Intelligence

- Predicts future organizational risks
- Risk forecasting
- Emerging threat detection

---

## Module 12 — Organizational Forecast Intelligence

- 30 / 60 / 90 day forecasting
- Organizational outlook
- Health prediction

---

## Module 13 — Human-AI Collaboration Intelligence

- AI adoption analysis
- Collaboration scoring
- Dependency concentration

---

## Module 14 — Decision Intelligence

- Decision reconstruction
- Decision quality analysis
- Decision Quality Index

---

## Module 15 — Verification Intelligence

- Action verification
- Policy compliance
- Violation detection

---

## Module 16 — Workflow Orchestration Intelligence

- Workflow execution
- Collision detection
- Resource conflict analysis

---

## Module 17 — Organizational Learning Intelligence

- Learning maturity
- Failure pattern analysis
- Learning score

---

## Module 18 — Organizational Continuity Intelligence

- Continuity analysis
- Survival classification
- Recovery planning

---

## Module 19 — Governance Intelligence

- Governance analysis
- Governance heatmap
- Ownership & documentation gaps
- Governance Score

---

## Module 20 — Accountability Intelligence

Implements organizational accountability using the RACI model.

Features:

- Responsible
- Accountable
- Consulted
- Informed
- Decision Authority

Provides:

- Accountability chains
- Accountability score
- Separation-of-duties analysis
- Accountability concentration analysis

---

## Module 21 — Executive Avatar Intelligence

Executive conversational interface for leadership.

Features:

- Executive questions
- Live organizational answers
- Executive briefing
- Organizational insights

---

## Module 22 — Voice Intelligence Engine

Provides voice-ready organizational intelligence.

Features:

- Intent classification
- Entity resolution
- Natural language responses
- Daily spoken summary

---

## Module 23 — Executive Briefing Intelligence

Automatically generates daily executive briefings.

Includes:

- Top risks
- Critical incidents
- Documentation trends
- Pending decisions

---

## Module 24 — Decision Support Intelligence

Converts organizational risks into prioritized actions.

Provides:

- Prioritized decision queue
- Impact × Urgency ÷ Effort scoring
- Decision review
- Recommended actions

---

## Module 25 — Organizational Health Intelligence

Calculates overall organizational health.

Measures:

- Documentation
- Continuity
- Ownership
- Critical safety
- Incident load

Produces:

- Organizational Health Index
- Department health
- Health trends

---

## Module 26 — Executive Memory Intelligence

Preserves leadership memory.

Detects:

- Recurring incidents
- Lessons learned
- Hero dependency
- Repeat failures
- Negative decisions

---

## Module 27 — Executive Context Intelligence

Ranks organizational priorities.

Combines:

- Open incidents
- SPOFs
- Pending decisions
- Dependency blast radius
- Weak metrics

Produces a real-time executive priority feed.

---

## Module 46 — Truth Intelligence

Constitutional verification layer.

Features:

- Fact verification
- Confidence scoring
- Data trust score
- Verified vs unverified facts
- Truth gating

---

## Module 50 — Organizational Brain Core Logic

Reasoning engine of the Organizational Brain.

Features:

- Unified Brain Index
- Organizational posture
- Signal fusion
- Reasoning explanation

Postures:

- STABLE
- STRAINED
- CRITICAL

---

## Module 55 — Organizational Intelligence Orchestrator

Final constitutional reasoning layer.

Features:

- Runs after all verified modules
- Organizational Intelligence Score
- Final organizational verdict
- Cross-module intelligence fusion
- Executive recommendations

---

# API Endpoints

## Core

```
GET /api/agents
GET /api/ownership
GET /api/dependencies
GET /api/risks
GET /api/dashboard
GET /api/human-agent-map
GET /api/data-quality
```

---

## Tools

```
GET /api/tools
GET /api/tool-intelligence
GET /api/tool-impact
```

---

## Workflows

```
GET /api/workflows/intelligence
GET /api/workflows/failures
GET /api/workflows/spof
```

---

## Knowledge

```
GET /api/knowledge/intelligence
GET /api/knowledge/impact/:employee
GET /api/knowledge/gaps
```

---

## Memory

```
GET /api/memory/health
GET /api/memory/employee/:name
GET /api/memory/map
```

---

## Predictive

```
GET /api/predictive/*
```

---

## Forecast

```
GET /api/forecast/*
```

---

## Collaboration

```
GET /api/collaboration/*
```

---

## Decisions

```
GET /api/decisions/*
```

---

## Verification

```
GET /api/verification/*
```

---

## Orchestration

```
GET /api/orchestration/*
```

---

## Learning

```
GET /api/learning/*
```

---

## Continuity

```
GET /api/continuity/*
```

---

## Governance

```
GET /api/governance/*
```

---

## Accountability

```
GET /api/accountability/score
GET /api/accountability/entities
GET /api/accountability/chains
GET /api/accountability/issues
```

---

## Executive Avatar

```
GET /api/executive/questions
GET /api/executive/history
GET /api/executive/briefing

GET /api/executive/ask?q=...
```

---

## Voice Intelligence

```
GET /api/voice/intents
GET /api/voice/history
GET /api/voice/daily-summary

GET /api/voice/ask?q=...
```

---

## Executive Briefing

```
GET /api/briefing
GET /api/briefing/history
GET /api/briefing/top
```

---

## Decision Support

```
GET /api/decision-support
GET /api/decision-support/priorities
GET /api/decision-support/history
```

---

## Organizational Health

```
GET /api/organizational-health
GET /api/organizational-health/departments
GET /api/organizational-health/trend
```

---

## Executive Memory

```
GET /api/executive-memory
GET /api/executive-memory/patterns
GET /api/executive-memory/lessons
```

---

## Executive Context

```
GET /api/executive-context
GET /api/executive-context/urgent
GET /api/executive-context/feed
```

---

## Truth Intelligence

```
GET /api/intelligence/truth
GET /api/intelligence/truth/summary
GET /api/intelligence/truth/verified
GET /api/intelligence/truth/unverified
GET /api/intelligence/truth/entity/:name
```

---

## Brain Core

```
GET /api/intelligence/brain-core
GET /api/intelligence/brain-core/summary
GET /api/intelligence/brain-core/posture
GET /api/intelligence/brain-core/signals
GET /api/intelligence/brain-core/explanation
```

---

## Organizational Intelligence Orchestrator

```
GET /api/intelligence/orchestrator
GET /api/intelligence/orchestrator/summary
GET /api/intelligence/orchestrator/verdict
GET /api/intelligence/orchestrator/recommendations
GET /api/intelligence/orchestrator/modules
GET /api/intelligence/orchestrator/score
```

---

# How to Run

Install dependencies:

```bash
npm install
```

Start the backend server:

```bash
node index.js
```

Default server:

```
http://localhost:3000
```

---

# Architecture

The backend follows a modular architecture where every constitutional module is independently implemented and exposed through REST APIs while sharing a common Supabase database.

Each module is responsible for one intelligence capability and contributes to the overall Organizational Brain.

---

# Tech Summary

- Node.js
- Express.js
- PostgreSQL (Supabase)
- REST APIs
- Modular Architecture
- Organizational Brain Analysis (OBA)
- Constitutional Intelligence Modules (M01–M55)