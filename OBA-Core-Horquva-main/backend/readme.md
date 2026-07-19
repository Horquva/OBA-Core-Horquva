Project Overview

This backend is an Organizational Intelligence System that models how an organization works using:

Humans (employees)
AI agents
AI tools
Workflows
Dependencies
Risks
Knowledge & Memory systems

It helps analyze:

system failures
ownership gaps
AI tool risks
workflow breakdowns
knowledge loss
organizational memory health
Tech Stack:
Node.js
Express.js
Supabase (PostgreSQL)
dotenv
CORS
Project Structure:
MVP OBA (UPDATED)/
│
├── backend/
│   ├── index.js
│   ├── supabase.js
│   ├── .env
│   ├── package.json
│   ├── package-lock.json
│   ├── node_modules/
│
│   └── routes/
│       ├── agents.js
│       ├── ownership.js
│       ├── dependencies.js
│       ├── risks.js
│       ├── dashboard.js
│       ├── humanAgentMap.js
│       ├── tools.js
│       ├── toolIntelligence.js
│       ├── toolImpact.js
│
│       ├── simulations/
│       │   ├── employeeLeaves.js
│       │   ├── agentFails.js
│       │   ├── platformDown.js
│       │   ├── workflowDisruption.js
│       │
│       ├── workflows/
│       │   ├── index.js
│       │   ├── intelligence.js
│       │   ├── failures.js
│       │   ├── spof.js
│       │
│       ├── knowledge/
│       │   ├── intelligence.js
│       │   ├── impact.js
│       │   ├── gaps.js
│       │
│       └── memory/
│           └── memory.js
Modules Implemented:
🔹 Module 01 — Ownership Intelligence
Tracks ownership of agents, workflows, and tools
Maps employees to responsibilities
Detects missing ownership gaps
🔹 Module 02 — Dependency Intelligence
Maps dependencies between systems
Shows how agents, tools, and workflows connect
Identifies cascading failure paths
🔹 Module 03 — Risk Intelligence
Calculates risk scores
Identifies critical and high-risk components
Flags system instability areas
🔹 Module 04 — Recommendation Engine
Suggests improvements in system design
Identifies missing backups
Recommends risk reduction actions
🔹 Module 05 — Agent Intelligence
Agent tracking system
Ownership mapping
Agent risk scoring
Orphan agent detection
🔹 Module 06 — Human + AI + Workflow Graph
Full organizational relationship mapping
Employees, agents, workflows, tools integration
Cross-system dependency structure
🔹 Module 07 — AI Tool Intelligence
AI tool usage tracking (ChatGPT, Claude, Gemini, etc.)
Tool ownership mapping
Tool-to-agent/workflow dependencies
Monthly cost tracking
Backup tool mapping
Tool risk scoring
🔹 Module 08 — Workflow Intelligence
Step-by-step workflow mapping
Human + agent + tool workflow chain
Single Point of Failure (SPOF) detection
Workflow risk analysis
Runbook / failure tracking
🔹 Module 09 — Knowledge Risk Intelligence
Knowledge asset tracking
Knowledge concentration per employee
Undocumented system detection
Knowledge loss simulation
What breaks if a person leaves
🔹 Module 10 — Organizational Memory Intelligence
Memory status classification:
PRESERVED
VULNERABLE
AT RISK
LOST
Institutional Memory Health Score (0–100)
Critical knowledge carrier detection
Organizational knowledge survival analysis
API Routes
Core APIs
/api/agents
/api/ownership
/api/dependencies
/api/risks
/api/dashboard
/api/human-agent-map
🔹 Tools Module
/api/tools
/api/tool-intelligence
/api/tool-impact
🔹 Workflow Module
/api/workflows/*
/api/workflows/intelligence
/api/workflows/failures
/api/workflows/spof
🔹 Simulation Module
/api/simulations/employee-leaves/:name
/api/simulations/agent-fails/:name
/api/simulations/platform-down/:name
/api/simulations/workflow-disruption/:name
🔹 Knowledge Module
/api/knowledge/intelligence
/api/knowledge/impact/:employee
/api/knowledge/gaps
🔹 Memory Module
/api/memory/health
/api/memory/employee/:name
/api/memory/map
How to Run
npm install
node index.js