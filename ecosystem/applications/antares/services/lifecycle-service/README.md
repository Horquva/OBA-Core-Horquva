# ANTARES ENGINEERING OPERATIONS PLATFORM
### Owner: Kamil Ejaz — Engineering Lead
### Status: Day 1 ✅ | Day 2 ✅ | Day 3-4 ✅ | Day 5 ✅ | Day 6 ✅ | Day 7 ✅ | Day 8-9 ✅ | Day 10 ✅ — ALL 10 DAYS COMPLETE

---

## What This Is

This is the Engineering Operations Platform described in the 10-day
plan. It is real, working code — not a mockup or slides. Running it,
you can see for yourself that it:

- Registers all 11 Antares platforms — using the real names (Aurangzeb,
  Muzammel, Syed Hadeed, Zeeshan, Hasnain, Kanwal, Zara, Ammara, Laiba,
  Abbas, and Kamil himself)
- Tracks every platform's "jobs" — dependency, status, and evidence,
  all together
- Runs quality gates — any output that is "mock/fake/placeholder" or
  has no evidence attached gets rejected (this is real logic, not a
  hardcoded pass)
- Shows the system's health (how many platforms are blocked, how many
  passed, what the gate pass-rate is)
- Provides a small "AI Engineering Operations Assistant" that only
  answers questions against REAL data — it never makes anything up
- Enforces platform-to-platform contracts (who is allowed to depend on
  whom) and catches violations automatically
- Runs a full, live, end-to-end demo connecting all 11 platforms in
  one chain

---

## Folder Structure

```
antares-engops/
├── package.json
├── dashboard-data.json      ← auto-generated after running the demo
├── .github/
│   └── workflows/
│       └── ci.yml            ← Day 5: GitHub Actions — runs CI automatically on every push/PR
├── scripts/
│   ├── lint.js                ← Day 5: static code checks
│   ├── buildcheck.js          ← Day 5: syntax/build verification
│   └── ci.js                   ← Day 5: full pipeline — lint → build → tests
├── store/
│   └── state.json           ← Day 2: persisted data (created after running the demo)
├── src/
│   ├── models.js            ← Platform, Job, Execution, Status enum, Event
│   ├── persistence.js        ← Day 2: save/load state to disk
│   ├── board.js               ← Day 2: standalone status board
│   ├── cli.js                  ← Day 3-4: Engineering API / command-line interface
│   ├── qualityGates.js       ← real validation checks (Day 5, job-output level)
│   ├── ciHistory.js           ← Day 6: saves every CI run, computes Engineering Health
│   ├── observability.js       ← Day 6: combines System + Engineering + Platform Health
│   ├── dashboard.js            ← Day 6: clean operational dashboard
│   ├── contracts.js            ← Day 8-9: turns the Day 1 System Map into enforceable rules
│   ├── engine.js             ← the full orchestration engine (Day 3,4,6,7) — with Execution tracking
│   ├── seed.js                ← registers the 11 real Antares platforms
│   └── demo.js                ← Day 10: the final live end-to-end demo, all platforms connected
└── test/
    ├── engine.test.js         ← 15 automated tests
    ├── persistence.test.js    ← 4 automated tests, Day 2
    ├── orchestration.test.js  ← 8 automated tests, Day 3-4
    ├── ci.test.js              ← 3 automated tests, Day 5
    ├── observability.test.js  ← 5 automated tests, Day 6
    ├── assistant.test.js      ← 8 automated tests, Day 7
    └── integration.test.js    ← 8 automated tests, Day 8-9 — full 11-platform chain
```

---

## How To Run It

```bash
cd antares-engops
npm test               # 51/51 tests should pass
npm run demo           # the final full end-to-end demo runs in the console
node src/board.js      # Day 2: shows a status board from saved state

# Day 5: CI pipeline — run this BEFORE pushing code:
npm run ci              # lint -> build -> tests, all together, in this order

# Day 6: the full observability dashboard (System + Engineering + Platform Health)
node src/dashboard.js

# Day 3-4: use the CLI to work live (any command, any time):
node src/cli.js register-platform cap-validation "Capability Validation" "Zara Fatima"
node src/cli.js create-job J-001 cap-validation "Validate governance capability"
node src/cli.js start J-001 zara
node src/cli.js evidence J-001 "source:org-signal-report"
node src/cli.js submit J-001 "Capability looks strong"
node src/cli.js history J-001
node src/cli.js board
node src/cli.js ask "is anything blocked?"
node src/cli.js contracts        # Day 8-9: platform-to-platform contract check
```

**If `npm run <script>` fails on your machine** (a known Windows/npm
configuration issue some team members hit), use `node` directly
instead — it works identically:

```bash
node scripts/lint.js
node scripts/buildcheck.js
node scripts/ci.js
node --test test/engine.test.js test/persistence.test.js test/orchestration.test.js test/ci.test.js test/observability.test.js test/assistant.test.js test/integration.test.js
```

After `npm run demo` (or `node src/demo.js`), two files are created:
- `dashboard-data.json` — a snapshot for the React dashboard artifact
- `store/state.json` — Day 2's actual persisted data, which `board.js` reads

**Proof of Day 2's persistence:** run `node src/demo.js` once, close the
terminal, then open a new terminal and run only `node src/board.js` —
you'll see the same data, without re-running the demo. This proves the
data no longer dies with the process.

---

## How This Maps To Each "Day" Of The Plan

