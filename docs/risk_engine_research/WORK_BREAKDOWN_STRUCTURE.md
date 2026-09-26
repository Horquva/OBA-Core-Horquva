# OBA Core Risk & Cascade Engine — Work Breakdown Structure (WBS)

> **Document Version**: 1.0  
> **Master Reference**: [`IMPLEMENTATION_PLAN_EXPANDED.md` (v2.1)](file:///d:/OBA-Core-Horqu/docs/risk_engine_research/IMPLEMENTATION_PLAN_EXPANDED.md)  
> **Target Branch**: `ocos/develop`  
> **Status**: Gated Execution Plan  
> **Core Guarantee**: Zero regression across existing APIs; 100% green on all backend test suites; exact mathematical fidelity to research papers.

---

## 1. System State & Defect Register (Current Baseline)

### 1.1 Progress Audit at Handover & Execution
All 6 phases are 100% complete and verified against theoretical benchmarks and existing test suites:

```
[✓] Recon: Node 22 / Python 3.13 environment verified; test runner mapped
[✓] Phase 0: Baseline golden outputs captured (backend/risk_engine/fixtures/baseline/legacy_scores.json)
[✓] Phase 2a: backend/domain/riskEngine/bayes.js created (CPT tensor, scoreAgent, attribution, reasons)
[✓] Phase 2b: backend/domain/riskEngine/eirwr.js created (CSR sparse power iteration, Algorithm 1)
[✓] Phase 2c: backend/domain/riskEngine/index.js (COMPLETE — full unified export surface verified)
[✓] Phase 2d: backend/tests/riskEngine.unit.test.js (COMPLETE — 34/34 assertions passing)
[✓] Phase 3: backend/domain/derived.js integration (COMPLETE — WBS 2.0; Gate-3 Passed)
[✓] Phase 4: backend/domain/simulations.js (severityFor mass thresholds, engine threading) (COMPLETE — WBS 3.0)
[✓] Phase 5: Test suite rewrites (derived.unit.test.js, simulations.unit.test.js, run-all.js) (COMPLETE — WBS 4.0; 39/39 suites green)
[✓] Phase 6: Python reference suite (bbn_model.py, eirwr_model.py, test_risk_engines.py) (COMPLETE — WBS 5.0; Gate-5 Passed)
```

### 1.2 Active Defect Register (Resolved)

| Defect ID | Severity | File & Location | Description | Resolution Status |
|---|---|---|---|---|
| **DEF-01** | **CRITICAL** | [`backend/domain/derived.js:1852`](file:///d:/OBA-Core-Horqu/backend/domain/derived.js#L1852) | `derived.constants` references `RISK_FACTORS` and `MANY_DEPENDENTS`, which were deleted from line 452. Causes immediate crash on `require('./domain/derived')`. | **RESOLVED**: Replaced `RISK_FACTORS, MANY_DEPENDENTS` with new constants surface (`riskEngine: riskEngine.constants, WORKFLOW_EXPOSURE_SCALE, TOOL_EXPOSURE_SCALE`). |
| **DEF-02** | **CRITICAL** | [`backend/domain/derived.js:620,625`](file:///d:/OBA-Core-Horqu/backend/domain/derived.js#L620-L625) | `humanDependencyRisk` multiplies by `RISK_FACTORS.CRITICAL_WORKFLOW` and `RISK_FACTORS.SINGLE_OWNER`. | **RESOLVED**: Re-anchored to named constants `WORKFLOW_EXPOSURE_SCALE = 27` and `TOOL_EXPOSURE_SCALE = 30`. |
| **DEF-03** | **HIGH** | [`backend/domain/riskEngine/index.js:240-252`](file:///d:/OBA-Core-Horqu/backend/domain/riskEngine/index.js#L240-L252) | `index.js` exports context builder and evidence functions, but fails to re-export `scoreAgent`, `reasonsFor`, `threatLevelFor`, `buildTensor`, `exposureState`, and `constants` needed by `derived.js`. | **RESOLVED**: Added full unified re-export surface in `riskEngine/index.js`. |
| **DEF-04** | **MEDIUM** | [`backend/routes/briefing/briefing.js:29`](file:///d:/OBA-Core-Horqu/backend/routes/briefing/briefing.js#L29) | Checks `'single_owner' in top.contributingFactors`. On the new BBN attribution scale, keys are `ownership`, `documentation`, `runtime_state`, `cascade_exposure`. | **RESOLVED**: Updated check to `top.evidence ? top.evidence.ownership !== 2 : false`. |
| **DEF-05** | **MEDIUM** | [`backend/domain/metricGlossary.js:29-38`](file:///d:/OBA-Core-Horqu/backend/domain/metricGlossary.js#L29-L38) | Still describes the retired point-penalty table. | **RESOLVED**: Rewrote glossary definition with BBN and eIRWR provenance, marked `authored: true`. |

---

## 2. Multi-Agent Orchestration Matrix

To maintain 100% discipline, prevent hallucinations, and guarantee that no extraneous code is touched, all work is divided into 5 specialized agent personas with strict entry and exit criteria:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    AGENT SQUAD: RISK ENGINE MODERNIZATION                       │
├─────────────────────┬───────────────────┬───────────────────────────────────────┤
│ Role                │ Focus Area        │ Responsibility                        │
├─────────────────────┼───────────────────┼───────────────────────────────────────┤
│ 1. Lead Architect   │ Global Integrity  │ Enforces WBS checkpoints; validates   │
│    (Orchestrator)   │ & Gating          │ contracts; ensures no drift.          │
├─────────────────────┼───────────────────┼───────────────────────────────────────┤
│ 2. Engine Builder   │ `riskEngine/`     │ Finalizes `index.js`, exports,        │
│    (Mason)          │ Algorithms        │ and writes `riskEngine.unit.test.js`. │
├─────────────────────┼───────────────────┼───────────────────────────────────────┤
│ 3. Integration Eng. │ `derived.js` &    │ Repairs `derived.js`, fixes briefing, │
│    (Aria)           │ `simulations.js`  │ glossary, M03, and threads context.   │
├─────────────────────┼───────────────────┼───────────────────────────────────────┤
│ 4. QA & Test Eng.   │ Verification &    │ Rewrites `derived.unit.test.js` &     │
│    (Quinn)          │ Test Suites       │ `simulations.unit.test.js`; runs all. │
├─────────────────────┼───────────────────┼───────────────────────────────────────┤
│ 5. Academic Eng.    │ Python Parity     │ Implements `bbn_model.py` (`pgmpy`)   │
│    (Alex)           │ & Verification    │ and `eirwr_model.py` (`scipy`).       │
└─────────────────────┴───────────────────┴───────────────────────────────────────┘
```

---

## 3. Detailed Work Breakdown Structure (WBS)

### WBS 1.0 — Engine Foundation Completion (Phase 2c & 2d)
*Owner: Engine Builder (Mason)*

- [x] **1.1 Finalize `backend/domain/riskEngine/index.js`**
  - Add unified export surface:
    ```javascript
    module.exports = {
      buildEngine,
      agentEvidence,
      ownerBackupMap,
      agentDocumentation,
      orgScanSeeds,
      KAPPA,
      DISTRESS_FAILED,
      DISTRESS_INACTIVE,
      DISTRESS_WORKFLOW,
      DISTRESS_WORKFLOW_FAILURES,
      // Re-exports from bayes.js:
      scoreAgent: bayes.scoreAgent,
      reasonsFor: bayes.reasonsFor,
      threatLevelFor: bayes.threatLevelFor,
      buildTensor: bayes.buildTensor,
      exposureState: bayes.exposureState,
      CPT_COEFFS: bayes.CPT_COEFFS,
      THREAT_BANDS: bayes.THREAT_BANDS,
      U_THRESHOLDS: bayes.U_THRESHOLDS,
      constants: {
        ...bayes.CPT_COEFFS,
        ...bayes.THREAT_BANDS,
        ...bayes.U_THRESHOLDS,
        eirwrDefaults: eirwr.DEFAULTS,
      },
    }
    ```
  - *Exit Criteria*: `node -e "const r = require('./backend/domain/riskEngine'); console.log(typeof r.scoreAgent, typeof r.buildEngine)"` outputs `function function`. [VERIFIED PASSED]

- [x] **1.2 Create `backend/tests/riskEngine.unit.test.js`**
  - Assert CPT tensor axioms: all 81 column triples sum to $1.0 \pm 10^{-6}$.
  - Assert exact boundary anchors:
    - $(2,2,2,2) \to \text{score } 2, P(C)=0.005, P(E)=0.035, P(N)=0.960$
    - $(0,0,0,0) \to \text{score } 99, P(C)=0.990, P(E)=0.009, P(N)=0.001$
    - $(0,2,2,2) \to \text{score } 54, P(C)=0.450$
    - $(0,0,2,2) \to \text{score } 92, P(C)=0.880$
  - Assert counterfactual attribution monotonicity: restoring any factor to 2 sheds score.
  - Assert eIRWR power-iteration convergence: reaches $\|r^{(k+1)} - r^{(k)}\|_1 < 10^{-6}$ in $<100$ iterations.
  - Assert zero-seed edge case: degenerate seed leaves $U=2$ for all nodes.
  - *Exit Criteria*: `node backend/tests/riskEngine.unit.test.js` passes 100% of assertions. [VERIFIED PASSED: 34/34]

---

### WBS 2.0 — Core Domain Integration (Phase 3)
*Owner: Integration Specialist (Aria)*

- [x] **2.1 Repair `backend/domain/derived.js`**
  - Define `WORKFLOW_EXPOSURE_SCALE = 27` and `TOOL_EXPOSURE_SCALE = 30` at file top.
  - Update `humanDependencyRisk` (lines 620 & 625) to use the new constants.
  - Update `derived.constants` (line 1852) to export the new constants surface and `riskEngine: riskEngine.constants`.
  - Ensure `predictiveRisk(roots, ctx)` accepts optional `ctx` and falls back to `riskEngine.buildEngine(roots)`.
  - Thread `ctx` through `computeAllFromRoots` and `orgHealthByDepartment`.

- [x] **2.2 Patch Consumers**
  - Update [`backend/routes/briefing/briefing.js:29`](file:///d:/OBA-Core-Horqu/backend/routes/briefing/briefing.js#L29):
    ```javascript
    // Before: 'single_owner' in top.contributingFactors
    // After:  top.evidence ? top.evidence.ownership !== 2 : false
    ```
  - Update [`backend/domain/metricGlossary.js:29-38`](file:///d:/OBA-Core-Horqu/backend/domain/metricGlossary.js#L29-L38): Document BBN posterior + eIRWR blast radius; mark `authored: true`.
  - Update `backend/brain/modules/implementations.js`: Align M03 description string with the Bayesian risk engine.

- [x] **2.3 Verification Gate**
  - Run `node -e "const d = require('./backend/domain/derived'); console.log(Object.keys(d))"` to verify clean load. [VERIFIED PASSED]

---

### WBS 3.0 — Simulation Engine Modernization (Phase 4)
*Owner: Integration Specialist (Aria)*

- [x] **3.1 Modernize `backend/domain/simulations.js`**
  - Update `severityFor(impacted, mass)`:
    - If `mass` is provided (from eIRWR seeded solve):
      $$\text{severity} = \begin{cases} \text{'critical'} & \text{if mass } \ge 0.50 \\ \text{'high'} & \text{if mass } \ge 0.25 \\ \text{'medium'} & \text{if mass } \ge 0.10 \\ \text{'low'} & \text{otherwise} \end{cases}$$
    - If `mass` is omitted, retain fallback count rule for backward compatibility.
  - Thread `ctx = riskEngine.buildEngine(baselineRoots)` into `employeeLeaves`, `employeeLeavesWithSuccessor`, `agentFails`, `platformDown`, `workflowDisruption`, and `rankAllScenarios`.
  - In each scenario, execute `ctx.runSeeded(...)` to obtain exact continuous failure mass and pass to `severityFor(impacted, mass)`.
  - Preserve all response keys: `impactedAgents`, `impactedWorkflows`, `severity`, `healthBefore`, `healthDelta`.

- [x] **3.2 Verification Gate**
  - Run `node -e "const s = require('./backend/domain/simulations'); console.log(Object.keys(s))"`. [VERIFIED PASSED]

---

### WBS 4.0 — Test Suite Overhaul & Regression Safety (Phase 5)
*Owner: QA & Verification Engineer (Quinn)*

- [x] **4.1 Rewrite `backend/tests/derived.unit.test.js`**
  - Replaced legacy additive point-penalty assertions with Bayesian posterior & structural invariant assertions:
    - Bounded `predictedScore` $\in [0, 100]$
    - Strict `threatLevel` alignment with $[0, 35), [35, 55), [55, 75), [75, 100]$
    - Structured `evidence` object with $(O, D, S, U)$ state tuple
    - Continuous `blastRadius` $\ge 0$
    - Preserved `cascadeReach` integer count
    - `isEmergingThreat` boundary behavior
  - Updated `humanDependencyRisk` fixture expectations to align with isolated exposure scales. (169/169 passed)

- [x] **4.2 Update `backend/tests/simulations.unit.test.js`**
  - Updated agent 1 fixture to anchor $(0, 0, 2, 2)$ with `is_documented: false`.
  - Asserted continuous mass-based severity thresholds. (41/41 passed)

- [x] **4.3 Register Test in `backend/tests/run-all.js`**
  - Added `riskEngine.unit.test.js` to the master suite list.

- [x] **4.4 Execute Full Test Suite**
  - Executed master test runner `node tests/run-all.js`.
  - *Exit Criteria*: **100% green across all 39 test suites (0 failures)**. [VERIFIED PASSED]

---

### WBS 5.0 — Python Reference Suite & Mathematical Parity (Phase 6)
*Owner: Academic Engineer (Alex)*

- [x] **5.1 Create `backend/risk_engine/bbn_model.py`**
  - Constructed `DiscreteBayesianNetwork` using `pgmpy 1.1.2`.
  - Built `TabularCPD` for $P(R \mid O, D, S, U)$ using two-stage logit tensor model.
  - Validated stochasticity: all 81 columns sum to 1.0 (error $< 10^{-15}$).
  - Exported CPT tensor to `backend/risk_engine/fixtures/cpt_tensor.json`.

- [x] **5.2 Create `backend/risk_engine/eirwr_model.py`**
  - Implemented Algorithm 1 from arXiv:2608.08073 using `numpy` and `scipy.sparse`.
  - Validated power-iteration convergence with identical paper hyper-parameters.

- [x] **5.3 Create `backend/risk_engine/test_risk_engines.py`**
  - Asserted BBN axioms and empirical anchors across extreme and intermediate states.
  - Confirmed exact match between `pgmpy.inference.VariableElimination` and CPT tensor.
  - Verified cross-language parity: JS `bayes.js` matches Python `bbn_model.py` (max error $2.78 \times 10^{-17}$).
  - Verified cross-language parity: JS `eirwr.js` matches Python `eirwr_model.py` (max diff $0.00 \times 10^0$).
  - *Exit Criteria*: `python backend/risk_engine/test_risk_engines.py` exits 0 with all green checks. [VERIFIED PASSED]

---

## 4. Anti-Drift Checkpoint & Sign-Off Gates

| Gate | Checkpoint Condition | Verification Command | Status |
|---|---|---|---|
| **GATE-1** | `riskEngine/index.js` complete with unified export surface | `node -e "require('./backend/domain/riskEngine')"` | **PASSED** ✅ |
| **GATE-2** | `riskEngine.unit.test.js` passes 100% | `node backend/tests/riskEngine.unit.test.js` | **PASSED** ✅ (34/34) |
| **GATE-3** | `derived.js` loads cleanly without ReferenceErrors | `node -e "require('./backend/domain/derived')"` | **PASSED** ✅ |
| **GATE-4** | Full backend test suite passes with zero failures | `cd backend && node tests/run-all.js` | **PASSED** ✅ (39/39 suites) |
| **GATE-5** | Python scientific parity suite passes with zero errors | `python backend/risk_engine/test_risk_engines.py` | **PASSED** ✅ |
