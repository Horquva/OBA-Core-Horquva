# Ownership Intelligence — Comprehensive Engineering & Architectural Analysis

> **Subsystem**: Ownership Intelligence, Human Dependency Risk & Continuity Architecture  
> **Source Documents**:
> 1. [Horquva_OBA_Core_System_Guide (1).docx](file:///d:/OBA-Core-Horqu/Horquva_OBA_Core_System_Guide%20(1).docx) (Part 1.1, 1.4 & Part 4)
> 2. Knowledge Graph Reality Layer ([`backend/brain/modules/implementations.js`](file:///d:/OBA-Core-Horqu/backend/brain/modules/implementations.js) `M01`)
> 3. Domain Calculation Layer ([`backend/domain/derived.js`](file:///d:/OBA-Core-Horqu/backend/domain/derived.js) `humanDependencyRisk`, `knowledgeConcentration`)

---

## 1. Executive Summary & Theoretical Purpose

In accordance with **Horquva OBA Core System Guide** (Part 1.1 & Part 4), modern enterprises operate on a hybrid fabric of human talent and autonomous software agents. Workflows are owned by individuals, call AI agents, depend on external platforms, and quietly support critical business departments.

When an employee departs or is incapacitated, organizations frequently discover their hidden dependencies through catastrophe. **Ownership Intelligence** addresses two existential questions:
1. **"Who is accountable for what?"** (Accountability, Governance & Attribution)
2. **"What breaks if this person leaves?"** (Continuity, Human SPOFs & Concentration Risk)

The system builds a defensible, auditable graph of human-asset relationships and computes systemic exposure across **AI agents, automated workflows, third-party AI platforms/tools, knowledge assets, and business decisions**.

---

## 2. The Architectural "Two-Door" Rule

Ownership Intelligence operates under OBA Core's **Two-Door structural principle** (Section 1.4 of the System Guide):

```
                               ┌────────────────────────────────────────┐
                               │            SUPABASE DATABASE           │
                               │ (employees, agents, tool_ownership...) │
                               └───────────────────┬────────────────────┘
                                                   │
                   ┌───────────────────────────────┴───────────────────────────────┐
                   │                                                               │
         [ DOOR 1: STRUCTURE ]                                           [ DOOR 2: LIVE METRICS ]
                   │                                                               │
                   ▼                                                               ▼
       ┌───────────────────────┐                                       ┌───────────────────────┐
       │    KNOWLEDGE GRAPH    │                                       │     DERIVED LAYER     │
       │  (graphLoader.js)     │                                       │     (derived.js)      │
       └───────────┬───────────┘                                       └───────────┬───────────┘
                   │                                                               │
                   ▼                                                               ▼
       ┌───────────────────────┐                                       ┌───────────────────────┐
       │   BRAIN MODULE M01    │                                       │  humanDependencyRisk  │
       │ (Asset-First Coverage)│                                       │ knowledgeConcentration│
       └───────────┬───────────┘                                       └───────────┬───────────┘
                   │                                                               │
                   └───────────────────────────────┬───────────────────────────────┘
                                                   │
                                                   ▼
                                       ┌───────────────────────┐
                                       │   HTTP API ROUTES     │
                                       │   /api/ownership      │
                                       └───────────┬───────────┘
                                                   │
                                                   ▼
                                       ┌───────────────────────┐
                                       │    FRONTEND UI        │
                                       │    /ownership         │
                                       └───────────────────────┘
```

### Door 1: The Graph Reality Layer (Asset-First)
* **Files**: [`backend/brain/knowledge/graphLoader.js`](file:///d:/OBA-Core-Horqu/backend/brain/knowledge/graphLoader.js) & [`backend/brain/modules/implementations.js`](file:///d:/OBA-Core-Horqu/backend/brain/modules/implementations.js#L91-L116) (`M01`).
* **Philosophy**: **Asset-First**. It starts from the entity (agent, workflow, tool, system, knowledge asset) and checks whether it has incoming `owns` edges from a valid human entity.
* **Benefit**: Guarantees that **unowned, orphaned, or abandoned assets can never be concealed**, because the iteration population is the set of all assets.

### Door 2: The Domain Derived Layer (Owner-First)
* **Files**: [`backend/domain/derived.js`](file:///d:/OBA-Core-Horqu/backend/domain/derived.js#L580-L720) & [`backend/routes/ownership.js`](file:///d:/OBA-Core-Horqu/backend/routes/ownership.js).
* **Philosophy**: **Person-First**. It iterates through human employees to calculate cumulative organizational exposure (the sum of fragility across all agents, workflows, and tools that a specific person carries).
* **Benefit**: Answers executive HR and continuity questions regarding key-person dependency, workload concentration, and missing backups.

---

## 3. Data Inputs & The Relational Identity Trap

Ownership Intelligence queries 6 relational tables in Supabase:

| Table | Entity Represented | Primary Keys & Joins |
| :--- | :--- | :--- |
| `employees` | Human workforce roster | `id` (serial integer), `name`, `role`, `department` |
| `owners` | Subset of employees with declared backup roles | `id`, `employee_id -> employees.id`, `backup_owner` (name), `risk` |
| `agents` | Autonomous software agents | `id`, `owner_id -> employees.id`, `status`, `risk` |
| `workflow_runbooks` | Operational procedures & pipelines | `id`, `workflow_id -> workflows.id`, `owner_id -> employees.id` |
| `tool_ownership` | Third-party AI platform / tool licenses | `platform_id -> ai_platforms.id`, `employee_id -> employees.id` |
| `knowledge_assets` | Institutional documentation & domain silos | `id`, `owner_id -> employees.id`, `documented` |

> [!WARNING]
> ### The ID-Space Join Trap (`employees.id` vs `owners.id`)
> A critical bug in legacy modules was joining `agents.owner_id` directly onto `owners.id`.
> * `employees` has $N$ rows (IDs: $1, 2, 3, \dots, N$).
> * `owners` is a 10-row subset table (IDs: $1, 2, 3, \dots, 10$) where `owners.employee_id` points to `employees.id`.
> Because both ID spaces start at integer $1$, joining `agents.owner_id = owners.id` did not cause an SQL syntax error—it silently mapped agents to the **wrong human being**.
> The modern architecture strictly enforces that all joins resolve via `employees.id`, using `owners` solely as an auxiliary metadata lookup for declared backup names.

---

## 4. Key Algorithms & Mathematical Formulations

### 4.1 Brain Module M01 — Graph Ownership Coverage
In [`backend/brain/modules/implementations.js`](file:///d:/OBA-Core-Horqu/backend/brain/modules/implementations.js#L92-L116):
* Traverses the Knowledge Graph $G = (V, E)$.
* Identifies all nodes $a \in V_{\text{assets}}$ (agents, workflows, tools, systems, knowledge areas).
* Queries incoming edges: $E_{\text{owns}} = \{ (u, a) \in E \mid \text{type} = \text{'owns'} \}$.
* Computes enterprise ownership coverage:
  $$\text{Coverage}_{\text{M01}} = \frac{|V_{\text{assets}}| - |\{ a \in V_{\text{assets}} \mid \text{deg}_{\text{in, owns}}(a) = 0 \}|}{|V_{\text{assets}}|}$$
* Feeds downstream into:
  * **M04 (Recommendation Engine)**: Prioritizes unowned critical assets for immediate ownership assignment.
  * **M20 (Maturity Index)**: Blends $50\%$ ownership coverage with $50\%$ tool governance.
  * **M23 (Constitutional Rules)**: Enforces the enterprise target $\text{Coverage} \ge 0.90$.

### 4.2 `humanDependencyRisk` — Multi-Asset Human Fragility
In [`backend/domain/derived.js`](file:///d:/OBA-Core-Horqu/backend/domain/derived.js#L592-L648):
Evaluates the total institutional risk concentrated in employee $e$:
$$\text{TotalRiskScore}_e = \text{clamp}\Big(\text{AgentRisk}_e + \text{WorkflowExposure}_e + \text{ToolExposure}_e\Big)$$

Where:
1. **$\text{AgentRisk}_e$**: The arithmetic mean of Bayesian failure probabilities (`predictedScore`) for all agents owned by $e$:
   $$\text{AgentRisk}_e = \frac{1}{|\mathcal{A}_e|} \sum_{a \in \mathcal{A}_e} \text{predictedScore}(a)$$
2. **$\text{WorkflowExposure}_e$**: Scaled critical workflow burden:
   $$\text{WorkflowExposure}_e = \frac{|\{ w \in \mathcal{W}_e \mid \text{risk}(w) \ge \text{HIGH} \}|}{|\mathcal{W}_e|} \times 27$$
3. **$\text{ToolExposure}_e$**: Scaled unbacked tool burden:
   $$\text{ToolExposure}_e = \frac{|\{ t \in \mathcal{T}_e \mid \neg\text{hasBackup}(t) \}|}{|\mathcal{T}_e|} \times 30$$

### 4.3 `knowledgeConcentration` — Criticality-Weighted Asset Hoarding
In [`backend/domain/derived.js`](file:///d:/OBA-Core-Horqu/backend/domain/derived.js#L679-L719):
Measures systemic asset hoarding across the organization. Assets are weighted by their operational criticality:
$$\mathbf{W} = \{ \text{critical}: 4, \; \text{high}: 2, \; \text{medium}: 1, \; \text{low}: 0.5, \; \text{unknown}: 1 \}$$
For employee $e$:
$$\text{ConcentrationScore}_e = \frac{\sum_{x \in \mathcal{X}_e} \mathbf{W}[\text{criticality}(x)]}{\sum_{x \in \mathcal{X}_{\text{org}}} \mathbf{W}[\text{criticality}(x)]} \times 100$$
Tiers: $\ge 90 \to \text{CRITICAL}$, $\ge 55 \to \text{HIGH}$, $\ge 30 \to \text{MEDIUM}$, $< 30 \to \text{LOW}$.

### 4.4 Human SPOF (Single Point of Failure) Detection
In [`backend/routes/ownership.js`](file:///d:/OBA-Core-Horqu/backend/routes/ownership.js#L14-L80):
An employee is designated as a **Human SPOF** when they lack a designated backup while controlling a critical mass of systems:
$$\text{isHumanSpof}_e = \neg\text{hasBackup}_e \land (|\mathcal{A}_e| \ge 3)$$
Such individuals represent catastrophic single points of failure for the enterprise.

### 4.5 `ownershipSpreadScore` (Governance Pillar)
In [`backend/domain/derived.js`](file:///d:/OBA-Core-Horqu/backend/domain/derived.js#L1515-L1535):
Measures decentralization entropy. If one individual owns 100% of the agents, ownership coverage is $1.0$, but spread is $0.0$. The spread score rewards healthy distribution across distinct team members.

---

## 5. Continuity Simulation Connection (Part 4 of System Guide)

In [`backend/domain/simulations.js`](file:///d:/OBA-Core-Horqu/backend/domain/simulations.js#L210-L245), Ownership Intelligence directly provides the state for **Continuity Simulation**:

```
                       CONTINUITY SIMULATION FLOW
┌────────────────────────────────────────────────────────────────────────┐
│ 1. INCIDENT SEEDING (Departure)                                        │
│    • Employee Ahmed leaves the company.                                │
│    • All owned agents, workflows, and tools lose their owner (O -> 0). │
├────────────────────────────────────────────────────────────────────────┤
│ 2. CASCADE IMPACT CALCULATION (eIRWR)                                  │
│    • eIRWR walks downstream dependency graph.                          │
│    • Continuous failure mass computes organizational blast radius.     │
├────────────────────────────────────────────────────────────────────────┤
│ 3. HYPOTHETICAL REASSIGNMENT (D-70 Mechanics)                          │
│    • In-memory scratch graph reassigns Ahmed's assets to Sara.         │
│    • Recalculates Sara's new concentration score and Human SPOF status.│
│    • Verifies whether the proposed succession fix resolves risk        │
│      or merely shifts the bottleneck.                                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Frontend Presentation Layer (`/ownership`)

The frontend (`frontend/app/ownership/page.tsx`) renders this intelligence across 6 purpose-built components:
1. **`OwnershipOverview.tsx`**: Executive KPI cards tracking Total Owners, Owners without Backup, Overloaded Owners, and Human SPOFs.
2. **`ConcentrationBar.tsx`**: Proportional visual heatmap illustrating asset distribution across team members.
3. **`HumanDependencyRisks.tsx`**: Comprehensive risk profiles breaking down each individual's agent risk, workflow load, and tool exposure.
4. **`OwnershipList.tsx`**: Interactive table with live assignment dropdowns to reassign owners and resolve unbacked gaps.
5. **`DependencyPipeline.tsx`**: End-to-end pipeline connecting Humans $\to$ Agents $\to$ Dependent Workflows.
6. **`OrgRelationshipMap.tsx`**: Interactive topological graph visualizing human-to-asset connectivity.

---

## 7. Clarification Questions for Upcoming Deep Audit

To guide the deep architectural and engineering audit, the following three questions require stakeholder alignment:

1. **Succession Sandbox Engine (D-70)**:
   * Should the upcoming audit include building/formalizing the in-memory scratch graph mutation engine for testing hypothetical ownership reassignments before committing them to the live database?
2. **Granularity of Backup Assignments**:
   * Currently, the database defines backup coverage at the *owner level* (`owners.backup_owner`). Should the audit roadmap recommend supporting granular per-agent or per-workflow backups (e.g., Agent A backed by Person X, Agent B backed by Person Y)?
3. **Mathematical Modernization of `humanDependencyRisk`**:
   * Following the successful conversion of the risk engine to BBN/eIRWR, should we audit replacing the linear weights in `humanDependencyRisk` ($27$ workflow scale, $30$ tool scale) with a probabilistic human overload/bottleneck model?
