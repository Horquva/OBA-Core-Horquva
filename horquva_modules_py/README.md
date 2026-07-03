# Horquva — OBA Constitutional Modules

**Prediction & Learning Layer — Engineer: Tahir**

Python implementation of 10 constitutional modules from the Horquva Organizational Brain Analysis (OBA) architecture. These modules cover dependency prediction, pattern detection, organizational identity, culture, maturity, behavior, benchmarking, learning, and digital twin simulation.

---

## 📦 Installation / Setup

No external dependencies required — pure Python 3 standard library only.

```
horquva_modules_py/
├── __init__.py
├── m32_dependency_impact_intelligence.py
├── m33_dependency_evolution_intelligence.py
├── m37_pattern_intelligence.py
├── m41_organizational_dna.py
├── m42_culture_intelligence.py
├── m43_organizational_maturity_intelligence.py
├── m44_organizational_behavior_intelligence.py
├── m45_benchmark_intelligence.py
├── m47_continuous_learning_intelligence.py
└── m49_digital_twin_intelligence.py
```

To use the package, place the `horquva_modules_py` folder anywhere, then **run Python from its parent directory**:

```bash
cd path/to/parent-folder
python3 -c "import horquva_modules_py; print('OK')"
```

Import individual modules like this:

```python
from horquva_modules_py import M32, M33, M37, M41, M42, M43, M44, M45, M47, M49
```

---

## 🧩 Module Index

