"""
Horquva — OBA Constitutional Architecture
Prediction & Learning Layer — Remaining Modules (Tahir)

Exposes:
    M32 — Dependency Impact Intelligence
    M33 — Dependency Evolution Intelligence
    M37 — Pattern Intelligence
    M41 — Organizational DNA
    M42 — Culture Intelligence
    M43 — Organizational Maturity Intelligence
    M44 — Organizational Behavior Intelligence
    M45 — Benchmark Intelligence
    M47 — Continuous Learning Intelligence
    M49 — Digital Twin Intelligence
"""

from . import m32_dependency_impact_intelligence as M32
from . import m33_dependency_evolution_intelligence as M33
from . import m37_pattern_intelligence as M37
from . import m41_organizational_dna as M41
from . import m42_culture_intelligence as M42
from . import m43_organizational_maturity_intelligence as M43
from . import m44_organizational_behavior_intelligence as M44
from . import m45_benchmark_intelligence as M45
from . import m47_continuous_learning_intelligence as M47
from . import m49_digital_twin_intelligence as M49

__all__ = ["M32", "M33", "M37", "M41", "M42", "M43", "M44", "M45", "M47", "M49"]
