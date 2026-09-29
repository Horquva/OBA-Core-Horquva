# HORQUVA OBA CORE — MASTER SYSTEM BLUEPRINT & ARCHITECTURAL SPECIFICATION

> **Document Status**: Canonical Plan of Record & Architecture Blueprint  
> **Target Audience**: Core Engineering, Product Management, Forward Deployed Engineers (FDE), GTM  
> **Source Documents Consolidated**:  
> 1. *Horquva OBA Core System Guide* (Technical & Executive Operating Guide)  
> 2. *Horquva MVP Feature Additions* (Three Intelligence Layers Specification)  
> 3. *Horquva One Pager* (GTM, Value Proposition & Market ICP Roadmap)  
> **Author**: Forward Deployed & Go-To-Market Systems Engineering  
> **Effective Date**: September 2026  

---

## 1. Executive Summary & GTM Thesis

### 1.1 The Operational Problem
Modern enterprises do not run on code or org charts alone. They run on a complex, tangled socio-technical fabric: **People + Software + AI Agents + Models + Vendors + Workflows**.

In traditional organizations, when an employee resigns, a third-party API is deprecated, an AI model is swapped, or a SaaS workflow fails, leadership discovers their dependencies through downstream operational catastrophe. Knowledge is scattered across Jira, Slack channels, Git repositories, HR systems, and tacit employee memory. 

**Horquva OBA (Organisational Behavior & Architecture) Core** provides the definitive operating system for organizational continuity. It creates a single causal record of who exists, what they own, what depends on what, and what is unbacked or undocumented. It answers three executive questions with mathematical proof:
1. **What changed?** (Dependency change detection)
2. **What does it affect?** (Topological & cascading impact)
3. **What should we do?** (Defensible, risk-minimizing intervention)

```
                    ┌──────────────────────────────────────────────┐
                    │               THE HORQUVA EQUATION           │
                    └──────────────────────────────────────────────┘

  [1. MAP]        Who and what exists in the enterprise? (People, Agents, Systems, Workflows)
     │
  [2. CONNECT]    What depends on what? (Topological directed multigraph)
     │
  [3. DISCOVER]   What is hidden? (Tacit ownership, undeclared transitive dependencies)
     │
  [4. PRIORITIZE] Which assets matter most? (Dependency Criticality Intelligence)
     │
  [5. MEASURE]    Where is the enterprise fragile? (Dependency Concentration Intelligence)
     │
  [6. ASSESS]     If an asset disappears, can it be replaced? (Replaceability Intelligence)
     │
  [7. DETECT]     What changed across our people, code, models, vendors? (Change Intelligence)
     │
  [8. REASON]     What does the change cascade into downstream? (Impact Intelligence)
     │
  [9. SIMULATE]   What happens if X leaves or Y fails? (eIRWR Cascade Simulation)
     │
  [10. RECOVER]   How do we restore operational equilibrium? (D-70 Succession & Reassignment)
     │
  [11. RECOMMEND] What exact action should leadership take? (Automated Governance Actions)
     │
  [12. REMEMBER]  How is our fragility moving over time? (Volatility Intelligence)
```

### 1.2 Target Verticals & Ideal Customer Profiles (ICPs)
- **Technology Enterprises**: Tech stacks blending human developers, autonomous AI agents (Devin, Cursor, Copilot, internal tools), microservices, LLM models (OpenAI, Anthropic, Bedrock), and third-party SaaS vendors. High velocity of model swapping and engineering turnover creates silent single points of failure (SPOFs).
- **Healthcare & Hospital Systems**: Clinical and operational workflows dependent on specialized medical staff, EHR systems (Epic, Cerner), medical AI assistants, and hardware vendors. (Horquva supports operational continuity; it does not make clinical decisions).
- **Universities & Research Institutions**: Academic departments and research initiatives heavily concentrated around solitary grant holders, legacy proprietary lab platforms, and single-author scripts.
- **Enterprise & Regulated Sectors (Banking, Energy, Manufacturing)**: Stringent auditability, operational resilience (DORA, SOC 2, ISO 42001/27001), and supply chain continuity requirements.