| Day | What The Plan Asked For | Where It Lives In This Code |
|---|---|---|
| **Day 1** | Build the System Map | `seed.js` registers the full chain; the README + dashboard show the full map |
| **Day 2** | Foundation — task/dependency/ownership/evidence tracking, basic dashboard | `models.js` (Platform, Job, Evidence) + `engine.js`'s `attachEvidence()`, `getSystemHealth()` — plus `persistence.js` (save/load to disk) and `board.js` (standalone status board) |
| **Day 3-4** | Live orchestration — Job Model (Platform·Task·Dependency·Execution·Status), status flow QUEUED→RUNNING→VALIDATING→PASSED→INTEGRATED→RELEASE_READY | `engine.js` — `start()`, `submitForValidation()`, `integrate()`, `releaseReady()`, `ALLOWED_TRANSITIONS` (rejects illegal jumps) — plus `models.js`'s `Execution` model (a separate record per attempt) and `cli.js` (Engineering API — live use from the command line) |
| **Day 5** | CI/CD + Quality Gates — no broken output should silently spread | `qualityGates.js` (job-output gate, 5 checks) — plus `scripts/lint.js` (code static checks), `scripts/buildcheck.js` (syntax/build), `scripts/ci.js` (full pipeline, fail-fast), `.github/workflows/ci.yml` (runs automatically on every push/PR) |
| **Day 6** | Observability — System/Engineering/Platform health, clean dashboard | `engine.js`'s `getSystemHealth()` + `getPlatformHealth()` — plus `ciHistory.js` (Engineering Health, from real CI run history), `observability.js` (all three health views combined), `dashboard.js` (clean terminal dashboard, styled after the Antares screenshots) — and the earlier React dashboard artifact visualizes the same data |
| **Day 7** | AI Engineering Ops Assistant — "which platform is blocked? why?" from real data | `engine.js`'s `askAssistant()` — now platform-aware too: `findBlockedPlatforms()`, `explainPlatformBlockage()`, and `_findMentionedPlatform()` recognize a platform or owner's name in the question and answer only about that platform — deterministic, not an LLM, so it never hallucinates |
| **Day 8-9** | System-wide integration test, deliberately inject failures, check platform-to-platform contracts | `test/engine.test.js` (unit-level, 15 tests) — plus `src/contracts.js` (enforces the Day 1 System Map in code), `test/integration.test.js` (the full 11-platform chain, a deliberate FAILED→retry, a deliberate BLOCKED-on-a-stalled-platform, and two deliberately illegal cross-platform dependencies that the contract checker catches), and the `cli.js contracts` command for checking live state |
| **Day 10** | Final live demo — run the whole chain together and show everything connected | `demo.js` — Aurangzeb → Syed Hadeed → Muzammel → Kanwal → Zara → Ammara → Laiba → Abbas → Zeeshan → Hasnain, the full real chain runs end to end, with a deliberate retry and a deliberate auto-unblock, then a contract check and the complete dashboard print out at the end |

---

## Key Things To Understand

**How the Quality Gate works (the heart of Day 5):**
When a job submits its output (`submitForValidation`), the engine
checks five things:
1. Are all dependencies satisfied?
2. Are the required fields (`summary`, `output`) present?
3. Does the output contain a word like "TODO", "mock", "fake",
   "placeholder", or "hardcoded"? (if so — automatic FAIL)
4. Is evidence attached to this job?
5. If the job declared self-tests, did they all pass?

If even ONE of these fails, the whole gate FAILS and the job moves to
the `FAILED` state — there is no partial pass. In the demo, you saw
`J-VALID-01`'s first attempt FAIL for exactly this reason — no
evidence was attached — exactly as it should behave on the real
Capability Validation platform.

**Why the AI Assistant isn't a "real" AI:**
The roadmap explicitly states: "AI must never independently decide"
and "AI recommendations must remain evidence-backed." That's why
`askAssistant()` is a rule-based, deterministic function that only
reads real `jobs`/`events` data — no language model that could make
something up. This fully matches Antares' AI-safety principle. It
could later be upgraded to a real LLM, but the underlying
evidence-lookup would stay the same.

**The status flow never lets you "cheat":**
`ALLOWED_TRANSITIONS` only defines legal jumps (like
`RUNNING → VALIDATING → PASSED`). If someone accidentally tries to
`integrate()` a job that's still `QUEUED`, the engine throws an error.
The test `illegal transition is rejected` proves this.

**Platform-to-platform contracts (Day 8-9):**
`contracts.js` encodes exactly who is allowed to depend on whom,
straight from the Day 1 System Map. If a job depends on a platform
outside its contract — for example, Technology Intelligence directly
depending on Capability Operationalization, skipping the entire chain
in between — `checkAllContracts()` catches it and reports exactly
which job broke which rule.

---

## Dashboard (Live UI)

An interactive dashboard is also included (designed after the real
Antares UI screenshots — dark sidebar, health cards, live events feed,
AI assistant box). This dashboard runs a JavaScript port of the same
engine in the browser, so it can be used live to show:
- Starting a job
- Watching a quality gate pass/fail
- Explaining a blocked job
- Asking the AI assistant a question

The dashboard's code is provided separately (a `.jsx` artifact) — it
can be screen-shared during the Day 10 demo to show the
team/supervisor everything live.

---

## Next Steps (If There's Time)

- Put `dashboard-data.json` behind a small Express API, so the
  dashboard can pull live data from a real backend (right now it's
  self-contained).
- Have each platform owner (Zara, Ammara, etc.) start sending their
  real job output through this `submitForValidation()` API — then this
  stops being a "demo" and becomes the real Antares control plane.
- Wire `npm test` into GitHub Actions to run automatically on every
  commit (this already exists via `.github/workflows/ci.yml`, added on
  Day 5).
