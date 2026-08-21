#UMAIR ASIF 

**Product Role:** Unified Product Frontend / Live Product Experience
**Primary Objective:** Convert the already-existing Arcturus backend capabilities into **one real, integrated, truthful, evidence-grounded product experience**.

---

### UMAIR ASIF

**Frontend Integration & Execution Owner**

Umair makes the frontend **connect to and operate the real backend**.

His question is:

> **“Does the frontend actually communicate with the real Arcturus system and correctly receive its truth?”**

He owns:

* repository/API integration audit;
* frontend API clients;
* backend contract mapping;
* experiment interaction;
* execution controls;
* runtime integration;
* state/event consumption;
* refresh and polling;
* stale-data protection;
* frontend/backend integration testing;
* integration failures;
* production build/integration verification.

---

# 1. CONSTITUTIONAL BOUNDARY

Umair and Saba **do not rebuild backend systems**.

They consume the actual capabilities delivered by:

```text
Hamza    → Ontology
Ajwa     → Enterprise
Syeda    → Workforce
Javeria  → Behavior & Workflow
Maryam   → Scenario
Maaz     → Runtime / Experiment
Ahmed    → Synthetic Data / Evidence / Intelligence
Amina    → Validation
Hashim   → Governance / QA
```

The frontend responsibility is:

```text
BACKEND TRUTH
      ↓
REAL API / CONTRACT
      ↓
UMAIR — INTEGRATION
      ↓
SABA — PRODUCT EXPERIENCE
      ↓
REAL ARCTURUS UI
```

### They must NOT:

* create fake backend results;
* create fake runtime state;
* create fake employees;
* create fake experiments;
* create fake Intelligence;
* create fake validation;
* bypass APIs;
* read backend internals directly from the frontend;
* claim unsupported capabilities;
* label unfinished OBA/OCOS capabilities as implemented.

---

# 2. LOCKED ARCTURUS EXECUTION ORDER

To eliminate the previous pipeline-order contradiction, **this plan uses one canonical order everywhere**.

The frontend may begin with an **Experiment selection/creation action**, but the underlying Arcturus execution dependency chain is:

```text
REAL USER
   ↓
ARCTURUS FRONTEND
   ↓
EXPERIMENT
   ↓
ONTOLOGY
   ↓
ENTERPRISE
   ↓
WORKFORCE
   ↓
BEHAVIOR & WORKFLOW
   ↓
SCENARIO
   ↓
RUNTIME
   ↓
STATE + EVENTS
   ↓
SYNTHETIC DATA
   ↓
EVIDENCE
   ↓
VALIDATION
   ↓
INTELLIGENCE
   ↓
PROVENANCE / ASSESSMENT
   ↓
ARCTURUS PRODUCT RESULT
```

---

# PART I — UMAIR ASIF

# 3. UMAIR'S 7-Part MISSION

Umair has one clear responsibility:

> **Make the real Arcturus backend operationally reachable through the real frontend.**

By Part 7, Umair must be able to demonstrate:

```text
REAL USER ACTION
      ↓
FRONTEND REQUEST
      ↓
REAL API
      ↓
REAL BACKEND
      ↓
REAL EXECUTION
      ↓
REAL STATE / EVENTS
      ↓
REAL RESULT
      ↓
FRONTEND
```

He is the primary owner of everything between the frontend and backend.

---

# Part 1 — UMAIR

# REPOSITORY + API + EXISTING-WORK VERIFICATION

## Objective

Do not build anything yet.

First determine exactly what already exists.

---

## Task 1 — Inspect the actual frontend repository

Umair must identify the real locations of:

* application entry point;
* routes;
* pages;
* components;
* API clients;
* services;
* hooks;
* state management;
* frontend types;
* environment configuration;
* integration code;
* tests;
* build configuration.

### Deliverable

Create:

**Frontend Repository Map**

```text
Frontend entry:
Routes:
Pages:
Components:
API layer:
State layer:
Types:
Tests:
Build:
Configuration:
```

Do not invent paths.

---

# Task 2 — Map backend contracts to frontend code

For every backend capability relevant to the product, determine:

