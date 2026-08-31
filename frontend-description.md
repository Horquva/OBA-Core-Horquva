# Horquva OBA Platform - Frontend Description

This document provides a comprehensive, screen-by-screen breakdown of the Horquva OBA (Organizational Brain Architecture) Core platform's frontend. It outlines the purpose, key components, and data visualizations present on every page of the application.

## 1. Executive Dashboard (`/`)
**Purpose:** Serves as the primary landing page, providing a real-time organizational snapshot of AI workforce risk, ownership, and continuity.
**Key Components:**
- **KPI Strip (`KpiStrip`):** High-level organizational snapshot displaying critical metrics at a glance.
- **Risk Analysis (`Heatmap`):** A visual heatmap representing the current risk status of various agents across the organization.
- **Recommendations (`RiskSplit`):** High-level view of workflows and agents requiring attention.
- **Agent Summary (`AgentTable`):** A detailed tabular summary of all agents operating within the system.

## 2. Ownership Intelligence (`/ownership`)
**Purpose:** Maps human-agent dependencies, identifying single points of failure, coverage gaps, and organizational concentration risks.
**Key Components:**
- **KPI Strip (`OwnershipOverview`):** High-level overview of ownership metrics.
- **Owner Concentration Chart (`ConcentrationBar`):** Visualizes which individuals hold the highest concentration of agent/workflow ownership.
- **Human-Agent Dependency Map (`DependencyPipeline`):** A visual pipeline showing the flow from People → Agents → AI Platforms → Workflows.
- **Human Dependency Risk Scorecards (`HumanDependencyRisks`):** Evaluates and scores the risk associated with human dependencies.
- **Organizational Relationship Map (`OrgRelationshipMap`):** Maps the relationships and hierarchies within the organization related to AI assets.
- **Detailed Owner Registry (`OwnershipList`):** A comprehensive list of all owners and their associated assets.

## 3. Risk Intelligence (`/risk`)
**Purpose:** Evaluates and categorizes the risk levels of all agents based on their operational impact, documentation, and dependencies.
**Key Components:**
- **Module Header (`RiskHeader`):** Displays the Organizational Health Score (OHS) gauge and related statistics.
- **Critical Risk Panel (`CriticalRiskPanel`):** Expandable detail cards focusing on the most critical, high-risk agents.
- **Risk Score Tables (`RiskScoreTable`):** Categorized lists of agents based on their risk scores:
  - **High Risk:** Score ≥ 40 (Escalate to department heads).
  - **Medium Risk:** Score ≥ 20 (Monitor and schedule review).
  - **Low Risk:** Score < 20 (Well-governed, continue maintaining).
- **Organizational Health Summary (`OrgHealthBanner`):** A summary banner highlighting key findings and overall health.

## 4. Dependency Map (`/map`)
**Purpose:** Provides a visual and interactive map of how agents depend on each other, detecting single points of failure (SPOFs) and simulating cascading risks.
**Key Components:**
- **Dependency KPIs (`DependencyKPIs`):** Displays total agents, total dependencies, SPOF count, and maximum cascade risk.
- **Interactive Flow Canvas (`FlowCanvas`):** A node-based visual graph illustrating the interconnections between agents and dependencies.
- **Dependency Table (`DependencyTable`):** A structured tabular view of all system dependencies.

## 5. What-If Simulation (`/simulation`)
**Purpose:** A sandbox environment for simulating cascading risks and visualizing the impact of potential changes or failures across the ecosystem.
**Key Components:**
- **Simulation Dashboard (`SimulationDashboard`):** An interactive interface allowing users to toggle the state of agents, tools, or dependencies and immediately see the cascading downstream effects on the network.

## 6. Recommendations (`/recommendations`)
**Purpose:** Generates actionable, prioritized insights and urgent tasks based on the data across all intelligence modules.
**Key Components:**
- **Module Header (`RecommendationHeader`):** Overview of the current recommendation status and KPIs.
- **Top 5 Most Urgent Actions (`Top5Urgent`):** Highlights the absolute most critical actions required immediately to mitigate severe risks.
- **Full Prioritized List (`RecommendationList`):** A comprehensive list of all generated recommendations, sorted by priority and impact.
- **Demo Summary (`DemoSummary`):** A specialized summary view designed for stakeholder presentations, condensing the most important insights.

## 7. AI Tool Intelligence (`/ai-tools`)
**Purpose:** Analyzes the risk, exposure, and impact of the underlying AI platforms and tools powering the organization's agents.
**Key Components:**
- **Module Header (`AIToolHeader`):** KPI strip summarizing tool intelligence metrics.
- **Critical Tool Panel (`CriticalToolPanel`):** Expandable cards detailing tools with critical risk levels.
- **Tool Risk Tables (`ToolRiskTable`):** Categorized lists of tools by risk:
  - **High Risk:** Score ≥ 45.
  - **Medium Risk:** Score ≥ 20.
  - **Low Risk:** Score < 20.
- **Outage Impact Panel (`OutageImpactPanel`):** A simulation interface showing exactly what breaks (agents/workflows) if a specific tool goes offline.
- **Department Exposure Table (`DeptExposureTable`):** Breakdown of risk exposure and total monthly spend per department.

## 8. Knowledge Risk (`/knowledge`)
**Purpose:** Identifies gaps in documentation and evaluates the concentration of institutional knowledge within specific individuals.
**Key Components:**
- **Module Header (`KnowledgeHeader`):** Overview and KPI strip for knowledge risk.
- **Concentration Risk Panel (`ConcentrationRiskPanel`):** Per-person expandable cards showing where knowledge is dangerously concentrated.
- **Departure Simulator (`DepartureSim`):** Simulates the impact on workflows and agents if a specific key person departs the organization.
- **Undocumented Assets Table (`UndocumentedAssetsTable`):** A comprehensive list of all assets (agents, workflows, tools) lacking proper documentation.
- **Knowledge Gaps Panel (`KnowledgeGapsPanel`):** Highlights critical gaps where an asset has neither documentation nor a designated backup owner.

## 9. Org Memory (`/memory`)
**Purpose:** Calculates the Institutional Memory Health Score (IMHS) and tracks the preservation status of organizational knowledge assets.
**Key Components:**
- **Module Header (`MemoryHeader`):** Displays the IMHS meter and KPI strip.
- **Memory Carriers Panel (`MemoryCarriersPanel`):** Scorecards for individuals who carry significant portions of critical organizational memory.
- **Lost Assets Panel (`LostAssetsPanel`):** Identifies "LOST" assets that have no assigned owner, no documentation, and no known recovery path.

## 10. Decision Intelligence (`/decision`)
**Purpose:** Audits and evaluates the quality of decisions made by agents within the system, tracking the "Decision Quality Index" (DQI).
**Key Components:**
- **Module Header (`DecisionHeader`):** Displays the Decision Quality Index (DQI) gauge and related KPIs.
- **Critical Decisions Panel (`CriticalDecisionsPanel`):** A side-by-side view highlighting decisions categorized as "HARMFUL" or "POOR".
- **Decision Trail Table (`DecisionTrailTable`):** A full audit log detailing the decision trail, allowing for deep dives into specific agent actions.
