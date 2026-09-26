# Ownership Intelligence — Deep Engineering & Architectural Audit Plan

> **Document Classification**: Engineering Audit Plan & Execution Protocol  
> **Subsystem**: Ownership Intelligence, Human Dependency Risk & Continuity Architecture  
> **Status**: Ready for Execution  

---

## 1. Audit Scope & Objectives

The purpose of this audit is to conduct an exhaustive, rigorous engineering evaluation of the **Ownership Intelligence** subsystem across the database, domain logic, Knowledge Graph, simulation engine, and user interfaces.

Following the methodology that transformed Predictive Risk into a peer-reviewed BBN/eIRWR system, this audit will investigate:
1. **Relational & Graph Parity**: Are Door 1 (Graph Reality via M01) and Door 2 (Domain Metrics via `derived.js`) mathematically and logically aligned, or do they produce contradictory ownership signals?
2. **Heuristic Fragility & Scale**: Are the linear constants in `humanDependencyRisk` ($27$ workflow scale, $30$ tool scale) robust under organizational growth, or do they suffer from alert fatigue and blindspots?
3. **Succession Sandbox Viability (D-70)**: What architectural gaps currently prevent the system from modeling hypothetical succession reassignments in-memory without polluting the production database?
4. **Data Integrity & Join Safety**: Are all ownership queries across the codebase immune to the `employees.id` vs `owners.id` identity collision trap?

---

## 2. Multi-Phase Audit Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: RELATIONAL & IDENTITY INTEGRITY AUDIT                         │
│ • Audit all SQL queries, Supabase joins, and foreign key constraints.  │
│ • Verify zero occurrences of employees.id vs owners.id join pollution. │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: MATHEMATICAL & ALGORITHMIC AUDIT                              │
│ • Audit humanDependencyRisk formula against extreme edge cases.        │
│ • Audit knowledgeConcentration weighting and tier boundary stability.  │
│ • Audit ownershipSpreadScore entropy calculation in Governance Pillar. │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: KNOWLEDGE GRAPH & BRAIN (M01) AUDIT                           │
│ • Audit graphLoader.js 'owns' edge generation across all 5 asset types.│
│ • Audit Brain Module M01 unowned asset discovery performance.          │
│ • Verify downstream consumers (M04, M20, M23) receive correct inputs.  │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: CONTINUITY SIMULATION & SUCCESSION (D-70) AUDIT               │
│ • Audit employeeLeaves() departure blast radius mechanics.             │
│ • Design the in-memory scratch-graph mutation engine for succession.   │
│ • Measure recalculation latency for hypothetical reassignments.        │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 5: FRONTEND PIPELINE & MUTATION AUDIT                            │
│ • Audit /ownership page data hydration, loading states, and error handling.│
│ • Audit live owner assignment (POST /api/agents/:id/owner) cache flow. │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Specific Audit Test Matrices

### 3.1 Edge Case Stress Testing
| Test ID | Scenario | Current Expected Behavior | Audit Focus |
| :--- | :--- | :--- | :--- |
| **TC-OWN-01** | **Orphaned Mega-Cluster**: Employee owning 10 agents departs. | All 10 agents lose owner ($O \to 0$). | Does `humanDependencyRisk` correctly detect this person as top risk before departure? |
| **TC-OWN-02** | **Asymmetric Backup**: Owner A backs Owner B, but B does not back A. | Directional backup recorded. | Is backup transitively traversed or strictly 1-to-1? |
| **TC-OWN-03** | **Zero-Asset Employee**: Active employee with 0 owned assets. | Score = 0, Tier = LOW. | Does the system filter them out or handle division by zero cleanly? |
| **TC-OWN-04** | **Unbacked Critical Workflow Hoarding**: 1 employee owns 100% of high-risk workflows. | High workflow exposure score. | Does the concentration score correctly saturate at CRITICAL? |
| **TC-OWN-05** | **Undeclared Owner**: Employee owns agents but has no entry in `owners` table. | Flagged as `undeclaredOwner`. | Does the UI show them with proper exposure warnings? |

---

## 4. Expected Deliverables

1. **`OWNERSHIP_AUDIT_REPORT.md`**: Detailed audit findings, logic verification, and failure modes identified.
2. **Defensive Patches / Fixes**: Correction of any discovered edge-case vulnerabilities or data inconsistencies.
3. **Mathematical Modernization Proposal**: Recommendations for evolving `humanDependencyRisk` into a probabilistic human bottleneck model.
4. **D-70 Succession Specification**: Architectural design for in-memory succession simulations.