| Capability   | Actual backend contract | Frontend consumer | Current state |
| ------------ | ----------------------- | ----------------- | ------------- |
| Experiment   | verified / unavailable  | file/component    | status        |
| Scenario     | verified / unavailable  | file/component    | status        |
| Ontology     | verified / unavailable  | file/component    | status        |
| Enterprise   | verified / unavailable  | file/component    | status        |
| Workforce    | verified / unavailable  | file/component    | status        |
| Workflow     | verified / unavailable  | file/component    | status        |
| Runtime      | verified / unavailable  | file/component    | status        |
| Events       | verified / unavailable  | file/component    | status        |
| Evidence     | verified / unavailable  | file/component    | status        |
| Validation   | verified / unavailable  | file/component    | status        |
| Intelligence | verified / unavailable  | file/component    | status        |

Statuses must be honest:

```text
LIVE
IMPLEMENTED / NOT FULLY INTEGRATED
FOUNDATION
BLOCKED
NOT IMPLEMENTED
```

---

# Task 3 — Find fake/static frontend data

Search for:

* hard-coded experiment results;
* fake employee data;
* static organization counts;
* fake workflow states;
* fake runtime status;
* placeholder charts;
* mock API responses;
* static Intelligence;
* development fixtures;
* frontend-generated IDs;
* fake success transitions.

Classify every occurrence:

```text
TEST-ONLY
DEVELOPMENT-ONLY
LIVE
REMOVE
REPLACE
```

### Critical rule

Do not delete legitimate test fixtures merely because they are static.

The goal is to prevent **test/development data from masquerading as live product truth**.

---

# Task 4 — Run existing frontend checks

Before modifications:

* run available frontend tests;
* run type checks where configured;
* run lint where configured;
* run build where configured;
* record failures;
* record environment failures separately.

Do not modify tests simply to make the baseline green.

---

# Part 1 UMAIR DELIVERABLE

Umair submits:

### Frontend Integration Baseline

```text
Repository:
Branch:
Commit:
Frontend entry:
API layer:
State layer:
Relevant routes:
Backend contracts:
Existing integrations:
Static/mock data:
Tests:
Build:
Known failures:
Known blockers:
```

### Part 1 PASS

Only if:

* repository is understood;
* API boundaries are identified;
* existing work is verified;
* static data is identified;
* baseline tests/build are known;
* dependencies are classified.

---

# Part 2 — UMAIR

# REAL API INTEGRATION

## Objective

Connect the frontend to actual backend contracts.

---

# Task 1 — Build/repair the API integration layer

Umair integrates only APIs that actually exist.

Potential areas:

```text
Experiment
Scenario
Execution
Runtime
State
Events
Evidence
Validation
Intelligence
```

If an API does not exist, he must mark it:

**BLOCKED / NOT AVAILABLE**

—not invent one.

---

# Task 2 — Map backend data correctly

For every response:

```text
Backend response
      ↓
Frontend adapter/service
      ↓
Frontend type/state
      ↓
UI
```

IDs must remain traceable.

For example:

```text
backend experiment_id
        ↓
frontend experiment identifier
```

not:

```text
backend response
        ↓
new fake frontend ID
```

---

# Task 3 — Implement honest API states

Every integrated API must account for applicable states:

```text
loading
success
empty
validation error
backend error
network error
dependency unavailable
unexpected response
```

The exact states must follow the actual API semantics.

---

# Task 4 — Remove live-path static substitution

If the frontend currently does:

```text
API unavailable
     ↓
show fake data
```

that must not remain in the production path.

Instead:

```text
API unavailable
     ↓
honest unavailable/error state
```

---

# Part 2 UMAIR GATE

Prove:

```text
REAL BACKEND
      ↓
REAL API
      ↓
UMAIR INTEGRATION
      ↓
FRONTEND STATE
```

No fake substitution.

---

# Part 3 — UMAIR

# REAL EXPERIMENT + EXECUTION INTEGRATION

## Objective

Make the supported execution path operational from the frontend.

---

# Task 1 — Connect experiment creation/selection

The user must be able to use the actual supported experiment flow.

Depending on the existing product:

