# MUHAMMAD MAAZ KHAN

Simulation Runtime & Experiment Platform Owner**
---

# Part 1 — REPOSITORY TRUTH, PREVIOUS-WORK VERIFICATION & BASELINE

## Objective

Part 1 is an **adjudication Part**, not a feature-development Part.

Maaz must establish exactly what Runtime capability currently exists.

---

## 1. Inspect the authoritative Runtime implementation

Verify the actual repository locations established by Arcturus, including where applicable:

```text
contracts/simulation/
src/simulation/
tests/simulation/
```

and all actual integration locations connected to them.

Determine from **code and tests**, not assumptions:

* simulation contracts;
* experiment contracts;
* run creation;
* configuration flow;
* seed handling;
* simulation time;
* tick representation;
* event insertion;
* event ordering;
* event processing;
* state representation;
* state transitions;
* run completion;
* persistence;
* checkpoints;
* provenance;
* replay;
* recovery;
* failures;
* execution evidence.

---

## 2. Execute existing tests

Run the existing Runtime test suite.

Do not replace existing tests merely to obtain a passing result.

Classify each relevant capability as:

```text
PASS
FAIL — REGRESSION
PASS — NOT INTEGRATED
MISSING
BLOCKED
```

---

## 3. Verify previous Runtime claims against current code

Previous work must be treated as a **claim requiring current verification**.

Verify actual evidence for:

* experiment identity;
* run identity;
* seed;
* ticks;
* events;
* state;
* state transitions;
* checkpoints;
* provenance;
* execution history;
* deterministic behavior.

---

## 4. Execute one existing experiment

Use the existing supported path:

```text
Configuration
 ↓
Experiment
 ↓
Initialization
 ↓
Execution
 ↓
Ticks
 ↓
Events
 ↓
State change
 ↓
Completion
 ↓
Recorded run
```

No new Runtime architecture is permitted unless a genuine gap is discovered.

---

## 5. Produce Part 1 capability matrix

The matrix must explicitly state:

| Capability | Existing? | Tested? | Live? | Integrated? | Status | Evidence |
| ---------- | --------: | ------: | ----: | ----------: | ------ | -------- |

This becomes the baseline for the remaining six Parts.

---

## 6. Part 1 repository checkpoint

Record:

* files inspected;
* tests executed;
* test results;
* existing capabilities verified;
* regressions;
* missing capabilities;
* integration defects;
* blockers;
* evidence;
* commits/PRs if changes were required;
* exact Part 2 scope.

### Part 1 GATE

```text
CURRENT REPOSITORY
      ↓
PREVIOUS WORK VERIFIED
      ↓
CAPABILITY STATUS CLASSIFIED
      ↓
BASELINE EXECUTION PROVEN
```

**No unnecessary rebuild permitted.**

---

# Part 2 — REAL VERTICAL-SLICE RUNTIME INTEGRATION

## Objective

Connect the existing Runtime to the current Arcturus execution chain.

The target architecture is:

```text
Ontology
   ↓
Enterprise
   ↓
Workforce
   ↓
Workflow
   ↓
Scenario
   ↓
Experiment
   ↓
RUNTIME
```

Maaz owns the final transition into execution.

---

# 1. Verify actual Runtime inputs

The Runtime must receive the **real upstream outputs** supported by the architecture.

Where already defined, verify:

* experiment identity;
* scenario identity;
* configuration;
* seed;
* enterprise context;
* workforce context;
* workflow context;
* initial state;
* execution metadata.

Do not create duplicate contracts.

---

# 2. Verify Scenario → Experiment → Runtime

Prove:

```text
REAL SCENARIO
      ↓
REAL EXPERIMENT
      ↓
VALID RUNTIME CONFIGURATION
      ↓
REAL EXECUTION
```

The Runtime must not secretly substitute:

* hard-coded scenarios;
* static test organizations;
* unrelated fixtures;
* manually inserted runtime state.

Fixtures may remain fixtures inside tests.

They cannot be the only evidence of final product execution.

---

# 3. Verify Workflow → Runtime

Javeria owns:

* workflow definitions;
* workflow semantics;
* workflow meaning;
* workflow behavior.

Maaz owns:

* executable workflow processing;
* scheduling;
* simulation time;
* events;
* runtime state;
* execution outcomes;
* runtime trace.

If execution fails, first determine whether the failure is:

```text
Workflow definition defect
OR
Runtime execution defect
OR
Contract/integration defect
```