### 1.3 The Commercial Wedge: Executive Dependency Scan
The initial commercial entry point for Horquva across all sectors is the **Executive Dependency Scan**. Delivered in under 48 hours via spreadsheet ingest or lightweight API connection, it generates a board-ready report revealing:
- Hidden single points of failure (people owning critical agents/workflows with zero backup).
- Severe vendor/model concentration (e.g., 85% of automated workflows silently routed through an unmonitored model).
- Knowledge vacuum risks (critical workflows operated by contractors or employees with near-zero documentation).

---

## 2. Core Architectural Principles & Invariants

```
                               ┌─────────────────────────┐
                               │   Supabase PostgreSQL   │
                               │    (Facts & Topology)   │
                               └────────────┬────────────┘
                                            │
                       ┌────────────────────┴────────────────────┐
                       │                                         │
                 [Door 1: Graph]                          [Door 2: Derived]
                       │                                         │
                       ▼                                         ▼
            ┌──────────────────────┐                  ┌──────────────────────┐
            │   Knowledge Graph    │                  │    Derived Engine    │
            │  (157 nodes, 423     │                  │  (9 live calculated  │
            │   directed edges)    │                  │      products)       │
            └──────────┬───────────┘                  └──────────┬───────────┘
                       │                                         │
                       │    ┌───────────────────────────────┐    │
                       └───►│      Domain Reception Desk    │◄───┘
                            │      (`backend/domain/`)      │
                            └───────────────┬───────────────┘
                                            │
                                            ▼
                            ┌───────────────────────────────┐
                            │    Unified Executive Score    │
                            │      & Evidence Envelopes     │
                            └───────────────┬───────────────┘
                                            │
                      ┌─────────────────────┴─────────────────────┐
                      ▼                                           ▼
            ┌───────────────────┐                       ┌───────────────────┐
            │  Web Application  │                       │  AI Reasoning     │
            │  (Next.js Client) │                       │  Agent (13 Tools) │
            └───────────────────┘                       └───────────────────┘
```

### Invariant 1: Facts are Stored; Conclusions are Calculated
The PostgreSQL database stores only atomic facts (employees, tools, agents, dependencies, documented status, observed runbook failures). **No calculated risk score, health index, or SPOF verdict is stored statically in the database.**
- *Advantage*: When an owner changes or an agent is documented, every score in the entire system updates immediately and deterministically without synchronization drift.
- *Requirement*: Every score must be accompanied by its causal derivation (Glass-Box Evidence).

### Invariant 2: Two Doors Out of the Database — And Only Two
No API route or frontend component may query database tables to construct private organizational topologies:
1. **Door 1 (Topological Structure)**: `graphLoader.js` reads entities and relationships to assemble the in-memory directed multigraph.
2. **Door 2 (Population & Live Metrics)**: `domain/derived.js` loads root tables once per request to compute population-level metrics.
- The **Flat Organization View** (`export-company.js`) is derived downstream from the Knowledge Graph, preventing divergence between graph-based and tabular dashboards.

### Invariant 3: Single Headline Score Computed in One Place
Every dashboard, executive briefing, and AI agent interface reads the single headline organizational health score calculated exclusively by `domain/derived.js:pillars()`. Local frontend recalculation or weighting is strictly prohibited.

---

## 3. Mathematical & Algorithmic Foundations

OBA Core rejects arbitrary point-penalty heuristics (`NO_OWNER: 35`, etc.) in favor of two peer-reviewed, mathematically validated engines:

### 3.1 Engine A: Enhanced Iterative Random Walk with Restart (eIRWR)
*Theoretical Basis*: Khan & Farea, *"eIRWR: Scalable Root Cause Analysis in Microservices"*, arXiv:2608.08073 (2026).

Models the organizational dependency network as a directed weighted graph $G = (V, E, \mathbf{W})$.
1. **Row-Normalized Transition Matrix**:
   $$w_{ij} = \frac{\lambda_{ij}}{\sum_k \lambda_{ik}}$$
   where $\lambda_{ij}$ represents the coupling criticality between dependent $v_i$ and dependency $v_j$.
2. **Anomaly-Conditioned Resilience**:
   $$R_i = R_{\text{base}} \cdot \exp(-\beta \cdot \hat{s}_i)$$
   where $R_{\text{base}} = 0.1$, $\beta = 2.0$, and $\hat{s}_i \in [0, 1]$ is the observed distress state of entity $i$.