```text
Select existing experiment
```

or:

```text
Create experiment
```

or both.

Do not invent unsupported configuration fields.

---

# Task 2 — Connect supported scenario interaction

Where the backend supports scenario selection/configuration:

```text
User
 ↓
Scenario selection/configuration
 ↓
Actual API
 ↓
Actual backend
```

Do not build a fake scenario engine in the frontend.

---

# Task 3 — Connect execution

The execution control must perform a real backend operation.

Forbidden:

```text
Run
 ↓
setState("running")
 ↓
setTimeout
 ↓
setState("completed")
```

Required:

```text
Run
 ↓
real API
 ↓
real backend execution
 ↓
real status
 ↓
frontend
```

---

# Task 4 — Runtime observation

Consume actual runtime information available through Maaz's contracts.

Where supported, display/consume:

* experiment ID;
* execution ID;
* status;
* tick/step;
* state;
* events;
* checkpoint;
* progress;
* completion.

If the system uses polling, call it polling.

If it uses streaming, use the actual streaming mechanism.

Never label a polling implementation as real-time streaming unless the backend actually provides it.

---

# Task 5 — Prevent stale execution data

Umair must handle:

```text
Experiment A
     ↓
Experiment B
```

without allowing A's late response to overwrite B.

Track relevant identity such as:

```text
current experiment
current execution
current request/result
```

according to the existing application architecture.

---

# Part 3 UMAIR GATE

A real user can:

```text
Open Arcturus
 ↓
Select/create supported experiment
 ↓
Configure supported scenario
 ↓
Start real execution
 ↓
Observe real backend state
```

---

# Part 4 — UMAIR

# RUNTIME → EVENTS → EVIDENCE → VALIDATION INTEGRATION

## Objective

Connect the execution output to the trust/evidence layer.

---

# Task 1 — Preserve execution identity

Umair must preserve relevant identifiers through the frontend.

For example:

```text
Experiment
 ↓
Execution
 ↓
Workflow
 ↓
Task
 ↓
State
 ↓
Event
 ↓
Evidence
```

Only fields actually provided by the contracts count.

---

# Task 2 — Consume events

Where available:

```text
Backend event
 ↓
API
 ↓
Frontend
```

Do not manufacture events in the frontend.

---

# Task 3 — Connect evidence

Where available:

```text
Execution
 ↓
Evidence
 ↓
Frontend
```

The evidence must remain traceable to its actual source.

---

# Task 4 — Connect validation

Consume Amina's actual validation result.

The frontend must not independently decide:

```text
PASS
TRUSTED
VALIDATED
```

Those meanings belong to the actual validation contract.

---

# Part 4 UMAIR GATE

Prove:

```text
REAL EXECUTION
      ↓
REAL STATE / EVENTS
      ↓
REAL EVIDENCE
      ↓
REAL VALIDATION
      ↓
FRONTEND
```

where those backend boundaries are actually available.

---

# Part 5 — UMAIR

# INTELLIGENCE INTEGRATION

## Objective

Connect Ahmed's actual Intelligence output to the frontend.

---

# Task 1 — Verify Intelligence contract

Before coding, identify:

* endpoint/service;
* request;
* response;
* assessment fields;
* evidence references;
* experiment references;
* validation references;
* provenance;
* confidence/qualification fields, if actually provided.

---

# Task 2 — Integrate the real output

Required:

```text
Ahmed Intelligence
       ↓
API
       ↓
Umair service/adapter
       ↓
Frontend state
       ↓
Saba UI
```

---

# Task 3 — Handle Intelligence unavailable

If no trusted Intelligence result exists:

```text
No Intelligence result
       ↓
honest unavailable state
```

Never:

```text
No Intelligence
       ↓
hard-coded AI insight
```

---

# Task 4 — Preserve evidence references

If Intelligence says an assessment is based on evidence, preserve those references so Saba can display the relationship.

---

# Part 5 UMAIR GATE

Actual Intelligence output reaches the frontend without modification that changes its meaning.

---

# Part 6 — UMAIR

# FRESH EXECUTION + FAILURE + INTEGRATION HARDENING

## Objective

