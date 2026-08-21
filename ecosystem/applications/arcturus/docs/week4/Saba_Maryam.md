# SABA MARYAM

**Product Role:** Unified Product Frontend / Live Product Experience
**Primary Objective:** Convert the already-existing Arcturus backend capabilities into **one real, integrated, truthful, evidence-grounded product experience**.

---

### SABA MARYAM

**Product Experience & Evidence/Intelligence Presentation Owner**

Saba makes the real backend output **understandable and trustworthy to the user**.

Her question is:

> **“Can the user understand exactly what Arcturus actually executed, what happened, what evidence exists, and what the backend concluded?”**

She owns:

* product information architecture;
* screens and user flows;
* execution presentation;
* organization/workforce/workflow presentation;
* state/event presentation;
* evidence UX;
* validation UX;
* Intelligence UX;
* provenance UX;
* loading/empty/error UX;
* responsive/product-quality verification;
* final usability and product acceptance.

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


# 4. SABA'S 7-Part MISSION

Saba has a different responsibility:

> **Turn Umair's real backend-connected data into one coherent, understandable, trustworthy Arcturus product.**

Saba does not decide what the backend means.

She presents what the backend actually says.

Her product question is:

> **“Can a real user understand the execution, state, evidence, validation and Intelligence without being misled?”**

---

# Part 1 — SABA

# PRODUCT TRUTH + INFORMATION ARCHITECTURE AUDIT

## Objective

Understand the current product before redesigning it.

---

# Task 1 — Audit every existing screen

For each screen record:

```text
Screen:
Purpose:
Data source:
Backend capability:
Static data:
Live data:
Missing states:
Navigation:
Status:
```

---

# Task 2 — Identify disconnected product areas

Look for:

* screens that do not connect to backend data;
* duplicated concepts;
* inconsistent terminology;
* broken navigation;
* missing execution visibility;
* missing evidence;
* missing validation;
* missing Intelligence;
* screens that display unsupported claims.

---

# Task 3 — Establish the product information architecture

Use existing architecture where possible.

Potential areas:

```text
Overview
Experiments
Scenarios
Organization
Workforce
Workflow
Execution
Events / State
Evidence
Validation
Intelligence
```

These are **not automatically required screens**.

Saba must only expose surfaces supported by actual backend capabilities.

---

# Task 4 — Define product states

For each major screen define applicable states:

```text
Not started
Loading
Running
Completed
Empty
Failed
Unavailable
Blocked
Refreshing
```

Only use terminology compatible with backend semantics.

---

# Part 1 SABA DELIVERABLE

### Product Truth Map

```text
Existing screen:
Actual data:
Backend source:
Current problem:
Required UX:
Status:
```

### Part 1 PASS

The product structure is understood before major UI changes begin.

---

# Part 2 — SABA

# REAL BACKEND DATA → PRODUCT SURFACES

## Objective

Turn real data into usable screens.

Umair owns the connection.

Saba owns the presentation.

---

# Task 1 — Organization experience

Where supported, display actual enterprise information.

Do not show:

```text
Employees: 500
Departments: 12
```

unless those values come from the actual backend.

---

# Task 2 — Workforce experience

Where supported, present actual workforce information.

Show only attributes supplied by the backend.

Do not invent:

* employee skills;
* hierarchy;
* capacity;
* roles;
* workload;
* authority.

---

# Task 3 — Workflow experience

Where supported, show actual:

* workflow;
* task;
* participant;
* assignment;
* state;
* dependency;
* approval;
* handoff;
* escalation.

Only capabilities actually exposed by Javeria's implementation count.

---

# Task 4 — Scenario experience

Present supported scenario information clearly.

The UI should distinguish:

```text
Scenario configuration
```

from:

```text
Actual execution result
```

---

# Part 2 SABA GATE

Real backend data is visibly represented in the correct product surfaces.

---

# Part 3 — SABA

# EXECUTION EXPERIENCE

## Objective

Make a live execution understandable.

---

# Task 1 — Build the execution view

The user should be able to understand:

```text
Which experiment?
Which scenario?
Which execution?
Current state?
What is happening?
What happened?
Did it complete?
Did it fail?
```

---

# Task 2 — Present actual runtime state

If backend says:

```text
RUNNING
```

show the actual running state.

If backend says:

```text
FAILED
```

show failure.

Do not transform:

```text
FAILED → COMPLETED
```

for visual convenience.

---

# Task 3 — Present events

Where events exist:

```text
Event
 ↓
timestamp/order where supported
 ↓
actual state/context
```

Do not create fake event timelines.

---

# Task 4 — Execution identity

Make it clear which experiment/execution the user is viewing.

This prevents:

```text
Experiment B selected
but Experiment A result displayed
```

---

# Part 3 SABA GATE

A user can understand a real execution without needing to inspect backend logs.

---

# Part 4 — SABA

# EVIDENCE + VALIDATION + PROVENANCE EXPERIENCE

## Objective

Build the product's trust layer.

---

# Task 1 — Evidence presentation

Where supported, allow the user to inspect:

* evidence identifier;
* source;
* experiment;
* scenario;
* related event/state;
* validation status;
* provenance.

---

# Task 2 — Distinguish three different things

The UI must clearly separate:

### Simulation Result

```text
What the execution produced.
```

### Validated Evidence

```text
What has passed through the validation boundary.
```

### Intelligence Assessment

```text
What the Intelligence layer concluded from available evidence.
```

These must never visually collapse into one generic “result.”

---

# Task 3 — Validation presentation

Show the actual validation status.

For example, if the backend supplies:

```text
accepted
```