3. **Structural Augmentation (Backward Edges & Self-Loops)**:
   $$\mathbf{A}_{\text{bwd}}[j, i] = \rho \cdot C_i \quad \text{for } (v_i, v_j) \in E, (v_j, v_i) \notin E$$
   $$\mathbf{A}_{\text{self}}[i, i] = \max\left(0, C_i - \max_{j \in \mathcal{N}(i)} M_{ij}\right)$$
   $$\mathbf{M} = \text{RowNorm}\left(\mathbf{M}_{\text{base}} \cdot \text{diag}(\mathbf{C}) + \mathbf{A}_{\text{bwd}} + \mathbf{A}_{\text{self}}\right)$$
   where $\rho = 0.3$, ensuring walkers can track root causes upstream while preserving local cascade mass.
4. **Power Iteration & Convergence**:
   $$\mathbf{r}^{(k+1)} = (1 - \alpha)\mathbf{M}\mathbf{r}^{(k)} + \alpha \mathbf{v}$$
   With teleportation parameter $\alpha = 0.15$. Because $\mathbf{M}$ is row-stochastic, convergence is guaranteed by the Banach Fixed-Point Theorem with linear rate $(1-\alpha)^k = (0.85)^k$, achieving numerical convergence ($\|r^{(k+1)} - r^{(k)}\|_1 < 10^{-6}$) in under 35 iterations ($<2\text{ ms}$).
5. **Continuous Blast Radius**:
   $$\text{BlastRadius}(v_i) = \sum_{j \neq i} r_j \cdot \kappa_j$$
   where $\kappa_j \in [0.2, 1.0]$ is the canonical criticality weight of node $j$.

### 3.2 Engine B: Discrete Bayesian Belief Network (BBN)
*Theoretical Basis*: Aquaro et al., *"A Bayesian Networks Approach to Operational Risk"*, arXiv:0906.3968; Kumar et al., arXiv:2505.06281.

For every operational asset, evaluates the posterior failure probability $P(\text{Risk} \mid O, D, S, U)$ across a 4-variable causal state tuple $\mathbf{X} \in \{0, 1, 2\}^4$:
- **$O$ (Ownership Resilience)**: $0 = \text{Unowned}$, $1 = \text{Solo (No Backup)}$, $2 = \text{Backed Up / Team}$
- **$D$ (Documentation Coverage)**: $0 = \text{Undocumented}$, $1 = \text{Partial}$, $2 = \text{Documented}$
- **$S$ (Runtime State)**: $0 = \text{Failed / Degraded}$, $1 = \text{Inactive / Warning}$, $2 = \text{Active / Healthy}$
- **$U$ (Upstream Cascade Exposure)**: $0 = \text{High Exposure } (r_i > 0.40)$, $1 = \text{Moderate Exposure } (r_i > 0.15)$, $2 = \text{Protected}$

**Two-Stage Ordered Logit CPT Formulation**:
1. Latent Distress Index $Z$:
   $$Z = 1.80 - 1.25\,O - 0.90\,D - 1.10\,S - 0.85\,U + 0.45(2 - O)(2 - D)$$
   *(Note the compounding interaction term $+0.45(2-O)(2-D)$ capturing the compounding risk of unowned AND undocumented assets).*
2. Cumulative Logistic Thresholds:
   $$P(\text{Critical} \mid \mathbf{X}) = \sigma(Z - 0.60)$$
   $$P(\text{Elevated} \mid \mathbf{X}) = \sigma(Z - (-1.80)) - P(\text{Critical} \mid \mathbf{X})$$
   $$P(\text{Nominal} \mid \mathbf{X}) = 1 - P(\text{Critical}) - P(\text{Elevated})$$
3. Calibrated Risk Score:
   $$\text{Score} = 100 \cdot P(\text{Critical} \mid \mathbf{X}) + 45 \cdot P(\text{Elevated} \mid \mathbf{X})$$