Prove the frontend is genuinely connected rather than merely showing one successful response.

---

# TEST A — Experiment A

Run:

```text
Experiment A
 ↓
Real execution
 ↓
Real result
 ↓
Frontend
```

Record IDs and evidence.

---

# TEST B — Experiment B

Run a genuinely new experiment:

```text
Experiment B
 ↓
Fresh execution
 ↓
Fresh result
 ↓
Frontend
```

Verify:

* new experiment identity;
* new execution identity;
* correct state;
* correct result;
* no stale A data.

---

# TEST C — Refresh

```text
Start execution
 ↓
Refresh browser
 ↓
Reopen experiment
 ↓
Fetch backend truth
```

The frontend must not depend solely on in-memory state for authoritative information.

---

# TEST D — Failure

Test supported failures such as:

* backend rejection;
* runtime failure;
* missing dependency;
* unavailable evidence;
* validation failure;
* Intelligence unavailable;
* network failure.

The frontend must display the actual failure.

---

# TEST E — Race condition

Test:

```text
Experiment A starts
 ↓
Experiment B becomes active
 ↓
A response arrives late
```

A must not overwrite B.

---

# Part 6 UMAIR GATE

The frontend survives:

```text
Success
Failure
Refresh
Fresh execution
Repeated execution
Unavailable dependency
Late response
```

without displaying false backend truth.

---

# Part 7 — UMAIR

# FINAL GOLDEN INTEGRATION ACCEPTANCE

Part 7 is evidence, not feature expansion.

---

# Umair must prove this exact chain

```text
REAL USER
   ↓
ARCTURUS UI
   ↓
EXPERIMENT
   ↓
ONTOLOGY
   ↓
ENTERPRISE
   ↓
WORKFORCE
   ↓
BEHAVIOR & WORKFLOW
   ↓
SCENARIO
   ↓
RUNTIME
   ↓
STATE + EVENTS
   ↓
SYNTHETIC DATA
   ↓
EVIDENCE
   ↓
VALIDATION
   ↓
INTELLIGENCE
   ↓
FRONTEND
```

Only stages actually available in the repository may be claimed as PASS.

---

# UMAIR Part-7 ACCEPTANCE GATES

| Gate         | Umair must prove                           |
| ------------ | ------------------------------------------ |
| Repository   | Correct final commit                       |
| API          | Real API calls occurred                    |
| Experiment   | Real experiment identity                   |
| Execution    | Real backend execution                     |
| Runtime      | Actual runtime state                       |
| Events       | Actual events where supported              |
| Evidence     | Actual evidence reached frontend           |
| Validation   | Actual validation reached frontend         |
| Intelligence | Actual Intelligence reached frontend       |
| Fresh run    | Experiment B is genuinely new              |
| Refresh      | Backend truth survives reload              |
| Failure      | Real failures are represented              |
| Regression   | Existing functionality remains intact      |
| Build        | Production build succeeds where configured |

---


# PART III — SHARED 7-Part COORDINATION

# 5. HOW UMAIR AND SABA WORK TOGETHER

They do **not** both work on every task.

The handoff is:

```text
UMAIR
Real API
   ↓
Real frontend state
   ↓
SABA
Real product presentation
```

Example:

### Backend returns:

```text
execution_status = FAILED
```

Umair:

```text
API
 ↓
frontend state = FAILED
```

Saba:

```text
FAILED state
 ↓
clear failure UI
```

Neither changes the backend meaning.

---

# 6. DAILY OWNERSHIP

| Part   | Umair Asif                                  | Saba Maryam                       | Joint Gate                 |
| ----- | ------------------------------------------- | --------------------------------- | -------------------------- |
| **1** | Repository/API/backend audit                | Product/UI truth audit            | Existing work verified     |
| **2** | Real API integration                        | Real backend data presentation    | Backend → UI works         |
| **3** | Experiment/execution/runtime integration    | Execution experience              | Real user execution works  |
| **4** | Events/evidence/validation integration      | Evidence/validation/provenance UX | Trust chain visible        |
| **5** | Intelligence integration                    | Intelligence product experience   | Real Intelligence visible  |
| **6** | Fresh runs/race/failure/integration testing | UX hardening/failure/refresh      | Full live product verified |
| **7** | Final integration/golden backend proof      | Final product/golden UX proof     | Final acceptance           |