Then assign it to the correct owner.

---

# 4. Prove actual state transition

For an actual run:

```text
INITIAL STATE
      ↓
EVENT
      ↓
RUNTIME PROCESSING
      ↓
STATE TRANSITION
      ↓
NEW STATE
```

The evidence must demonstrate an actual state change.

A generic:

```text
"simulation completed": true
```

is not sufficient.

---

# 5. Verify failure integrity

Test controlled Runtime-boundary failures.

Where relevant:

* invalid configuration;
* invalid event;
* missing execution input;
* invalid transition;
* unavailable dependency;
* interrupted execution.

Expected principle:

```text
FAILURE
+
STRUCTURED ERROR
+
CONTEXT
+
TRACEABILITY
+
NO FALSE SUCCESS
```

---

# 6. Part 2 repository/evidence checkpoint

Record:

* integration path;
* contracts used;
* actual execution;
* Runtime evidence;
* failures encountered;
* ownership adjudication;
* fixes;
* tests;
* commits/PRs.

### Part 2 GATE

```text
REAL SCENARIO
      ↓
REAL EXPERIMENT
      ↓
REAL RUNTIME
      ↓
REAL TICKS
      ↓
REAL EVENTS
      ↓
REAL STATE CHANGES
      ↓
REAL RESULT
      ↓
REAL PROVENANCE
```

---

# Part 3 — FRESH EXECUTION & REPRODUCIBILITY

## Objective

Prove that the Runtime is an **execution engine**, not a one-run demonstration.

---

## 1. Execute Experiment A

Use the supported experiment mechanism.

Capture:

* experiment identity;
* run identity;
* configuration;
* seed;
* initial state;
* ticks;
* events;
* transitions;
* final result;
* provenance.

---

## 2. Execute Experiment B

Execute a second valid experiment.

The requirement is:

```text
Run A ≠ Run B
```

in execution identity and lineage.

Do not artificially alter fields merely to create visual differences.

---

## 3. Prove fresh initialization

Verify that B does not reuse:

* A's state;
* A's events;
* A's result;
* A's execution history;
* A's evidence.

---

## 4. Controlled reproducibility test

Repeat a supported experiment using:

```text
same configuration
+
same initial conditions
+
same seed
+
same supported environment
```

Compare only what the architecture actually guarantees to be deterministic.

Do not claim byte-for-byte equality unless the implementation guarantees it.

---

## 5. Investigate divergence

If deterministic behavior diverges unexpectedly, inspect:

* seed handling;
* event ordering;
* time progression;
* state initialization;
* workflow execution;
* generated inputs;
* persistence;
* uncontrolled randomness;
* environment dependence.

Do not normalize or rewrite outputs to hide divergence.

---

## 6. Part 3 evidence matrix

Produce:

| Test     | Run | Expected guarantee               | Actual result   | Evidence   |
| -------- | --- | --------------------------------- | ---------------- | ---------- |
| Fresh A  | A   | Independent execution            | Verified/failed | Artifact   |
| Fresh B  | B   | Independent execution            | Verified/failed | Artifact   |
| Repeat A | A'  | Supported deterministic behavior | Verified/failed | Comparison |

### Part 3 GATE

```text
A → REAL EXECUTION
B → REAL EXECUTION
A' → CONTROLLED REPEAT
```

**Fresh execution and supported reproducibility are both proven.**

---

# Part 4 — EVIDENCE, CHECKPOINT, RECOVERY & DATA-FACTORY BOUNDARY

## Objective

Maaz does not build Ahmed's Synthetic Data platform.

He ensures that Runtime produces reliable evidence that the Data Factory can consume.

---

## 1. Verify execution trace

The trace must connect, where supported:

```text
INPUT
 ↓
INITIALIZATION
 ↓
TICK
 ↓
EVENT
 ↓
PROCESSING
 ↓
STATE TRANSITION
 ↓
NEXT TICK
 ↓
RESULT
```

---

## 2. Verify checkpoints

Verify the existing checkpoint mechanism for:

* identity;
* run association;
* simulation position;
* state;
* metadata;
* retrieval;
* integrity.

---

## 3. Verify restoration

Prove:

```text
RUN
 ↓
CHECKPOINT
 ↓
STOP / INTERRUPTION
 ↓
RESTORE
 ↓
CONTINUE
```

This must be actual restoration, not merely reading checkpoint metadata.