4. Glass-Box Factor Attribution ($\Delta P_X$):
   $$\Delta P_X = P(\text{Critical} \mid \mathbf{e}) - P(\text{Critical} \mid \mathbf{e} \setminus \{X\})$$
   Every contributing point maps directly to explicit database row IDs.

---

## 4. The Three Internal MVP Features & Volatility Layer

### Feature 1: Dependency Criticality & Replaceability Intelligence
Transforms raw dependency links into prioritized operational verdicts.

```
       ▲ HIGH
       │   QUADRANT II:                        QUADRANT I:
       │   CRITICAL BUT REPLACEABLE            THE VULNERABLE CORE
       │   (High Criticality, High Repl.)      (High Criticality, Low Repl.)
       │   • Standardized AI Models (GPT-4o)   • Custom in-house algorithms
CRITICALITY│   • Commodity Cloud DBs               • Solo-maintained legacy workflows
       │   Action: Maintain active fallbacks   Action: Immediate P0 succession plan
       │
       │   QUADRANT IV:                        QUADRANT III:
       │   PERIPHERAL COMMODITY                TACIT FRICTION
       │   (Low Criticality, High Repl.)       (Low Criticality, Low Repl.)
       │   • Slack webhooks                    • Obsolete internal dashboards
       │   • Internal utility bots             • Undocumented niche scrapers
       │   Action: Monitor & automate          Action: Deprecate or document
       └──────────────────────────────────────────────────────────►
         LOW                      REPLACEABILITY                     HIGH
```

#### Specification:
1. **Criticality Index ($C_i \in [0, 100]$)**:
   - Dynamic downstream blast radius computed via Engine A ($\sum r_j \kappa_j$).
   - Number of customer-facing workflows dependent on node $i$.
   - Financial or operational throughput traversing node $i$.
2. **Replaceability Index ($K_i \in [0, 100]$)**:
   - **Documentation Depth**: Complete runbooks and architecture docs (+40 pts).
   - **Market / Technical Alternates**: Drop-in alternative models/vendors exist (+30 pts).
   - **Organizational Bench Depth**: Secondary team members with validated skill overlap (+30 pts).
   - Output: Categorized into `EASY`, `MODERATE`, `DIFFICULT`, `IRREPLACEABLE`.

---

### Feature 2: Dependency Concentration Intelligence
Identifies systemic fragility where too much of the enterprise depends on too few entities.

```
[Person / Model / Vendor Node]
           ▲
           ├─── Workflow 1 (Critical) ──► Revenue Stream A
           ├─── Workflow 2 (High)     ──► Customer Support SLA
           ├─── AI Agent Alpha        ──► Inventory System
           └─── AI Agent Beta         ──► Billing Reconciliation
                 │
                 ▼
       [Concentration Alert: Ahmed silently owns 4 critical assets. ZERO backup.]
```

#### Specification:
1. **Multi-Entity Evaluation**:
   - **Human Concentration**: Individual employees holding disproportionate ownership across agents, workflows, and runbooks without named backups.
   - **Model / Engine Concentration**: Enterprise reliance on a single AI model family (e.g. OpenAI GPT-4) where an outage or API deprecation halts multiple independent departments.
   - **Vendor Concentration**: Third-party SaaS providers underpinning critical workflows without SLA redundancy.
2. **Metrics & Algorithms**:
   - **In-Degree Weighted Exposure ($E_v$)**: $\sum_{u \in \text{Dependents}(v)} \text{Criticality}(u)$.
   - **Single Point of Failure (SPOF) Ratio**: Assets with $E_v > \tau$ having $0$ registered backups.
   - **Herfindahl-Hirschman Index (HHI)** for Organizational Dependencies:
     $$\text{HHI} = \sum_{i=1}^N \left(\frac{E_{v_i}}{\sum E} \times 100\right)^2$$
     Banded into `LOW CONCENTRATION` ($<1500$), `MODERATE` ($1500 - 2500$), and `CRITICAL CHOKEPOINT` ($>2500$).

---

### Feature 3: Dependency Change → Impact Intelligence
Continuous topological surveillance that traces the downstream cascade of every schema and data update.