---

# 7. DAILY HANDOFF RULE

Every Part:

### Umair delivers to Saba

```text
What API works:
What data is available:
What IDs exist:
What states exist:
What errors exist:
What is unavailable:
What changed:
```

### Saba delivers to Umair

```text
What UI needs:
What states are required:
What fields are missing:
What backend behavior is unclear:
What stale-data problems were found:
What UX exposes contract problems:
```

This prevents the two developers from independently making assumptions.

---

# 8. BLOCKED VS FAIL — FRONTEND RULE

This distinction is mandatory.

## FAIL

Use **FAIL** when the required capability exists and the frontend implementation is wrong.

Example:

```text
API exists
 ↓
API returns correct result
 ↓
frontend displays wrong result
```

That is:

> **FRONTEND FAIL**

---

## BLOCKED

Use **BLOCKED** when the required upstream capability is objectively unavailable.

Example:

```text
Frontend ready
 ↓
Intelligence API unavailable
 ↓
cannot verify Intelligence integration
```

That is:

> **BLOCKED**

Not FAIL.

---

## IMPLEMENTED / NOT FULLY INTEGRATED

Use this when:

```text
Frontend code exists
+
backend capability exists or is expected
+
complete live chain has not yet been demonstrated
```

---

## FOUNDATION / FUTURE

Use this when:

```text
UI architecture exists
but required backend capability is not currently available
```

---

# 9. NO FABRICATION RULE

If an upstream team is blocked:

```text
Reproduce
 ↓
Capture evidence
 ↓
Identify dependency
 ↓
Record BLOCKED
 ↓
Continue independent frontend verification
```

Never create:

```text
fake enterprise
fake workforce
fake runtime
fake evidence
fake Intelligence
```

to force a PASS.

---

# 10. FRESH EXPERIMENT ACCEPTANCE

Both must participate.

## Experiment A

```text
A
 ↓
execution A
 ↓
result A
```

## Experiment B

```text
B
 ↓
execution B
 ↓
result B
```

The requirement is **not** that A and B must have different outputs.

The requirement is:

> **B must be a genuinely new execution and must not accidentally reuse A's state or result.**

---

# 11. CONTROLLED DETERMINISTIC REPEAT

Only perform this where the architecture actually guarantees determinism.

```text
Same seed
+
Same configuration
+
Same relevant inputs
 ↓
Repeat
 ↓
Compare guaranteed deterministic outputs
```

Do not claim determinism merely because two UI results look similar.

---

# 12. FRONTEND STALE-DATA ACCEPTANCE

This is a mandatory test.

Scenario:

```text
User views Experiment A
       ↓
Starts/opens Experiment B
       ↓
Late response from A arrives
```

Expected:

```text
B remains B
```

A must never silently overwrite B.

---

# 13. FRONTEND REFRESH ACCEPTANCE

Test:

```text
Start Experiment
 ↓
Execution continues
 ↓
Browser refresh
 ↓
Reopen experiment
 ↓
Frontend requests actual backend state
 ↓
Correct state appears
```

The frontend must not depend on temporary memory for authoritative execution state.

---

# 14. FINAL PRODUCT STATE MODEL

The frontend must distinguish applicable states such as:

```text
IDLE
LOADING
RUNNING
COMPLETED
EMPTY
FAILED
BLOCKED
UNAVAILABLE
REFRESHING
VALIDATION_FAILED
```

But:

> **The exact state names must follow the actual backend contracts.**

Do not invent backend semantics just because a UI component needs another badge.

---

# 15. TESTING RESPONSIBILITY

## Umair primarily verifies

```text
API integration
Data mapping
State management
Execution
Runtime
Events
Refresh
Race conditions
Backend/frontend integration
```

## Saba primarily verifies

```text
Rendering
Navigation
Loading
Empty
Error
Execution comprehension
Evidence presentation
Validation presentation
Intelligence presentation
Provenance
Responsive behavior
Product consistency
```