---

## 4. Verify replay/inspection

Where replay is supported:

```text
completed/checkpointed run
        ↓
replay/inspection
        ↓
understandable execution history
```

Do not claim guarantees beyond implementation reality.

---

## 5. Verify failure preservation

A failed run must retain sufficient evidence to explain:

```text
what ran
↓
where it failed
↓
why it failed
↓
what state existed
↓
what execution context existed
```

---

## 6. Runtime → Synthetic Data contract

Ahmed must be able to consume Runtime output through the established boundary.

The boundary should expose, where supported:

* experiment;
* run;
* configuration;
* seed;
* state;
* ticks;
* events;
* transitions;
* result;
* provenance;
* failure information.

Ahmed must not need to depend on Maaz's internal implementation.

---

## 7. Part 4 gate

```text
TRACE
+
CHECKPOINT
+
RESTORATION
+
REPLAY / INSPECTION
+
FAILURE HISTORY
+
PROVENANCE
+
DATA BOUNDARY
```

All must be supported by actual evidence where the capability is part of the existing architecture.

---

# Part 5 — VALIDATION, INTELLIGENCE & OBA-READY EVIDENCE INTEGRATION

## Objective

Make Runtime evidence dependable for downstream platforms without taking ownership of them.

---

## 1. Verify lineage

Where supported:

```text
Experiment
 ↓
Run
 ↓
Configuration
 ↓
Tick
 ↓
Event
 ↓
State Transition
 ↓
Result
 ↓
Evidence
```

Identifiers must remain connected.

---

## 2. Verify Scenario lineage

Where the architecture supports:

```text
Scenario
 ↓
Experiment
 ↓
Run
```

preserve that relationship.

Do not create a parallel Scenario identity model.

---

## 3. Verify Runtime → Validation

Amina's Validation platform must consume actual Runtime evidence:

```text
REAL RUNTIME RESULT
       ↓
REAL EVIDENCE
       ↓
VALIDATION
       ↓
VALIDATION RESULT
```

Malformed evidence must not be silently bypassed.

---

## 4. Verify Runtime → Intelligence lineage

If Ahmed's Intelligence produces an assessment:

```text
Assessment
 ↓
Evidence
 ↓
Runtime event/state
 ↓
Run
 ↓
Experiment
```

Maaz owns the integrity of the Runtime side.

He does not define the assessment.

---

## 5. Verify OBA-ready contribution

Maaz must make Runtime information available at the established boundary where required:

* run context;
* simulated state;
* events;
* state transitions;
* execution history;
* evidence references;
* provenance.

This is **OBA readiness**, not OBA implementation.

---

## 6. Contract stability gate

After changes:

```text
Runtime tests
+
contract tests
+
integration tests
```

must be rerun.

No unnecessary schema churn.

Any contract change must have a concrete integration justification and appropriate approval.

---

# Part 6 — LIVE PRODUCT EXECUTION, FAILURE, REGRESSION & PERFORMANCE

## Objective

Move from engineering verification to actual product-path proof.

---

## 1. Real product request

Prove:

```text
USER
 ↓
UI
 ↓
API / PRODUCT BACKEND
 ↓
EXPERIMENT
 ↓
SCENARIO
 ↓
RUNTIME
```

The Runtime must be reached through the real supported product path.

Direct scripts remain engineering tools, not the sole final evidence.

---

## 2. Verify actual execution state

Use the existing Runtime state model.

Do not invent states merely for UI presentation.

---

## 3. Verify fresh live execution

Run:

```text
Experiment A
 ↓
execution
 ↓
result

Experiment B
 ↓
execution
 ↓
result
```

Confirm B's:

* run ID;
* state;
* events;
* result;
* evidence

actually belong to B.

---

## 4. Controlled failure testing

Test relevant failures and prove:

```text
FAILURE DETECTED
 ↓
FAILURE RECORDED
 ↓
NO FALSE SUCCESS
 ↓
CONTEXT PRESERVED
 ↓
NO SILENT CORRUPTION
```

---

## 5. Regression protection

Run:

* Runtime unit tests;
* Runtime integration tests;
* contract tests;
* reproducibility tests;
* checkpoint/recovery tests;
* failure tests;
* relevant product-path tests.

The previous Runtime baseline must not regress.

---

## 6. Performance observation

Measure only what the existing architecture supports, such as:

