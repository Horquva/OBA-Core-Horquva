# Risk Engine Research & Academic Specifications

This directory contains the peer-reviewed literature, theoretical formulations, and implementation plan for modernizing **Horquva OBA Core's Predictive Risk & Cascade Modeling Engine**.

---

## Directory Index

| Document | Description | Academic Source / Repository |
|---|---|---|
| [**`IMPLEMENTATION_PLAN.md`**](file:///d:/OBA-Core-Horqu/docs/risk_engine_research/IMPLEMENTATION_PLAN.md) | **Core Engineering Specification**: Step-by-step roadmap to replace legacy heuristic penalties with the Two-Engine Core | OBA Engineering Specification |
| [**`DEEP_VALIDATION_AUDIT_REPORT.md`**](file:///d:/OBA-Core-Horqu/docs/risk_engine_research/DEEP_VALIDATION_AUDIT_REPORT.md) | **Audit & Validation Report**: Benchmark dry-run findings, mathematical legitimacy proofs, and test regression validation | Academic & Mathematical Audit |
| [**`FRONTEND_INTEGRATION_AND_VALIDATION.md`**](file:///d:/OBA-Core-Horqu/docs/risk_engine_research/FRONTEND_INTEGRATION_AND_VALIDATION.md) | **Full-Stack Integration & Live Audit**: End-to-end frontend wiring, live vs dry-run score reconciliation, and quantifiable improvements | Operational & UI Verification |
| [**`PAPER_1_eIRWR_arXiv_2608.08073.md`**](file:///d:/OBA-Core-Horqu/docs/risk_engine_research/PAPER_1_eIRWR_arXiv_2608.08073.md) | **Engine A Foundation**: Enhanced Iterative Random Walk with Restart for Scalable Root Cause Analysis & Cascade Modeling | [arXiv:2608.08073](https://arxiv.org/abs/2608.08073) (Khan & Farea, Aug 2026) |
| [**`PAPER_2_BBN_Operational_Risk_arXiv_0906.3968.md`**](file:///d:/OBA-Core-Horqu/docs/risk_engine_research/PAPER_2_BBN_Operational_Risk_arXiv_0906.3968.md) | **Engine B Foundation**: A Bayesian Networks Approach to Operational Risk (Basel II / Loss Correlation) | [arXiv:0906.3968](https://arxiv.org/abs/0906.3968) (Aquaro et al., 2009) |
| [**`PAPER_3_Cascading_Urban_Risk_BBN_arXiv_2505.06281.md`**](file:///d:/OBA-Core-Horqu/docs/risk_engine_research/PAPER_3_Cascading_Urban_Risk_BBN_arXiv_2505.06281.md) | **Engine B Extension**: Data-Driven Probabilistic Framework for Cascading Risk Analysis Using Bayesian Belief Networks | [arXiv:2505.06281](https://arxiv.org/abs/2505.06281) (Kumar et al., May 2025) |

---

## 1. The Core Scientific Problem

### Legacy System Failure
OBA Core's legacy risk engine (`backend/domain/derived.js`, `predictiveRisk`) and simulation engine (`backend/domain/simulations.js`) relied on:
1. **Uncorrelated Point Penalties**: Arbitrary point additions (`NO_OWNER: 35, SINGLE_OWNER: 30, CRITICAL_WORKFLOW: 27, UNDOCUMENTED: 18`, etc.).
2. **Circular Self-Referencing**: Reading the agent's pre-existing database risk level (`agent.risk === 'critical'`) and adding 20 points to its own risk score.
3. **Unweighted BFS Cascade**: An unattenuated graph traversal where failure transmitted across all hops with 100% deterministic probability without damping or absorption.

---

## 2. The Two-Engine Solution

### Engine A: Continuous Blast Radius via eIRWR
* **Paper**: [arXiv:2608.08073](file:///d:/OBA-Core-Horqu/docs/risk_engine_research/PAPER_1_eIRWR_arXiv_2608.08073.md)
* **Open Source Reference**: [`scikit-network/scikit-network`](https://github.com/scikit-network/scikit-network) / `scipy.sparse`
* **Mechanics**:
  - Replaces unweighted BFS with an anomaly-conditioned random walk:
    $$r^{(k+1)} = (1 - \alpha) M r^{(k)} + \alpha v$$
  - Augmented transition operator $M$ with adaptive resilience damping $R_i = R_{\text{base}} \exp(-\beta \hat{s}_i)$, backward edge reflection $A_{\text{bwd}}$, and self-loop mass accumulation $A_{\text{self}}$.
  - Outputs a continuous cascade distribution $r_j \in [0.0, 1.0]$ over all downstream entities, converging in $< 30$ iterations ($< 5\text{ ms}$).

### Engine B: Probability of Failure via Discrete Bayesian Belief Network (BBN)
* **Papers**: [arXiv:0906.3968](file:///d:/OBA-Core-Horqu/docs/risk_engine_research/PAPER_2_BBN_Operational_Risk_arXiv_0906.3968.md) & [arXiv:2505.06281](file:///d:/OBA-Core-Horqu/docs/risk_engine_research/PAPER_3_Cascading_Urban_Risk_BBN_arXiv_2505.06281.md)
* **Open Source Reference**: [`pgmpy/pgmpy`](https://github.com/pgmpy/pgmpy) (Probabilistic Graphical Models in Python)
* **Mechanics**:
  - Replaces the additive penalty table with a 5-node causal DAG:
    $$P(R \mid O, D, S, U) = \frac{P(R, O, D, S, U)}{\sum_r P(R=r, O, D, S, U)}$$
  - Uses exact variable elimination over validated Conditional Probability Tables (CPTs).
  - Provides mathematical glass-box attribution via posterior delta:
    $$\Delta P_X = P(R = \text{Critical} \mid \mathbf{e}) - P(R = \text{Critical} \mid \mathbf{e}_{X \leftarrow \text{Optimal}})$$

---

## 3. GitHub Reference Repositories

1. **`pgmpy/pgmpy`** ([GitHub](https://github.com/pgmpy/pgmpy)):
   - Python library for Bayesian Networks, Markov Networks, Dynamic Bayesian Networks, and causal inference.
   - Core modules utilized: `pgmpy.models.DiscreteBayesianNetwork`, `pgmpy.factors.discrete.TabularCPD`, `pgmpy.inference.VariableElimination`.
2. **`scikit-network/scikit-network`** ([GitHub](https://github.com/scikit-network/scikit-network)):
   - High-performance Python/Cython package for analysis of large graphs.
   - Core modules utilized: `sknetwork.ranking.PageRank`, `sknetwork.path`, and sparse CSR matrix operators.