## Both verify

```text
Fresh Experiment B
Failure behavior
Production build
Golden run
No static live data
Final regression
```

---

# 16. FINAL REPOSITORY / GITHUB PASS

On Part 7 both inspect the final repository state.

Verify:

* only intended files changed;
* no accidental changes;
* no debug code;
* no temporary production mocks;
* no hard-coded runtime truth;
* no credentials/secrets;
* no fake API;
* tests remain;
* integration code is present;
* documentation is accurate;
* ownership boundaries remain intact.

The final repository must be reproducible by another engineer.

---

# 17. FINAL EVIDENCE PACKAGE

The two developers must leave evidence containing:

## Repository

```text
Repository:
Branch:
Commit:
Changed files:
Tests:
Build result:
```

## Experiment A

```text
Experiment ID:
Execution ID:
Frontend action:
Backend result:
UI result:
```

## Experiment B

```text
Experiment ID:
Execution ID:
Frontend action:
Backend result:
UI result:
```

## Failure

```text
Failure type:
Backend behavior:
Frontend behavior:
Evidence:
```

## Validation

```text
Validation result:
Evidence reference:
UI representation:
```

## Intelligence

```text
Intelligence result:
Evidence reference:
Validation relationship:
UI representation:
```

## Final status

```text
VERIFIED LIVE
IMPLEMENTED / NOT FULLY INTEGRATED
BLOCKED
FOUNDATION / FUTURE
NOT IMPLEMENTED
```

---

# 18. FINAL UMAIR DEFINITION OF DONE

Umair is complete only when:

```text
Repository verified
+
Previous frontend integration verified
+
Backend contracts verified
+
Real APIs integrated
+
Experiment flow works
+
Scenario integration works where supported
+
Runtime integration works
+
State/events work where supported
+
Evidence reaches frontend
+
Validation reaches frontend where available
+
Intelligence reaches frontend where available
+
Fresh Experiment B works
+
Refresh works
+
Race/stale-data protection verified
+
Failure behavior verified
+
Tests/regression acceptable
+
Production build passes where configured
+
Golden run evidence captured
```


# 20. FINAL JOINT DEFINITION OF DONE

Umair and Saba are complete only when the following is demonstrated through the actual Arcturus product:

```text
                    REAL USER
                        ↓
                 ARCTURUS FRONTEND
                        ↓
                    EXPERIMENT
                        ↓
                    ONTOLOGY
                        ↓
                   ENTERPRISE
                        ↓
                    WORKFORCE
                        ↓
              BEHAVIOR & WORKFLOW
                        ↓
                     SCENARIO
                        ↓
                     RUNTIME
                        ↓
                STATE + EVENTS
                        ↓
                 SYNTHETIC DATA
                        ↓
                    EVIDENCE
                        ↓
                   VALIDATION
                        ↓
                  INTELLIGENCE
                        ↓
              ASSESSMENT / PROVENANCE
                        ↓
                  PRODUCT RESULT
```

With:

```text
EXPERIMENT A
     ↓
REAL RESULT A

EXPERIMENT B
     ↓
REAL RESULT B

EXPERIMENT A REPEAT
     ↓
SUPPORTED REPRODUCIBLE RESULT
```

---

# 21. FINAL FRONTEND ACCEPTANCE MATRIX