* execution latency;
* tick progression;
* event processing;
* state overhead;
* memory behavior;
* checkpoint overhead;
* run duration.

Do not invent arbitrary performance targets.

Do not introduce distributed infrastructure merely because performance is not yet optimized.

---

## 7. Part 6 gate

```text
REAL PRODUCT REQUEST
       ↓
REAL EXPERIMENT
       ↓
REAL RUNTIME
       ↓
REAL EXECUTION
       ↓
REAL STATE / EVENTS
       ↓
REAL RESULT
```

plus:

```text
FAILURE TESTING
+
REGRESSION TESTING
+
PERFORMANCE OBSERVATION
```

---

# Part 7 — GOLDEN RUNTIME ACCEPTANCE

## Objective

Part 7 is primarily an **acceptance and evidence Part**, not a development Part.

Coding is allowed only when required to correct an acceptance-blocking defect.

---

# 1. Clean product-path execution

The Golden Run must begin from the real product entry point.

No manually prepared execution state.

No manually inserted successful database result.

No hidden fixture substituting for the actual product path.

---

# 2. Golden Run

Execute:

```text
REAL PRODUCT
 ↓
EXPERIMENT
 ↓
SCENARIO
 ↓
RUNTIME
 ↓
INITIALIZATION
 ↓
CLOCK
 ↓
TICKS
 ↓
EVENTS
 ↓
STATE TRANSITIONS
 ↓
WORKFLOW EXECUTION
 ↓
COMPLETION
 ↓
EVIDENCE
 ↓
VALIDATION
 ↓
INTELLIGENCE
```

Maaz verifies the Runtime portion and its boundaries.

---

# 3. Golden Runtime Evidence Package

Where supported, capture:

### Experiment

* experiment ID;
* scenario reference;
* configuration;
* seed.

### Execution

* run ID;
* initialization;
* execution status;
* simulation time;
* ticks;
* execution metadata.

### Runtime behavior

* events;
* event ordering;
* state transitions;
* workflow execution outcomes;
* failures.

### Reliability

* checkpoint;
* recovery/replay evidence;
* completion state.

### Lineage

```text
Experiment
 ↓
Run
 ↓
Tick
 ↓
Event
 ↓
State Transition
 ↓
Evidence
```

Every item must come from actual execution evidence.

---

# 4. Second Golden Run

Execute another fresh controlled experiment.

Prove:

```text
NEW EXPERIMENT
+
NEW RUN
+
FRESH INITIALIZATION
+
FRESH EXECUTION
+
FRESH EVIDENCE
```

---

# 5. Controlled repeat

Repeat one supported experiment:

```text
same seed
+
same configuration
+
same supported environment
```

and verify the actual deterministic guarantee.

---

# 6. Downstream verification

Verify the Runtime output successfully reaches the established downstream boundaries:

```text
Runtime
 ↓
Synthetic Data
 ↓
Validation
 ↓
Intelligence
 ↓
OBA-ready boundary
 ↓
UI
```

This is **integration verification**, not ownership expansion.

---

# 7. Final regression

Run the relevant final suites:

* Runtime unit;
* Runtime integration;
* contracts;
* reproducibility;
* checkpoint/recovery;
* failure;
* end-to-end/product-path.

---

# 8. FINAL REPOSITORY AUDIT

Before acceptance, compare:

```text
START-OF-WEEK REPOSITORY
          ↓
CHANGES MADE
          ↓
TESTS
          ↓
LIVE EXECUTIONS
          ↓
FINAL REPOSITORY
```

The team must be able to answer:

### What existed before?

Verified from repository history/code.

### What was changed?

Exact files/commits/PRs.

### Why was it changed?

Specific current-phase requirement or defect.

### What was tested?

Exact test/integration evidence.

### What actually executed?

Real experiment/run evidence.

### What remains future?

Explicitly recorded.

---

# 9. FINAL ACCEPTANCE MATRIX

| Gate             | Required proof                           |
| ----------------- | ------------------------------------------ |
| Previous work    | Existing Runtime verified                |
| Repository truth | Current implementation inspected         |
| Tests            | Existing tests rerun                     |
| Integration      | Real Scenario/Experiment reaches Runtime |
| Execution        | Real ticks/events/state transitions      |
| Fresh runs       | Independent executions                   |
| Reproducibility  | Controlled repeated execution            |
| Checkpoint       | Actual checkpoint                        |
| Recovery         | Actual restoration where supported       |
| Replay           | Verified where supported                 |
| Failure          | No false-success execution               |
| Provenance       | Traceable execution lineage              |
| Data boundary    | Actual Runtime output consumable         |
| Validation       | Actual downstream boundary verified      |
| Intelligence     | Runtime lineage preserved                |
| Product          | Real product request reaches Runtime     |
| Regression       | Previous capability remains intact       |
| Evidence         | Repository + execution evidence          |
| Ownership        | No neighboring platform absorbed         |