| Module | Name | Question It Answers |
|---|---|---|
| [M32](#m32--dependency-impact-intelligence) | Dependency Impact Intelligence | If this dependency fails, what breaks? |
| [M33](#m33--dependency-evolution-intelligence) | Dependency Evolution Intelligence | How are dependencies changing over time? |
| [M37](#m37--pattern-intelligence) | Pattern Intelligence | What recurring organizational patterns exist? |
| [M41](#m41--organizational-dna) | Organizational DNA | What fundamentally defines this organization? |
| [M42](#m42--culture-intelligence) | Culture Intelligence | What organizational culture exists? |
| [M43](#m43--organizational-maturity-intelligence) | Organizational Maturity Intelligence | How mature is the organization? |
| [M44](#m44--organizational-behavior-intelligence) | Organizational Behavior Intelligence | How does the organization actually behave? |
| [M45](#m45--benchmark-intelligence) | Benchmark Intelligence | How does the organization compare to others? |
| [M47](#m47--continuous-learning-intelligence) | Continuous Learning Intelligence | How can the Organizational Brain improve itself? |
| [M49](#m49--digital-twin-intelligence) | Digital Twin Intelligence | What is the org's current and simulated state? |

---

## M32 — Dependency Impact Intelligence

Predicts cascading impact if a system/person/process fails.

**Functions:**
- `simulate_failure(nodes, failed_node_id)` → simulates a cascading failure and ranks impacted nodes by severity.
- `rank_single_points_of_failure(nodes)` → ranks all nodes by how dangerous their failure would be.

**Example:**
```python
from horquva_modules_py import M32

nodes = [
    {"id": "db", "name": "Primary DB", "type": "system", "dependsOn": [], "criticality": 1.0},
    {"id": "api", "name": "Core API", "type": "system", "dependsOn": ["db"], "criticality": 0.9},
]
print(M32.simulate_failure(nodes, "db"))
```

---

## M33 — Dependency Evolution Intelligence

Tracks how dependency relationships change across historical snapshots.

**Functions:**
- `diff_snapshots(prev, next_)` → compares two snapshots, returns added/removed dependencies and nodes.
- `track_evolution(snapshots_oldest_first)` → runs diffs across a full history, returns volatility trend.

**Example:**
```python
from horquva_modules_py import M33

snapshots = [
    {"timestamp": "2026-01-01", "nodes": [{"id": "api", "dependsOn": ["db"]}]},
    {"timestamp": "2026-02-01", "nodes": [{"id": "api", "dependsOn": ["db", "cache"]}]},
]
print(M33.track_evolution(snapshots))
```

---

## M37 — Pattern Intelligence

Detects recurring behaviors and statistical anomalies from event data.

**Functions:**
- `detect_recurring_patterns(events, min_occurrences=3)` → groups events by (type, actor), reports frequency & regularity.
- `detect_anomalies(events, window_days=7, z_threshold=2.0)` → flags time windows with abnormal event spikes/drops.

**Example:**
```python
from horquva_modules_py import M37

events = [
    {"id": "1", "type": "missed_deadline", "actor": "team_a", "timestamp": "2026-01-01"},
    {"id": "2", "type": "missed_deadline", "actor": "team_a", "timestamp": "2026-01-15"},
]
print(M37.detect_recurring_patterns(events, min_occurrences=2))
```

---

## M41 — Organizational DNA

Models the organization's stable identity traits across 6 dimensions: decision-making, risk appetite, hierarchy, pace, formality, collaboration style.

**Functions:**
- `build_dna_profile(signals, core_min_observations=5)` → builds a DNA profile from historical signal observations.
- `compare_dna_profiles(previous_profile, current_profile)` → detects identity drift between two profiles.

**Example:**
```python
from horquva_modules_py import M41

signals = [{"dimension": "pace", "value": 0.7, "observedAt": "2026-01-01"}] * 6
print(M41.build_dna_profile(signals))
```

---

## M42 — Culture Intelligence

Measures collaboration, communication, innovation, trust, and psychological safety from survey data.

**Functions:**
- `score_culture(responses)` → averages scores across all responses.
- `score_culture_by_team(responses)` → breaks scores down per team.
- `track_culture_trend(responses_oldest_first)` → tracks culture score evolution over time.

**Example:**
```python
from horquva_modules_py import M42

responses = [{"team": "eng", "submittedAt": "2026-01-01", "collaboration": 4,
              "communication": 4, "innovation": 5, "trust": 4, "psychologicalSafety": 4}]
print(M42.score_culture(responses))
```

---

## M43 — Organizational Maturity Intelligence

Assesses maturity across 5 pillars: governance, operations, technology, knowledge, leadership. Uses a 5-level maturity model (Initial → Optimizing).

**Functions:**
- `assess_maturity(pillar_scores)` → scores each pillar (1-5), computes overall level, flags weakest pillars with recommendations.
- `track_maturity_trend(assessments_oldest_first)` → tracks maturity trajectory across multiple assessments.

**Example:**
```python
from horquva_modules_py import M43

result = M43.assess_maturity({"governance": 3, "operations": 4, "technology": 2, "knowledge": 3, "leadership": 4})
print(result)
```

---

## M44 — Organizational Behavior Intelligence

Analyzes actual behavior vs. documented process, and profiles behavioral archetypes per actor.

**Functions:**
- `compute_process_gap(records)` → measures how often reality deviates from documented process.
- `profile_actor_behavior(records)` → classifies each actor as escalator / delegator / rule-follower / process-bypasser.

**Example:**
```python
from horquva_modules_py import M44

records = [{"actor": "alice", "action": "approved", "documentedProcess": "budget_approval",
            "followedProcess": True, "timestamp": "2026-01-01"}]
print(M44.profile_actor_behavior(records))
```

---

## M45 — Benchmark Intelligence

Compares organizational metrics against industry benchmarks (median, P25, P75).

**Functions:**
- `compare_to_industry(metrics)` → compares each metric, estimates percentile, flags outperforming/underperforming.
- `track_benchmark_trend(previous_metrics, current_metrics)` → tracks whether the org is closing or widening the gap with industry over time.

**Example:**
```python
from horquva_modules_py import M45

metrics = [{"metric": "turnover_rate", "orgValue": 0.12, "industryMedian": 0.15,
            "industryP25": 0.10, "industryP75": 0.20, "direction": "lower_is_better"}]
print(M45.compare_to_industry(metrics))
```

---

## M47 — Continuous Learning Intelligence

Validates prediction accuracy and feeds corroborated lessons back into the Organizational Brain.

**Functions:**
- `evaluate_prediction_accuracy(outcomes)` → measures accuracy per module, assigns trust level.
- `validate_lessons(candidate_lessons, confidence_threshold=0.6)` → validates lessons using confidence + cross-source corroboration.
- `generate_feedback_packet(validated_lessons, accuracy_report)` → produces a feedback packet for upstream modules.

**Example:**
```python
from horquva_modules_py import M47

outcomes = [{"moduleId": "M11", "predictionId": "p1", "predictedValue": 0.8,
             "actualValue": 0.75, "resolvedAt": "2026-02-01"}]
print(M47.evaluate_prediction_accuracy(outcomes))
```

---

## M49 — Digital Twin Intelligence

Assembles a synchronized digital twin snapshot from other modules' outputs (structure, culture, maturity, DNA), computes a health index, and runs what-if scenario simulations.

**Functions:**
- `build_twin_snapshot(structure, culture, maturity, dna)` → assembles a synchronized snapshot with a computed `healthIndex`.
- `check_synchronization(twin_snapshot, live_source_summary, max_staleness_minutes=60)` → verifies the twin is not stale/out of sync.
- `simulate_scenario(twin_snapshot, scenario_adjustments)` → projects health index under a hypothetical change.

**Example:**
```python
from horquva_modules_py import M49

structure = {"nodes": [{"id": "db"}, {"id": "api"}, {"id": "web"}]}
culture = {"overallScore": 4.2}
maturity = {"overallScore": 3.2}
dna = {"coreIdentity": [{"dimension": "pace", "score": 0.72}]}

twin = M49.build_twin_snapshot(structure, culture, maturity, dna)
print(twin)
# healthIndex = average of (culture/5, maturity/5) = 0.74

scenario = M49.simulate_scenario(twin, {"label": "maturity_drop", "maturityDelta": -1})
print(scenario)
```

---

## 🔗 How the Modules Connect

```
Reality → Memory → Prediction (M32, M33) → Pattern Detection (M37)
        → Organizational Science (M41, M42, M43, M44, M45)
        → Learning (M47)
        → Digital Twin (M49)
        → Future Intelligence
```

`M49` (Digital Twin) is the integration point — it consumes outputs from `M41` (DNA), `M42` (Culture), and `M43` (Maturity) to build a single synchronized organizational snapshot.

---

##  Verified Working

All 10 modules have been tested and confirmed working via `demo.py`:

```bash
cd horquva_modules_py
python3 demo.py
```

Expected final line: `All modules ran successfully.`

---

## Notes for Further Development

- These modules currently use **heuristic / statistical logic** on top of clean, structured sample data. To connect to real organizational data, wire each module's input functions to your actual data sources (HR systems, dependency graphs, survey tools, incident logs, etc.).
- No external packages required — safe to drop into any Python 3.7+ environment.
- Each module is independent and can be tested/used in isolation.

---