```
       [CHANGE EVENT DETECTED]
       (e.g., Engineer Yuki leaves OR AI Model swapped from Sonnet to Flash)
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │    Topological Graph Diff Engine    │
               │  Walks forward/downstream edges     │
               └──────────────────┬──────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
   [Downstream Workflows]   [Security & SLAs]      [Health Delta ΔOHI]
   3 Workflows Broken       1 Customer SLA Violated   Health drops: 78 → 54
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │   Actionable Mitigation Guidance    │
               │ • Reassign DeployBot to Sara        │
               │ • Reinstate fallback model config   │
               └─────────────────────────────────────┘
```

#### Specification:
1. **Change Event Interception**: Watches for mutation events on `agents`, `workflows`, `dependencies`, `ai_platforms`, and `employees`.
2. **Downstream Cascade Traversal**: Traces the blast radius using eIRWR seeded at the mutated node.
3. **Change Impact Record**:
   - `change_id`, `timestamp`, `initiator_id`.
   - `entity_type`, `entity_id`, `mutation_type` (`OWNER_REMOVED`, `MODEL_SWAPPED`, `DEPENDENCY_BROKEN`, `BACKUP_LOST`).
   - `downstream_impacts`: Array of affected workflows, agents, and customer-facing systems.
   - `risk_delta`: $\Delta \text{PredictedScore}$ and $\Delta \text{OrgHealthIndex}$.
   - `mitigation_recommendation`: Automated remediation actions.

---

### Longitudinal Volatility Intelligence (Pattern Reading over Feature 3)
*Crucial Architecture Decision*: **Volatility Intelligence is NOT a separate engine.** It is a longitudinal analytics layer that queries the historical records written by Feature 3.

```
┌────────────────────────────────────────────────────────────────────────┐
│             WEEKLY EXECUTIVE DEPENDENCY INTELLIGENCE BRIEFING          │
├────────────────────────────────────────────────────────────────────────┤
│ • 14 material dependency changes detected this week                    │
│ • 4 changes increased systemic exposure (+12.4% net risk)              │
│ • Critical Event: Deployment automation lost secondary owner           │
│ • Volatility Velocity: High churn in Customer Support workflows        │
│ • Recommended P0 Action: Assign backup owner to PaymentGateway Agent   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Continuity Simulation & D-70 Succession Architecture

Continuity simulation models what-if scenarios without mutating production state.

```
                                [Production Database]
                                          │
                                   (Deep Clone)
                                          ▼
                               [Scratch Graph Memory]
                                          │
                ┌─────────────────────────┴─────────────────────────┐
                ▼                                                   ▼
       [Simulate Loss (D-41)]                             [Simulate Succession (D-70)]
       "What if Ahmed leaves?"                            "Reassign Ahmed's assets to Sara"
                │                                                   │
                ▼                                                   ▼
       Blast Radius: 4 agents                             Health Delta: Drops by only 4 pts
       Severity: CRITICAL                                 Secondary Risk: Sara becomes SPOF
       Health Delta: -24 pts                                 Concentration: Sara owns 9 assets
                │                                                   │
                └─────────────────────────┬─────────────────────────┘
                                          │
                                          ▼
                         [Comparative Scenario Decision]
                         "Split Ahmed's assets between Sara
                          and Michael to avoid secondary SPOF"
