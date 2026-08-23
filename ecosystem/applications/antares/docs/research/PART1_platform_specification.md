# Future-Signal Intelligence — Platform Specification

**Part-1 deliverable.** Defines exactly what this platform receives, processes,
produces and exposes.

> **Reconcile before merging.** Everything below is written against the roadmap
> document. Three things must be confirmed against the *locked* Antares
> architecture, and the locked architecture wins wherever it disagrees:
> repository paths, endpoint naming conventions, and the exact field names in
> the cross-platform contract.

---

## 1. Position in the Antares lifecycle

```
Technology Intelligence  (Aurangzeb)
            │
            ▼
  ┌────────────────────────────────────┐
  │  FUTURE-SIGNAL INTELLIGENCE        │   ← this platform
  │  emerging signal → evidence →      │
  │  impact → pattern → confidence     │
  └────────────────────────────────────┘
            │
            ▼
Organizational Futures (Muzammel) → Capability Validation (Zara)
   → Enterprise Validation (Ammara) → Knowledge Operationalization (Laiba)
   → Capability Operationalization (Abbas) → OBA
```

**In scope:** emerging-signal discovery, evidence capture, organizational impact
intelligence, future-pattern detection, signal scoring, intelligence pipelines.

**Explicitly out of scope:** technology intelligence itself, autonomous-agent
engineering, general organizational-futures modelling, capability validation,
capability operationalization, knowledge operationalization, engineering
operations. When a request touches one of these, the correct engineering answer
is to expose an interface, not to implement the other platform's logic.

---

## 2. Accepted inputs

| Input | Required fields | Rejected when |
|---|---|---|
| Emerging signal | `title` (≥8 chars), `description` (≥30 chars) | too short; unknown taxonomy term supplied |
| Evidence item | `title`, `excerpt`, `source_name`, `source_type` | unknown `source_type`; unknown `signal_id` |
| Impact override | `dimension`, `direction`, `severity` (1–5) | dimension outside the controlled vocabulary; severity out of range |

Optional on a signal: `themes`, `dimensions`, `organizations`. When omitted,
themes are derived by deterministic keyword classification and dimensions are
derived from the theme's default dimensions.

**Refusal is a feature.** A signal with no evidence cannot have its impact
analyzed. This is enforced in code, not by convention.

---

## 3. Representations

### Signal
Deterministic id (`sig_<sha256[:16]>` of the normalized title), normalized key
for deduplication, themes, dimensions, organizations, lifecycle state, version
counter, and a full state history.

### Evidence
Deterministic id, link to exactly one signal, verification status, observation
date, and a mandatory `SourceProvenance` block (source name, source type, URL,
publication date, retrieval time, retrieving actor).

**Effective weight** = source reliability × status multiplier.

| Source type | Reliability | | Status | Multiplier |
|---|---|---|---|---|
| Peer reviewed | 1.00 | | Verified | 1.0 |
| Industry report | 0.85 | | Unverified | 0.6 |
| Internal observation | 0.75 | | Disputed | 0.3 |
| News | 0.60 | | Outdated | 0.2 |
| Vendor publication | 0.50 | | Retracted | 0.0 |
| Practitioner blog | 0.40 | | | |
| Social | 0.25 | | | |

A retracted item contributes exactly zero. It is retained, not deleted — the
audit trail must show that it was once counted.

### Impact
One structured record per organizational dimension: direction
(`INCREASES` / `DECREASES` / `RESHAPES` / `NO_EFFECT`), severity 1–5, horizon in
months, and rationale. Never a paragraph.

### Confidence
A value in 0–1 **plus** the factor breakdown that produced it. A bare number is
not auditable and is not accepted as an output of this platform.

```
score = Σ(weightᵢ × factorᵢ) × (1 − contradiction_penalty)

evidence_strength        0.25    mean effective weight of supporting evidence
recurrence               0.20    independent signals carrying the theme (÷5, capped)
source_diversity         0.20    distinct source *types* (÷4, capped)
organizational_breadth   0.15    dimensions touched (÷6, capped)
temporal_persistence     0.20    distinct observation months (÷4, capped)
```

Contradiction penalty: HIGH 0.20, MEDIUM 0.10, LOW 0.04 per finding, capped at 0.90.

---

## 4. Lifecycle state machine

```
DISCOVERED → EVIDENCE_CAPTURED → IMPACT_ANALYZED → CORRELATED
  → PATTERN_CANDIDATE → PATTERN_CONFIRMED → VALIDATION_REQUIRED
  → VALIDATED → OPERATIONALIZABLE
```

Any state may transition to `REJECTED`. `VALIDATED` and `REJECTED` are terminal
for the purposes of this platform. Every transition is validated at runtime;
an illegal jump raises `LifecycleError` rather than being silently corrected.

Two gates are non-negotiable:

1. **`PATTERN_CONFIRMED` requires a named human.** No automatic promotion.
2. **`VALIDATED` is refused while any HIGH-severity contradiction is unresolved.**

---

## 5. Pattern thresholds

A pattern is emitted only when **both** hold:

- ≥ 2 independent signals carry the theme
- ≥ 2 distinct source names back those signals

Three articles from one blog is repetition, not corroboration. This is the
single most important rule in the platform and it is covered by a dedicated
regression test.

Every emitted pattern carries an explanation block answering the Part-4
questions: why detected, which signals, which evidence, how strong, which
dimensions, what contradictions, what open questions. A pattern that cannot
explain itself is not emitted.

---

## 6. Output contract

Schema `fsi.intelligence.v1`:

```
FutureSignal
├── identity            pattern_id · name · theme · lifecycle_state · generated_at
├── evidence            [ id · title · source · source_type · status · weight · url ]
├── organizational_impact
│                       affected_dimensions · per_signal impact profiles
├── relationships       [ source · target · relation · strength · explanation ]
├── pattern_candidates  signal_ids · why_detected · open_questions
├── confidence          value · band · factors · method
├── trajectory          value · detail (time series and reasoning)
├── provenance          produced_by · owner · human_reviewer · audit_trail
├── contradictions      [ type · severity · detail ]
└── downstream_consumers
```

Downstream consumers: `organizational-futures`, `capability-validation`,
`knowledge-operationalization`.

---

## 7. Governance and evidence requirements

- Every stored object carries deterministic id, timestamps and provenance.
- Every write is appended to `audit_log` with actor and action.
- Re-running the intelligence cycle is idempotent — same inputs, same scores.
  Covered by test.
- AI-assisted output never becomes stored truth without passing through a
  deterministic engine and a human gate. Classification, scoring and
  contradiction detection are all deterministic code, not model calls, so
  results are reproducible and arguable.

---

## 8. Known limitations (state these openly; do not let them be discovered)

1. **Keyword classification is shallow.** It misses paraphrase. Semantic
   clustering is the intended upgrade path, with the deterministic classifier
   retained as the stored value and the model output kept as a suggestion.
2. **Scoring weights are asserted, not learned.** They are a starting position
   for the team to argue with, which is why the breakdown is always exposed.
3. **Relationship detection is lexical.** Token and taxonomy overlap only; it
   will miss two signals describing the same thing in different vocabulary.
4. **No authentication.** The service assumes it sits behind the Antares
   platform boundary. Do not expose it directly.
5. **SQLite is a development choice.** The `Repository` interface is narrow
   specifically so it can be replaced with the mandated storage engine.
