"""
Quick smoke-test / demo for all 10 modules using sample data.
Run: python3 demo.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from horquva_modules_py import m32_dependency_impact_intelligence as M32
from horquva_modules_py import m33_dependency_evolution_intelligence as M33
from horquva_modules_py import m37_pattern_intelligence as M37
from horquva_modules_py import m41_organizational_dna as M41
from horquva_modules_py import m42_culture_intelligence as M42
from horquva_modules_py import m43_organizational_maturity_intelligence as M43
from horquva_modules_py import m44_organizational_behavior_intelligence as M44
from horquva_modules_py import m45_benchmark_intelligence as M45
from horquva_modules_py import m47_continuous_learning_intelligence as M47
from horquva_modules_py import m49_digital_twin_intelligence as M49


def line(title):
    print(f"\n=== {title} ===")


# --- M32 ---
line("M32 Dependency Impact Intelligence")
nodes = [
    {"id": "db", "name": "Primary DB", "type": "system", "dependsOn": [], "criticality": 1.0},
    {"id": "api", "name": "Core API", "type": "system", "dependsOn": ["db"], "criticality": 0.9},
    {"id": "web", "name": "Web App", "type": "system", "dependsOn": ["api"], "criticality": 0.7},
    {"id": "mobile", "name": "Mobile App", "type": "system", "dependsOn": ["api"], "criticality": 0.6},
]
print(M32.simulate_failure(nodes, "db"))

# --- M33 ---
line("M33 Dependency Evolution Intelligence")
snapshots = [
    {"timestamp": "2026-01-01", "nodes": [{"id": "api", "dependsOn": ["db"]}]},
    {"timestamp": "2026-02-01", "nodes": [{"id": "api", "dependsOn": ["db", "cache"]}]},
]
print(M33.track_evolution(snapshots))

# --- M37 ---
line("M37 Pattern Intelligence")
events = [
    {"id": "1", "type": "missed_deadline", "actor": "team_a", "timestamp": "2026-01-01"},
    {"id": "2", "type": "missed_deadline", "actor": "team_a", "timestamp": "2026-01-15"},
    {"id": "3", "type": "missed_deadline", "actor": "team_a", "timestamp": "2026-02-01"},
]
print(M37.detect_recurring_patterns(events))

# --- M41 ---
line("M41 Organizational DNA")
signals = [{"dimension": "pace", "value": 0.7 + i * 0.01, "observedAt": f"2026-0{i+1}-01"} for i in range(6)]
dna = M41.build_dna_profile(signals)
print(dna)

# --- M42 ---
line("M42 Culture Intelligence")
responses = [
    {"team": "eng", "submittedAt": "2026-01-01", "collaboration": 4, "communication": 4, "innovation": 5, "trust": 4, "psychologicalSafety": 4},
]
culture = M42.score_culture(responses)
print(culture)

# --- M43 ---
line("M43 Organizational Maturity Intelligence")
maturity = M43.assess_maturity({"governance": 3, "operations": 4, "technology": 2, "knowledge": 3, "leadership": 4})
print(maturity)

# --- M44 ---
line("M44 Organizational Behavior Intelligence")
records = [
    {"actor": "alice", "action": "approved", "documentedProcess": "budget_approval", "followedProcess": True, "timestamp": "2026-01-01"},
]
print(M44.profile_actor_behavior(records))

# --- M45 ---
line("M45 Benchmark Intelligence")
metrics = [{"metric": "turnover_rate", "orgValue": 0.12, "industryMedian": 0.15, "industryP25": 0.10, "industryP75": 0.20, "direction": "lower_is_better"}]
print(M45.compare_to_industry(metrics))

# --- M47 ---
line("M47 Continuous Learning Intelligence")
outcomes = [{"moduleId": "M11", "predictionId": "p1", "predictedValue": 0.8, "actualValue": 0.75, "resolvedAt": "2026-02-01"}]
print(M47.evaluate_prediction_accuracy(outcomes))

# --- M49 ---
line("M49 Digital Twin Intelligence")
twin = M49.build_twin_snapshot(structure={"nodes": nodes}, culture=culture, maturity=maturity, dna=dna)
print(twin)
print(M49.simulate_scenario(twin, {"label": "maturity_drop", "maturityDelta": -1}))

print("\nAll modules ran successfully.")