```

### The Missing D-70 Succession Mechanic:
- **Baseline**: `employeeLeaves()` measures the destruction of removing an asset owner.
- **D-70 Mechanics**: Mutates the scratch graph by transferring owned agents and workflow runbooks to a named successor, clearing the departed employee's own backup slots, and re-running `pillars()` and `eIRWR`.
- **Secondary SPOF Detection**: Validates whether the reassignment inadvertently overloads the successor, creating an even worse concentration chokepoint.

---

## 6. Glass-Box Evidence Envelope & Gating (Spec 1)

Every score emitted by OBA Core must carry its proof.

```json
{
  "score": 78,
  "threatLevel": "CRITICAL",
  "calculatedAt": "2026-09-26T16:00:00Z",
  "modelVersion": "bbn-cpt-v1.2",
  "evidence": {
    "status": "computed",
    "sufficient": true,
    "coverage": 1.0,
    "records": [
      {
        "fact": "Agent has no designated backup owner",
        "sourceTable": "owners",
        "rowId": 14,
        "weight": 0.42
      },
      {
        "fact": "Depended upon by 3 critical customer workflows",
        "sourceTable": "dependencies",
        "rowIds": [102, 105, 118],
        "weight": 0.38
      }
    ]
  }
}
```

### The Ironclad Evidence Rule:
**If sufficient underlying database rows do not exist to validate a score, the system reports `insufficient_evidence` with `null` score. It is architecturally prohibited from synthesizing heuristic or unbacked scores.**

---

## 7. Cross-Platform Ingestion Layer (Spec 2 Architecture)

To connect external tools (Slack, Jira, GitHub, Agentforce, Zapier, n8n) starting next month, the ingestion architecture follows four strict stages:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        4-STAGE INGESTION PIPELINE                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   STAGE 1: RAW INGESTION STORE                                         │
│   Store raw JSON payload exactly as received (`raw_vendor_payloads`).  │
│   Ensures replayability, audit compliance, and schema drift isolation. │
│       │                                                                │
│       ▼                                                                │
│   STAGE 2: IDENTITY RESOLUTION BRIDGE                                  │
│   Map vendor ID (U1234, jira_987, zap_usr) to Horquva `canonical_id`   │
│   Anchored on verified Corporate SSO / Email (`identity_bridge`).      │
│       │                                                                │
│       ▼                                                                │
│   STAGE 3: VOCABULARY TRANSLATION & EVIDENCE GRADING                   │
│   Translate external primitives into Horquva Directed Graph:           │
│   • Direct Evidence: Jira project lead → `owns`                        │
│   • Inferred Evidence: Slack multi-channel co-presence → `collaborates`│
│   • Stated Evidence: Direct manager attribution → `backup_owner`       │
│       │                                                                │
│       ▼                                                                │
│   STAGE 4: ATOMIC GRAPH UPDATE                                         │
│   Commit normalized entities and relationships to Supabase PostgreSQL. │
│   Trigger Feature 3 (Change → Impact) downstream walk.                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Ingestion Source Matrix:
| Source | Ingestion Mechanism | Initiator | Signal Captured | Evidence Grade |
| :--- | :--- | :--- | :--- | :--- |
| **HR / Workday** | CSV Upload / API | Customer Push / Daily | Org Chart, Management Tree | Direct (Conclusive) |
| **Jira** | REST API Poll | Scheduled Pull | Project Ownership, Incident Issues | Direct / Activity Log |
| **Slack** | Webhook / API | Event / Daily | User Channels, Collaboration Weight | Inferred (Weighted) |
| **Zapier** | Webhook Receiver | Automation Event | Zaps, Automation Triggers | Direct |
| **n8n / Make** | REST API | Scheduled Pull | Workflow Nodes, Webhook Callers | Direct |
| **GitHub** | GitHub App / Webhook| Push / PR Event | Repo Owners, Workflow CI Actions | Direct |
| **Agentforce / Cloud** | Cloud SDK / API | Nightly Pull | Deployed Agent Topology, Models | Direct |

---

## 8. Enterprise Production Readiness Gates (SOC 2 / ISO 42001)

To transition from an internal build to an enterprise SaaS product, four security and operational gates must be cleared:

### Gate 1: Authentication & Tenant Isolation (Before First External Login)
- **Token Security**: Eliminate localStorage JWTs. Migrate session tokens to secure, `httpOnly`, `SameSite=Strict`, encrypted HTTPS cookies.
- **Security Headers**: Mount `helmet` middleware enforcing CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security`.
- **Tenant Isolation**: Replace the startup warning in `orgGuard.js` with hard database row-level security (RLS) or physical deployment isolation, preventing cross-tenant data exposure.

### Gate 2: Authorization & Unified Audit Logging (Before Agent Writes)
- **RBAC on Write Operations**: Enforce role checks (`ADMIN`, `OPERATOR`, `VIEWER`) across all state-mutating endpoints (`/api/agents`, `/api/ownership/assign`, `/api/tools/reassign`).
- **Unified Audit Ledger**: A single append-only `audit_log` table recording user logins, permissions, configuration updates, and AI agent autonomous mutations.

### Gate 3: Distributed Rate Limiting (Multi-Instance Scaling)
- Migrate in-memory sliding window counters in `backend/middleware/` to Redis/Upstash backing store.