show the actual accepted state.

If it supplies:

```text
rejected
```

show rejection and relevant reason where available.

Do not independently decide whether something is “trusted.”

---

# Task 4 — Provenance

Where provided, let the user trace:

```text
Assessment
 ↓
Evidence
 ↓
Execution
 ↓
Experiment
```

Do not invent missing lineage.

---

# Part 4 SABA GATE

The user can understand where an important result came from.

---

# Part 5 — SABA

# INTELLIGENCE PRODUCT EXPERIENCE

## Objective

Make Ahmed's actual Intelligence output understandable without exaggerating its authority.

---

# Task 1 — Present the actual assessment

Where available:

```text
Intelligence assessment
 ↓
supporting evidence
 ↓
experiment
 ↓
validation
 ↓
provenance
```

---

# Task 2 — Do not invent confidence

If backend provides confidence:

```text
display it accurately
```

If backend does not:

```text
do not create confidence
```

---

# Task 3 — Do not invent explanations

If Ahmed provides reasoning/explanation:

```text
display actual supported explanation
```

If he does not:

```text
do not generate frontend explanations pretending to be backend reasoning
```

---

# Task 4 — Handle missing Intelligence

If no trusted Intelligence result exists:

```text
No validated Intelligence assessment available.
```

or the repository's established equivalent.

Never show:

```text
AI insight coming soon
```

as though it were a real assessment.

---

# Task 5 — Communicate qualification correctly

The interface should make clear that an Intelligence assessment is an **assessment derived from the available simulation/evidence**, not necessarily an unquestionable real-world fact.

---

# Part 5 SABA GATE

A user can understand:

```text
What was assessed?
Why is it shown?
What evidence supports it?
What validation exists?
What experiment produced it?
```

to the extent the backend actually provides those relationships.

---

# Part 6 — SABA

# UX HARDENING + FAILURE + FRESH-DATA VERIFICATION

## Objective

Prove the product remains truthful outside the happy path.

---

# Test 1 — Loading

When data is loading:

```text
Loading
```

must be truthful.

No fake result should appear underneath.

---

# Test 2 — Empty

When no data exists:

```text
Empty state
```

must clearly explain that no data is currently available.

---

# Test 3 — Failure

When backend fails:

```text
Backend failure
 ↓
honest UI failure
```

Never:

```text
backend failure
 ↓
green success screen
```

---

# Test 4 — Dependency unavailable

If an upstream service is unavailable:

```text
Unavailable / blocked
```

must not be presented as:

```text
Completed successfully
```

---

# Test 5 — Experiment A → B

Verify:

```text
Experiment A
 ↓
Result A
```

then:

```text
Experiment B
 ↓
Result B
```

The interface must update correctly.

---

# Test 6 — Browser refresh

Verify:

```text
Experiment
 ↓
Execution
 ↓
Refresh
 ↓
Reopen
 ↓
Correct backend state
```

No stale in-memory result should masquerade as current truth.

---

# Test 7 — Responsive/product quality

Verify actual supported product surfaces for:

* desktop;
* smaller viewport;
* long evidence;
* long assessments;
* errors;
* loading;
* empty states;
* navigation;
* dialogs/modals where applicable;
* overflow.

Do not turn this into an unnecessary design-system rewrite.

---

# Part 6 SABA GATE

The product remains truthful and usable under:

```text
Success
Loading
Empty
Failure
Blocked
Refresh
Fresh execution
Long content
```

---

# Part 7 — SABA

# FINAL GOLDEN PRODUCT ACCEPTANCE

Part 7 is the final product proof.

No major new feature work.

---

# SABA GOLDEN RUN

Starting from the real Arcturus UI:

```text
REAL USER
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
ASSESSMENT
   ↓
PROVENANCE
   ↓
PRODUCT UI
```

Saba verifies that each visible result corresponds to the actual backend result.

---

# SABA Part-7 ACCEPTANCE GATES

| Gate           | Saba must prove                           |
| -------------- | ------------------------------------------ |
| Product flow   | User understands the complete journey     |
| Experiment     | Correct experiment displayed              |
| Scenario       | Correct supported scenario displayed      |
| Execution      | Actual execution state visible            |
| Runtime        | Actual runtime information represented    |
| Events         | Actual events represented where available |
| Evidence       | Evidence can be inspected                 |
| Validation     | Validation is accurately presented        |
| Intelligence   | Actual assessment is presented            |
| Provenance     | Available lineage is visible              |
| Failure        | Failure is honest                         |
| Fresh run      | Experiment B updates the UI               |
| Refresh        | Correct backend state returns             |
| Visual quality | Product remains coherent                  |
| Responsive     | Supported viewports work                  |
| Build          | Final frontend works in production build  |

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

# FINAL SABA DEFINITION OF DONE

Saba is complete only when:

```text
Existing UI verified
+
Product information architecture verified
+
Real backend data displayed
+
Experiment identity clear
+
Execution state understandable
+
Scenario presentation accurate
+
Organization/workforce/workflow visible where supported
+
Events understandable
+
Evidence inspectable
+
Validation accurately presented
+
Intelligence accurately presented
+
Supporting evidence visible where available
+
Provenance visible where supported
+
Loading states work
+
Empty states work
+
Failure states work
+
Blocked/unavailable states work
+
Fresh Experiment B updates correctly
+
Refresh preserves backend truth
+
No static runtime truth remains in live paths
+
Responsive/product quality verified
+
Golden product run passes
```

---

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

| Capability                                | Umair                         | Saba                     | Final Requirement |
| ----------------------------------------- | ----------------------------- | ------------------------- | ------------------ |
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
