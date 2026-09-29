# OBA Core: Academic Predictive Risk & Cascade Engine Implementation Plan

> **Target Version**: v2.0-academic  
> **Target Date**: Product Pilot Release  
> **Status**: Approved for Implementation  
> **Author**: AI Product Engineering Team  
> **Academic References**: arXiv:2608.08073 (eIRWR), arXiv:0906.3968 (BBN Operational Risk), arXiv:2505.06281 (BBN Cascading Risk)  
> **Code Repositories**: [`pgmpy/pgmpy`](https://github.com/pgmpy/pgmpy), [`scikit-network/scikit-network`](https://github.com/scikit-network/scikit-network)

---

## 1. Executive Summary & Objective

This document defines the complete engineering specification for replacing OBA Core's legacy risk modeling system.

Currently, OBA Core determines organizational risk through an authored point-penalty heuristic lookup table (`RISK_FACTORS` in `derived.js`) and models failure propagation through an unweighted, unattenuated breadth-first search (`cascadeReach` in `derived.js` and `cascadeFrom` in `simulations.js`). 

These legacy implementations suffer from severe mathematical invalidity:
1. **Linear Additive Fallacy**: Uncorrelated addition of arbitrary points (e.g., $35 + 25 + 18 = 78$) with an artificial ceiling (`clamp(..., 100)`).
2. **Self-Referential Circularity**: `INTRINSIC_CRITICAL` reads an agent's pre-existing database risk label and awards 20 penalty points to its own risk calculation.
3. **Deterministic Cascade Hallucination**: Assuming 100% failure transmission across all graph hops without attenuation, resilience absorption, or damping.
4. **Lack of Probabilistic Calibration**: Scores are not probabilities and cannot be audited, mathematically justified, or used for regulatory operational risk compliance.

We replace this legacy stack with a **Two-Engine Core**:
* **Engine A: Structural Blast Radius & Cascading Impact via Enhanced Random Walk with Restart (eIRWR)**  
  *Directly implementing Algorithm 1 from arXiv:2608.08073 (Khan & Farea, Aug 2026).*
* **Engine B: Asset Failure Probability & Glass-Box Explainability via Discrete Bayesian Belief Networks (BBN)**  
  *Directly implementing Causal DAG inference from arXiv:0906.3968 & arXiv:2505.06281 using `pgmpy` v1.1.2.*

---

## 2. Reverse-Engineering the Legacy Codebase: What Exists Today

### 2.1 The Legacy Predictive Risk Pipeline
Located in [`backend/domain/derived.js`](file:///d:/OBA-Core-Horqu/backend/domain/derived.js#L420-L589), the `predictiveRisk(roots)` function processes in-memory table dumps:

```javascript
// LEGACY HEURISTIC IN backend/domain/derived.js
const RISK_FACTORS = {
  NO_OWNER: 35,
  SINGLE_OWNER: 30,
  DEPENDENTS_MANY: 25,
  DEPENDENTS_FEW: 12,
  CRITICAL_WORKFLOW: 27,
  UNDOCUMENTED: 18,
  STATUS_FAILED: 25,
  STATUS_INACTIVE: 10,
  INTRINSIC_CRITICAL: 20,
  INTRINSIC_HIGH: 12,
}
```

#### Flaws Identified:
- **Flaw 1 (Additivity)**: If an agent is unowned (+35), has high dependencies (+25), and is undocumented (+18), its score is $35 + 25 + 18 = 78$. If it is also in a failed state (+25), the sum is 103, which is arbitrarily clamped to 100.
- **Flaw 2 (Independence Violation)**: The factors are treated as mutually independent. In reality, documentation gaps and absence of ownership compound failure risk multiplicatively, not additively.
- **Flaw 3 (Circular Reasoning)**: Lines 550–556 inspect `agent.risk === 'critical'` to add 20 points to `predictedScore`, creating an ungrounded feedback loop.

### 2.2 The Legacy Cascade Reach
Located in [`backend/domain/derived.js`](file:///d:/OBA-Core-Horqu/backend/domain/derived.js#L154-L167):

```javascript
// LEGACY UNWEIGHTED BFS
function cascadeReach(startType, startId, { dependentsOf, key }) {
  const seen = new Set()
  const queue = [[startType, startId]]
  while (queue.length) {
    const [t, id] = queue.shift()
    for (const dep of dependentsOf.get(key(t, id)) || []) {
      const k = key(dep.type, dep.id)
      if (seen.has(k)) continue
      seen.add(k)
      queue.push([dep.type, dep.id])
    }
  }
  return seen.size
}
```

#### Flaws Identified:
- **Flaw 1 (Binary Percolation)**: If Entity $A$ connects to Entity $B$, $B$ is assumed to fail with $P=1.0$.
- **Flaw 2 (Unweighted Edges)**: A high-throughput API dependency is weighted identically to a monthly informational logging sync.
- **Flaw 3 (No Damping / Absorption)**: Intermediate buffers, redundant services, and circuit breakers cannot absorb or stop the cascade.

---

## 3. Academic Engine Specifications

### 3.1 Engine A: Enhanced Random Walk with Restart (eIRWR)
*Paper: Khan & Farea, "eIRWR: Enhanced Iterative Random Walk with Restart for Scalable Root Cause Analysis in Microservices", arXiv:2608.08073 (2026).*

#### 3.1.1 Mathematical Formulation
Let the enterprise architecture be represented by a directed graph $G = (V, E, W)$:
- $V$: Nodes representing Agents, Workflows, Tools, and Employees.
- $E$: Directed dependencies $(u, v)$ where $u$ depends on $v$.
- $W \in \mathbb{R}^{N \times N}$: Row-normalized weight matrix where $w_{ij}$ represents the coupling criticality between $v_i$ and $v_j$:
  $$w_{ij} = \frac{\lambda_{ij}}{\sum_{k=1}^N \lambda_{ik}}$$
  where $\lambda_{ij}$ is the edge weight derived from dependency criticality (`critical` = 3.0, `high` = 2.0, `medium` = 1.0, `low` = 0.5).

#### 3.1.2 Adaptive Resilience Damping
Unlike standard Personalized PageRank (PPR), eIRWR introduces an anomaly-conditioned resilience vector $R \in [0, 1]^N$:
$$R_i = R_{\text{base}} \cdot \exp(-\beta \cdot \hat{s}_i)$$
where:
- $R_{\text{base}} = 0.20$ (baseline organizational absorption capacity).
- $\hat{s}_i = s_i / \max_j s_j$ is the normalized distress/vulnerability score of node $i$.
- $\beta = 1.5$ is the sensitivity coefficient.

The base transition matrix is:
$$M_{\text{base}} = \text{diag}(\mathbf{1} - R) \cdot W$$

#### 3.1.3 Backward Transitions and Self-Loops
To allow probability mass to accumulate at true cascade sources and traverse upstream callers:
1. **Backward Edge Augmentation**: For each edge $(v_i, v_j) \in E$:
   $$A_{\text{bwd}}[j, i] = \rho \cdot C_i$$
   where $\rho = 0.15$ is the backward discount factor, and $C_i$ is the normalized belief score of node $i$.
2. **Self-Loop Augmentation**: For suspicious source nodes:
   $$A_{\text{self}}[i, i] = \max\left(0, C_i - \max_{j \in \mathcal{N}(i)} M_{ij}\right)$$
3. **Combined Row-Normalized Operator**:
   $$M = \text{RowNorm}\left(M_{\text{base}} \cdot \text{diag}(C) + A_{\text{bwd}} + A_{\text{self}}\right)$$

#### 3.1.4 Power-Law Teleportation Sharpening
The teleportation (restart) vector $v$ is sharpened using adaptive power exponent $q$:
$$v = \frac{b^{q_{\text{adapt}}}}{\|b^{q_{\text{adapt}}}\|_1}$$
$$q_{\text{adapt}} = 1 + (q - 1) \cdot \min\left(1, \max\left(0, \frac{\sigma - 5}{15}\right)\right)$$
where $\sigma = b_{\max} / \bar{b}$ is the signal-to-noise ratio. Default parameters: $q = 2.5$, restart probability $\alpha = 0.15$.

#### 3.1.5 Outer Loop Belief Refinement & Power Iteration
```
Algorithm 1: eIRWR Power Iteration
Input: Matrix W, Seed Vector s_obs, Parameters (alpha=0.15, beta=1.5, rho=0.15, q=2.5, eps=1e-6)
Output: Steady-state risk cascade vector r

1. Normalize seed: s_hat = s_obs / max(s_obs)
2. Compute resilience: R = R_base * exp(-beta * s_hat)
3. M_base = diag(1 - R) * W
4. Initialize r = s_obs
5. For t = 1 to n_outer:
6.    b = (1 - mu) * s_obs + mu * r
7.    C = b / max(b)
8.    Construct M = RowNorm(M_base * diag(C) + A_bwd + A_self)
9.    Compute sharpened teleportation v = b^(q_adapt) / ||b^(q_adapt)||_1
10.   Repeat (Inner Power Iteration):
11.       r_next = (1 - alpha) * M * r + alpha * v
12.   Until ||r_next - r||_1 < eps
13.   r = r_next
14. Return r
```

#### 3.1.6 Continuous Blast Radius Metric
For any seed entity $v_i$, the continuous blast radius is computed as:
$$\text{BlastRadius}(v_i) = \min\left(100, 100 \cdot \sum_{j \neq i} r_j \cdot \kappa_j\right)$$
where $\kappa_j$ is the normalized criticality weight of affected node $j$ ($\kappa \in [0.2, 1.0]$).

---

### 3.2 Engine B: Discrete Bayesian Belief Network (BBN)
*Papers: Aquaro et al., "A Bayesian Networks Approach to Operational Risk", arXiv:0906.3968; Kumar et al., "A Data-Driven Probabilistic Framework for Cascading Risk Analysis Using Bayesian Networks", arXiv:2505.06281.*

#### 3.2.1 Causal DAG Architecture
For each managed entity (Agent, Workflow, Tool), risk is evaluated across a 5-variable causal DAG:

```
    [Ownership Resilience] (O)       [Documentation Coverage] (D)
             │                                   │
             ▼                                   ▼
      ┌─────────────────────────────────────────────────┐
      │          Asset Failure Probability (R)          │
      └─────────────────────────────────────────────────┘
             ▲                                   ▲
             │                                   │
      [Runtime State] (S)            [Cascading Exposure] (U)
                                       (From Engine A)
```

#### 3.2.2 Variable State Space & Cardinality
1. **Ownership Resilience ($O$)** $\in \{0: \text{Unowned}, 1: \text{SingleOwnerNoBackup}, 2: \text{FullyBackedUp}\}$ (Cardinality: 3)
2. **Documentation Coverage ($D$)** $\in \{0: \text{Undocumented}, 1: \text{PartialDoc}, 2: \text{FullyDocumented}\}$ (Cardinality: 3)
3. **Runtime Operational State ($S$)** $\in \{0: \text{Failed}, 1: \text{Inactive}, 2: \text{Active}\}$ (Cardinality: 3)
4. **Upstream Cascading Exposure ($U$)** $\in \{0: \text{HighExposure}, 1: \text{ModerateExposure}, 2: \text{Protected}\}$ (Cardinality: 3)
   - Derived directly from Engine A: If upstream continuous cascade score $> 0.40 \to 0$; $> 0.15 \to 1$; else $2$.
5. **Asset Risk Level ($R$)** $\in \{0: \text{Nominal}, 1: \text{Elevated}, 2: \text{Critical}\}$ (Target Variable, Cardinality: 3)

#### 3.2.3 Conditional Probability Tables (CPTs)
The joint probability distribution factorizes according to the Markov condition:
$$P(O, D, S, U, R) = P(O) \cdot P(D) \cdot P(S) \cdot P(U) \cdot P(R \mid O, D, S, U)$$

The conditional probability tensor $P(R \mid O, D, S, U)$ consists of $3 \times 3 \times 3 \times 3 = 81$ conditional distributions (each summing to 1.0 across the 3 states of $R$).
- **Boundary Condition 1 (Full Resilience)**:
  $P(R = \text{Nominal} \mid O=2, D=2, S=2, U=2) = 0.96$
  $P(R = \text{Elevated} \mid O=2, D=2, S=2, U=2) = 0.035$
  $P(R = \text{Critical} \mid O=2, D=2, S=2, U=2) = 0.005$
- **Boundary Condition 2 (Compounded Catastrophic Failure)**:
  $P(R = \text{Critical} \mid O=0, D=0, S=0, U=0) = 0.99$
  $P(R = \text{Elevated} \mid O=0, D=0, S=0, U=0) = 0.009$
  $P(R = \text{Nominal} \mid O=0, D=0, S=0, U=0) = 0.001$
- **Compound Non-Linearity**:
  An unowned asset with documentation ($O=0, D=2$) has $P(\text{Critical}) = 0.45$.
  An unowned asset without documentation ($O=0, D=0$) spikes to $P(\text{Critical}) = 0.88$ (capturing non-linear organizational loss).

#### 3.2.4 Exact Posterior Inference & Glass-Box Explainability
Given observed evidence $\mathbf{e} = \{O=o, D=d, S=s, U=u\}$, exact variable elimination calculates:
$$P(R = \text{Critical} \mid \mathbf{e}) = \frac{P(R=\text{Critical}, \mathbf{e})}{\sum_{r \in \{0, 1, 2\}} P(R=r, \mathbf{e})}$$

The unified `predictedScore` $\in [0, 100]$ is computed as:
$$\text{predictedScore} = \text{round}\left(100 \cdot P(R = \text{Critical} \mid \mathbf{e}) + 45 \cdot P(R = \text{Elevated} \mid \mathbf{e})\right)$$

**Glass-Box Factor Attribution**:
For each evidence variable $X \in \{O, D, S, U\}$, its exact contribution is the posterior marginal reduction when counterfactually restored to optimal state $X^* = 2$:
$$\text{attribution}(X) = \max\left(0, P(R = \text{Critical} \mid \mathbf{e}) - P(R = \text{Critical} \mid \mathbf{e}_{X \leftarrow 2})\right)$$
This replaces arbitrary point additions with mathematically sound sensitivity analysis.

---

## 4. System Architecture & Codebase Integration

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             OBA Core Backend                                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Incoming Request: GET /api/predictive-risk                                     │
│         │                                                                        │
│         ▼                                                                        │
│   `backend/domain/derived.js` (predictiveRisk)                                   │
│         │                                                                        │
│         ├──► Step 1: Topology Extraction                                         │
│         │    Extract nodes & dependencies from `roots`                           │
│         │                                                                        │
│         ├──► Step 2: Engine A Execution (`backend/domain/eirwrCascade.js`)       │
│         │    • Computes continuous blast radius vector via eIRWR                 │
│         │    • Generates `cascadeReach` and upstream exposure U for all nodes    │
│         │                                                                        │
│         ├──► Step 3: Engine B Execution (`backend/domain/bayesianRisk.js`)       │
│         │    • Evaluates evidence: O (ownership), D (docs), S (state), U (eIRWR) │
│         │    • Exact BBN tensor inference P(R | Evidence)                        │
│         │    • Posterior sensitivity attribution for contributing factors        │
│         │                                                                        │
│         ▼                                                                        │
│   Standard Response Contract (Identical schema for Frontend / Existing Tests)    │
│   {                                                                              │
│     scores: [{ agentId, predictedScore, threatLevel, contributingFactors, ...}], │
│     emergingThreats: [...],                                                      │
│     provenance: {...}                                                            │
│   }                                                                              │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Hybrid High-Performance Execution Architecture
To guarantee **zero network latency** (<2 ms response time) while maintaining **100% academic fidelity**:
1. **Canonical Python Reference Suite (`backend/risk_engine/`)**:
   - `bbn_model.py`: Built directly on `pgmpy.models.DiscreteBayesianNetwork` and `TabularCPD`.
   - `eirwr_model.py`: Built directly on `scipy.sparse` and `numpy`.
   - Validates all probability axioms, convergence bounds, and exports verified CPT tensors.
2. **In-Process JavaScript Production Engines (`backend/domain/`)**:
   - `eirwrCascade.js`: Pure JavaScript sparse-matrix power iteration implementing Algorithm 1 from arXiv:2608.08073.
   - `bayesianRisk.js`: Pure JavaScript exact tensor evaluation matching `pgmpy` inference to within $10^{-6}$.

---

## 5. Step-by-Step Implementation Roadmap

### Phase 1: Academic Engine Implementation (Days 1–2)
1. **Python Canonical Reference**:
   - Create [`backend/risk_engine/bbn_model.py`](file:///d:/OBA-Core-Horqu/backend/risk_engine/bbn_model.py) using `pgmpy`.
   - Create [`backend/risk_engine/eirwr_model.py`](file:///d:/OBA-Core-Horqu/backend/risk_engine/eirwr_model.py) using `scipy.sparse`.
   - Create [`backend/risk_engine/test_risk_engines.py`](file:///d:/OBA-Core-Horqu/backend/risk_engine/test_risk_engines.py) to assert mathematical properties.
2. **In-Process Production Engines**:
   - Create [`backend/domain/eirwrCascade.js`](file:///d:/OBA-Core-Horqu/backend/domain/eirwrCascade.js) with sparse CSR power iteration.
   - Create [`backend/domain/bayesianRisk.js`](file:///d:/OBA-Core-Horqu/backend/domain/bayesianRisk.js) with exact CPT factor elimination.

### Phase 2: Domain Layer Modernization (Days 3–4)
1. **Replace `predictiveRisk` in `derived.js`**:
   - Import `bayesianRisk` and `eirwrCascade`.
   - Replace lines 420–589 with the dual-engine pipeline.
   - Map posterior sensitivity to the existing `contributingFactors` JSON schema.
2. **Modernize `cascadeReach` and `simulations.js`**:
   - Replace unweighted BFS with continuous eIRWR probabilities.
   - Update `severityFor()` to evaluate continuous probability mass:
     $$\text{severity} = \begin{cases} \text{'critical'} & \text{if } \sum r_j \cdot \kappa_j \ge 0.50 \\ \text{'high'} & \text{if } \sum r_j \cdot \kappa_j \ge 0.25 \\ \text{'medium'} & \text{if } \sum r_j \cdot \kappa_j \ge 0.10 \\ \text{'low'} & \text{otherwise} \end{cases}$$

### Phase 3: Testing & Parity Verification (Day 5)
1. Run Python test suite: `python backend/risk_engine/test_risk_engines.py`
2. Create and run JS parity test suite: `node --test backend/tests/riskEngines.unit.test.js`
3. Execute full existing backend test suite: `npm test` (verify all 12 suites pass).

---

## 6. Verification Plan & Success Criteria

| Test Category | Target / Requirement | Verification Method |
|---|---|---|
| **Bayesian Axioms** | All CPT slices sum to $1.0 \pm 10^{-6}$ | `pgmpy.check_model()` in `test_risk_engines.py` |
| **Cross-Language Parity** | $|P_{\text{JS}} - P_{\text{Python}}| < 10^{-5}$ across all 81 states | `riskEngines.unit.test.js` |
| **eIRWR Convergence** | Power iteration converges in $< 35$ iterations with $\|r^{(k+1)} - r^{(k)}\|_1 < 10^{-6}$ | `eirwr_model.py` and `eirwrCascade.js` |
| **Runtime Latency** | Full org evaluation (100 agents, 500 dependencies) in $< 10\text{ ms}$ | Performance benchmark test |
| **Regression Safety** | 100% pass on all 12 existing test suites (`derived.unit.test.js`, `simulations.unit.test.js`, etc.) | `npm test` in `backend/` |
| **Glass-Box Attribution** | Every contributing factor references concrete database record IDs | Inspection of `contributingFactors` output |