---

# 10. DAILY EVIDENCE / GITHUB GATE

Every Part must end with a lightweight repository checkpoint.

## Part 1

```text
Baseline
+
verification report
+
test evidence
```

## Part 2

```text
integration changes
+
vertical-slice evidence
+
tests
```

## Part 3

```text
fresh-run evidence
+
reproducibility comparison
```

## Part 4

```text
checkpoint/recovery evidence
+
data-boundary verification
```

## Part 5

```text
validation/intelligence boundary evidence
+
contract/regression tests
```

## Part 6

```text
live product evidence
+
failure tests
+
performance observations
```

## Part 7

```text
Golden Run
+
second fresh run
+
controlled repeat
+
final regression
+
final repository audit
```

Every claimed implementation change must be traceable to the repository.

---

# 11. FINAL SCOPE PROTECTION

The following are **not permitted as silent scope expansion**:

* rebuilding the Runtime;
* redesigning Ontology;
* rebuilding Enterprise generation;
* rebuilding Workforce;
* redefining Workflow semantics;
* creating a second Scenario system;
* implementing Validation;
* implementing Intelligence;
* implementing OBA;
* implementing OCOS;
* replacing the product UI;
* introducing unnecessary databases;
* introducing paid infrastructure;
* introducing distributed simulation infrastructure without an actual requirement;
* creating parallel contracts that duplicate existing architecture;
* creating mock-based final evidence.

If a future capability is discovered, record it as:

```text
FUTURE / OUT OF CURRENT PHASE
```

unless it is genuinely required to pass the current Runtime acceptance gate.

---

# 12. FINAL MAaz DEFINITION OF DONE

Maaz is DONE only when the following statement is **demonstrably true from repository and live execution evidence**:

> **A real Arcturus experiment can reach Maaz's existing Simulation Runtime through the supported product path, initialize a fresh execution context, advance real simulation time, process real events, produce real Runtime-level state transitions, preserve execution lineage and provenance, support checkpoint/recovery and reproducibility where those capabilities are supported, produce traceable execution evidence, and hand that evidence cleanly to downstream Synthetic Data, Validation, Intelligence, and OBA-ready boundaries without Maaz taking ownership of neighboring platforms.**

The final architecture remains:

```text
ONTOLOGY
   ↓
ENTERPRISE
   ↓
WORKFORCE
   ↓
WORKFLOW
   ↓
SCENARIO
   ↓
EXPERIMENT
   ↓
════════════════════════════════
MAAZ — SIMULATION RUNTIME
════════════════════════════════
   ↓
INITIALIZE
   ↓
ADVANCE TIME
   ↓
PROCESS EVENTS
   ↓
CHANGE STATE
   ↓
CHECKPOINT
   ↓
RECORD EXECUTION
   ↓
REPLAY / RECOVER
   ↓
PRODUCE TRACEABLE EVIDENCE
   ↓
════════════════════════════════
DOWNSTREAM PLATFORMS
════════════════════════════════
   ↓
SYNTHETIC DATA
   ↓
VALIDATION
   ↓
INTELLIGENCE
   ↓
OBA-READY BOUNDARY
```

# FINAL 7-Part SUMMARY

| Part   | Objective                                     | Acceptance result                                    |
| ----- | ---------------------------------------------- | ------------------------------------------------------ |
| **1** | Repository truth + previous-work verification | Existing Runtime baseline proven                     |
| **2** | Real vertical-slice integration               | Scenario/Experiment reaches real Runtime             |
| **3** | Fresh execution + reproducibility             | Independent runs + supported deterministic repeat    |
| **4** | Evidence + checkpoint/recovery                | Durable, traceable Runtime evidence                  |
| **5** | Downstream readiness                          | Validation/Intelligence/OBA boundaries preserved     |
| **6** | Live product + failure/regression hardening   | Real product request reaches real Runtime            |
| **7** | Golden acceptance                             | Final end-to-end Runtime proof + repository evidence |