| Capability                                | Umair                        | Saba                    | Final Requirement |
| ----------------------------------------- | ----------------------------- | ------------------------ | ------------------ |
| Repository verification                   | **Owner**                    | Support                 | PASS              |
| API contracts                             | **Owner**                    | Support                 | PASS              |
| Experiment integration                    | **Owner**                    | Support                 | PASS              |
| Scenario integration                      | **Owner**                    | **Presentation**        | PASS              |
| Ontology/Enterprise/Workforce consumption | **Integration**              | **Presentation**        | PASS/BLOCKED      |
| Workflow consumption                      | **Integration**              | **Presentation**        | PASS/BLOCKED      |
| Runtime                                   | **Owner**                    | Presentation            | PASS/BLOCKED      |
| State                                     | **Owner**                    | Presentation            | PASS              |
| Events                                    | **Owner**                    | Presentation            | PASS/BLOCKED      |
| Evidence                                  | **Integration**              | **Owner presentation**  | PASS/BLOCKED      |
| Validation                                | **Integration**              | **Owner presentation**  | PASS/BLOCKED      |
| Intelligence                              | **Integration**              | **Owner presentation**  | PASS/BLOCKED      |
| Provenance                                | **Integration**              | **Owner presentation**  | PASS/BLOCKED      |
| Loading                                   | Support                      | **Owner**               | PASS              |
| Empty                                     | Support                      | **Owner**               | PASS              |
| Error                                     | **Integration**              | **Owner UX**            | PASS              |
| Fresh execution                           | **Owner**                    | **Verify**              | PASS              |
| Refresh                                   | **Owner**                    | **Verify**              | PASS              |
| Race conditions                           | **Owner**                    | Verify                  | PASS              |
| Responsive UX                             | Support                      | **Owner**               | PASS              |
| Final golden run                          | **Owner integration proof**  | **Owner product proof** | PASS              |
| Final evidence                            | **Owner technical evidence** | **Owner UX evidence**   | PASS              |

---

# 22. FINAL 7-Part MASTER TABLE

| Part       | UMAIR ASIF — INTEGRATION                             | SABA MARYAM — PRODUCT EXPERIENCE                    | ACCEPTANCE GATE                              |
| --------- | ---------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| **Part 1** | Repository, API, existing integration and mock audit | UI/product truth and information architecture audit | Both know exactly what exists                |
| **Part 2** | Connect real APIs and backend data                   | Build truthful product data surfaces                | Real backend data reaches UI                 |
| **Part 3** | Experiment, scenario and runtime integration         | Live execution experience                           | Real user can operate supported execution    |
| **Part 4** | State/events/evidence/validation integration         | Evidence/validation/provenance UX                   | Trust chain is visible                       |
| **Part 5** | Intelligence integration                             | Intelligence assessment UX                          | Real Intelligence is visible where available |
| **Part 6** | Fresh runs, refresh, race, failure and regression    | Loading/error/empty/fresh-data/product hardening    | Product survives real-world states           |
| **Part 7** | Golden technical integration proof                   | Golden product experience proof                     | Final live product accepted                  |

---

# 23. FINAL NON-NEGOTIABLE PRINCIPLES

### 1. Backend truth beats frontend appearance.

If the backend says failure, the UI shows failure.

### 2. Repository truth beats old documentation.

If documented paths differ from the repository, verify and record the discrepancy.

### 3. Real execution beats animation.

A loading animation is not evidence of execution.

### 4. Real evidence beats a dashboard.

A beautiful chart containing fabricated values is not a product proof.

### 5. BLOCKED is not FAIL.

An unavailable upstream dependency is recorded honestly.

### 6. FAIL is not BLOCKED.

If the backend works and the frontend is wrong, the frontend fails.

### 7. Fresh execution beats static data.

Experiment B must prove the frontend is not merely displaying Experiment A.

### 8. Validation is not Intelligence.

They remain separate product concepts.

### 9. Intelligence is not organizational fact.

The UI must preserve the qualification semantics of the actual Intelligence output.

### 10. Frontend does not own backend truth.

Umair and Saba consume and present it.

---

# 24. FINAL CONSTITUTIONAL STATEMENT

**Umair Asif** owns the technical bridge between the real Arcturus backend and the real frontend.

```text
REAL BACKEND
     ↓
REAL API
     ↓
UMAIR
     ↓
REAL FRONTEND STATE
```

**Saba Maryam** owns the product experience that turns that real state into an understandable and trustworthy interface.

```text
REAL FRONTEND STATE
     ↓
SABA
     ↓
REAL PRODUCT EXPERIENCE
```

Together:

```text
                ARCTURUS BACKEND
                       ↓
                  REAL CONTRACT
                       ↓
                UMAIR ASIF
             Integration / Execution
                       ↓
                REAL FRONTEND STATE
                       ↓
                SABA MARYAM
             Product / Evidence UX
                       ↓
                REAL ARCTURUS UI
                       ↓
                  REAL USER
```