### Gate 4: Continuous Security & Supply Chain (CI/CD)
- Automate Dependabot / Snyk vulnerability scanning, Gitleaks secret detection, and automated SBOM generation in `.github/workflows/ci.yml`.

---

## 9. AI Agent Infrastructure & Operating Economics

The AI conversational assistant acts as an executive intelligence co-pilot.

```
                      [User Prompt: "Who owns DeployBot?"]
                                       │
                                       ▼
                      ┌─────────────────────────────────┐
                      │      Model Classifier & Router  │
                      └────────────────┬────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
     [Lookup Tier]             [Reasoning Tier]           [Simulation Tier]
    Gemini 3.1 Flash          Claude Sonnet 5 /          Claude Opus 5 /
    ($0.25 / $1.50 per M)     Gemini 3.1 Pro             GPT-5.6 Sol
            │                          │                          │
            └──────────────────────────┼──────────────────────────┘
                                       │
                                       ▼
                      ┌─────────────────────────────────┐
                      │    13 Narrow Factual Tools      │
                      │  (Never handed raw DB access)   │
                      └────────────────┬────────────────┘
                                       │
                                       ▼
                      ┌─────────────────────────────────┐
                      │     Deterministic Fact Return   │
                      │  Enveloped with Causal Evidence │
                      └─────────────────────────────────┘
```

### Cost Model & Token Budget:
- **Lookup Turn**: ~1,500 input / 400 output tokens $\to \approx \$0.003 - \$0.01$
- **Reasoning Turn**: ~8,000 input / 1,500 output tokens $\to \approx \$0.02 - \$0.05$
- **Simulation Turn**: ~9,000 input / 3,000 output tokens $\to \approx \$0.05 - \$0.12$
- **Cost Controls**:
  1. **Prompt Caching**: Cache static system instructions and the 13 OpenAPI tool schemas (reducing prompt cost by ~90% after turn 1).
  2. **Thinking Effort Budgeting**: Enforce low reasoning effort for lookups; reserve high reasoning effort exclusively for multi-step continuity simulations.
  3. **Hosting Baseline**: Flat $\approx \$75/\text{month}$ (Supabase $25 + Render $30 + Vercel $20).

---

## 10. Execution Roadmap & Sequence

To achieve feature completion by end of month and unlock external tool connectivity:

```
  PHASE 1: FOUNDATION & EVIDENCE REPAIR (Days 1–5)
  ├── 1.1 Fix frontend bypass: replace `evidenceGate(agents, () => true)` with real criteria
  ├── 1.2 Implement Gate 1 Security: httpOnly cookies & Helmet middleware
  ├── 1.3 Create `score_history` & `evidence_records` database schema (Spec 1)
  └── 1.4 Wire unified audit log across all write paths

  PHASE 2: INTERNAL INTELLIGENCE EXPANSION (Days 6–15)
  ├── 2.1 Build Feature 1: Criticality + Replaceability Intelligence Engine
  ├── 2.2 Build Feature 2: Dependency Concentration Intelligence Engine
  ├── 2.3 Expose D-70 Succession Simulation API route (`/api/simulations/reassign`)
  └── 2.4 Unify `humanDependencyRisk` with Engine A/B math (deprecate heuristic scales 27/30)

  PHASE 3: CHANGE DETECTION & IMPACT INTELLIGENCE (Days 16–22)
  ├── 3.1 Build Feature 3: Database mutation listener & Graph Diff Engine
  ├── 3.2 Wire downstream outward impact traversal using eIRWR
  ├── 3.3 Implement Longitudinal Volatility summary generator
  └── 3.4 Expose Executive Dependency Scan endpoint

  PHASE 4: INGESTION STAGING INFRASTRUCTURE (Days 23–30)
  ├── 4.1 Create `raw_vendor_payloads` and `identity_bridge` schema
  ├── 4.2 Build generic Ingestion Webhook Receiver & CSV Roster Importer
  ├── 4.3 Prepare connector adapters: Jira, Slack, GitHub, Agentforce, Zapier/n8n
  └── 4.4 Final verification pass against full test suite
```

---
*End of Horquva OBA Core Blueprint.*
